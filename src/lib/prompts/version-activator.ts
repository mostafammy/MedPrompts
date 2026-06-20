import { SemVer } from './semver';
import type { SubjectId } from '../types/branded';
import type { Result } from '../types/result';
import type { Database } from '../db/client';
import type { PromptCache } from './cache';
import type { CacheInvalidationStrategy, InvalidationScope } from './cache-invalidation-strategy';
import type { Analytics } from '../analytics';
import { promptTemplates, templateVersions } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { ok, err } from '../types/result';
import { createHash, randomUUID } from 'node:crypto';

export type ActivationResult = Result<void, ActivationError>;
export type ActivationError =
  | { code: 'NOT_FOUND'; templateId: string }
  | { code: 'IDENTITY_DETECTED'; message: string }
  | { code: 'INVALID_SEMVER'; message: string }
  | { code: 'CONCURRENT_ACTIVATION'; message: string }
  | { code: 'CACHE_INVALIDATION_FAILED'; message: string; retryable: boolean };

export class ConcurrentActivationError extends Error {
  constructor(public readonly subjectId: string) {
    super(`Concurrent activation detected for subject ${subjectId}`);
    this.name = 'ConcurrentActivationError';
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export interface VersionActivator {
  activate(templateId: string, activatedBy: string): Promise<ActivationResult>;
  rollback(
    subjectId: SubjectId,
    targetSemver: SemVer,
    activatedBy: string
  ): Promise<ActivationResult>;
}

export class DatabaseVersionActivator implements VersionActivator {
  constructor(
    private readonly db: Database,
    private readonly cache: PromptCache,
    private readonly strategy: CacheInvalidationStrategy,
    private readonly analytics: Analytics
  ) {}

  async activate(templateId: string, activatedBy: string): Promise<ActivationResult> {
    const startTime = Date.now();
    let activationScope: InvalidationScope | null = null;
    let oldSemverStr = '';
    let newSemverStr = '';
    let subjectIdResult = '';
    let bumpType: 'major' | 'minor' | 'patch' | 'none' = 'none';

    const txnResult = await this.db.transaction(async (tx) => {
      const target = await tx.select().from(promptTemplates).where(eq(promptTemplates.id, templateId)).limit(1);
      if (target.length === 0) {
        return err({ code: 'NOT_FOUND' as const, templateId });
      }

      const template = target[0]!;
      subjectIdResult = template.subjectId;
      newSemverStr = template.semver;

      const currentActive = await tx.select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.subjectId, template.subjectId),
            eq(promptTemplates.isActive, true)
          )
        )
        .limit(1);

      if (currentActive.length > 0) {
        const active = currentActive[0]!;
        oldSemverStr = active.semver;

        const currentSvResult = SemVer.parse(active.semver);
        const nextSvResult = SemVer.parse(template.semver);

        if (!currentSvResult.ok || !nextSvResult.ok) {
          return err({ code: 'INVALID_SEMVER' as const, message: 'Corrupted semver in database' });
        }

        const currentSv = currentSvResult.value;
        const nextSv = nextSvResult.value;

        if (currentSv.equals(nextSv) && active.checksum === template.checksum) {
          return err({
            code: 'IDENTITY_DETECTED' as const,
            message: `Version ${template.semver} is already active with identical content`,
          });
        }

        bumpType = currentSv.bumpType(nextSv);
        activationScope = this.strategy.scope(currentSv, nextSv);
      } else {
        bumpType = 'none';
        activationScope = null;
      }

      await tx.update(promptTemplates)
        .set({ isActive: false })
        .where(eq(promptTemplates.subjectId, template.subjectId));

      await tx.update(promptTemplates)
        .set({ isActive: true })
        .where(eq(promptTemplates.id, templateId));

      await tx.update(templateVersions)
        .set({ deactivatedAt: new Date() })
        .where(
          and(
            eq(templateVersions.templateId, template.id),
            isNull(templateVersions.deactivatedAt)
          )
        );

      await tx.insert(templateVersions).values({
        id: crypto.randomUUID(),
        templateId: template.id,
        semver: template.semver,
        template: template.template,
        checksum: template.checksum,
        changelog: template.changelog,
        parentSemver: oldSemverStr || null,
        activatedBy,
        activatedAt: new Date(),
        deactivatedAt: null,
      });

      return ok(undefined);
    });

    if (!txnResult.ok) {
      const duration = Date.now() - startTime;
      this.trackEvent({
        subjectId: subjectIdResult,
        oldSemver: oldSemverStr,
        newSemver: newSemverStr,
        bumpType,
        invalidationScope: activationScope ?? 'NONE',
        durationMs: duration,
        success: false,
        activatedBy,
      });
      return txnResult;
    }

    const subjectId = subjectIdResult as SubjectId;
    let cacheSuccess = true;
    let deletedCount = 0;
    let totalCount = 0;

    if (activationScope) {
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          if (activationScope === 'VERSION') {
            const semverParsed = SemVer.parse(newSemverStr);
            if (semverParsed.ok) {
              const result = await this.cache.deleteVersion(subjectId, semverParsed.value);
              deletedCount = result.deleted;
              totalCount = result.total;
            }
          } else if (activationScope === 'SUBJECT') {
            const result = await this.cache.deleteSubject(subjectId);
            deletedCount = result.deleted;
            totalCount = result.total;
          }
          break;
        } catch (e) {
          retries++;
          if (retries > maxRetries) {
            cacheSuccess = false;
            this.enqueueOrLog(activationScope, subjectId, deletedCount, totalCount, e);
          } else {
            await sleep(1000 * Math.pow(2, retries - 1));
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    this.trackEvent({
      subjectId: subjectIdResult,
      oldSemver: oldSemverStr,
      newSemver: newSemverStr,
      bumpType,
      invalidationScope: activationScope ?? 'NONE',
      durationMs: duration,
      success: true,
      activatedBy,
    });

    return ok(undefined);
  }

  async rollback(
    subjectId: SubjectId,
    targetSemver: SemVer,
    activatedBy: string
  ): Promise<ActivationResult> {
    const startTime = Date.now();

    const currentActive = await this.db.query.promptTemplates.findFirst({
      where: and(
        eq(promptTemplates.subjectId, subjectId),
        eq(promptTemplates.isActive, true)
      ),
    });

    const oldSemverStr = currentActive?.semver ?? '';
    const oldSemver = oldSemverStr ? SemVer.parse(oldSemverStr) : null;

    const historyRows = await this.db.select()
      .from(templateVersions)
      .innerJoin(promptTemplates, eq(templateVersions.templateId, promptTemplates.id))
      .where(
        and(
          eq(promptTemplates.subjectId, subjectId),
          eq(templateVersions.semver, targetSemver.toString())
        )
      )
      .limit(1);

    if (historyRows.length === 0) {
      const duration = Date.now() - startTime;
      this.trackEvent({
        subjectId: subjectId.toString(),
        oldSemver: oldSemverStr,
        newSemver: targetSemver.toString(),
        bumpType: 'major',
        invalidationScope: 'SUBJECT',
        durationMs: duration,
        success: false,
        activatedBy,
      });
      return err({ code: 'NOT_FOUND', templateId: targetSemver.toString() });
    }

    const historyRecord = historyRows[0]!.template_versions;
    const restoredChecksum = createHash('sha256').update(historyRecord.template).digest('hex');

    if (restoredChecksum !== historyRecord.checksum) {
      return err({
        code: 'IDENTITY_DETECTED',
        message: `Checksum mismatch for version ${targetSemver.toString()} — template content may be corrupted`,
      });
    }

    const semverParsed = SemVer.parse(historyRecord.semver);
    if (!semverParsed.ok) {
      return err({ code: 'INVALID_SEMVER', message: `Corrupted version in history: ${historyRecord.semver}` });
    }

    const { major, minor, patch } = semverParsed.value;

    await this.db.transaction(async (tx) => {
      await tx.update(promptTemplates)
        .set({ isActive: false })
        .where(eq(promptTemplates.subjectId, subjectId));

      await tx.update(templateVersions)
        .set({ deactivatedAt: new Date() })
        .where(
          and(
            eq(templateVersions.templateId, historyRecord.templateId),
            isNull(templateVersions.deactivatedAt)
          )
        );

      const restoredId = randomUUID();
      await tx.insert(promptTemplates).values({
        id: restoredId,
        subjectId,
        template: historyRecord.template,
        version: major,
        semver: historyRecord.semver,
        versionMajor: major,
        versionMinor: minor,
        versionPatch: patch,
        checksum: historyRecord.checksum ?? '',
        isActive: true,
        changelog: historyRecord.changelog,
        isInteractive: currentActive?.isInteractive ?? false,
        requiredVariables: (currentActive?.requiredVariables ?? []) as never[],
        createdAt: new Date(),
      });

      await tx.insert(templateVersions).values({
        id: randomUUID(),
        templateId: restoredId,
        semver: historyRecord.semver,
        template: historyRecord.template,
        checksum: historyRecord.checksum,
        changelog: historyRecord.changelog,
        parentSemver: oldSemverStr || null,
        activatedBy,
        activatedAt: new Date(),
        deactivatedAt: null,
      });
    });

    const rollbackScope = oldSemver?.ok
      ? this.strategy.scope(oldSemver.value, targetSemver)
      : 'SUBJECT' as InvalidationScope;

    if (rollbackScope !== 'NONE') {
      let retries = 0;
      const maxRetries = 3;
      let rbDeleted = 0;
      let rbTotal = 0;

      while (retries <= maxRetries) {
        try {
          if (rollbackScope === 'VERSION') {
            const result = await this.cache.deleteVersion(subjectId, targetSemver);
            rbDeleted = result.deleted;
            rbTotal = result.total;
          } else {
            const result = await this.cache.deleteSubject(subjectId);
            rbDeleted = result.deleted;
            rbTotal = result.total;
          }
          break;
        } catch (e) {
          retries++;
          if (retries > maxRetries) {
            this.enqueueOrLog(rollbackScope, subjectId, rbDeleted, rbTotal, e);
          } else {
            await sleep(1000 * Math.pow(2, retries - 1));
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    this.trackEvent({
      subjectId: subjectId.toString(),
      oldSemver: oldSemverStr,
      newSemver: targetSemver.toString(),
      bumpType: 'major',
      invalidationScope: rollbackScope,
      durationMs: duration,
      success: true,
      activatedBy,
    });

    return ok(undefined);
  }

  private enqueueOrLog(
    scope: InvalidationScope | string,
    subjectId: SubjectId,
    deletedCount: number,
    totalCount: number,
    error: unknown
  ): void {
    console.error(
      JSON.stringify({
        event: 'cache.invalidation_failed',
        scope,
        subjectId,
        deletedCount,
        totalCount,
        remainingKeys: totalCount - deletedCount,
        error: String(error),
      })
    );
  }

  private trackEvent(event: {
    subjectId: string;
    oldSemver: string;
    newSemver: string;
    bumpType: string;
    invalidationScope: string;
    durationMs: number;
    success: boolean;
    activatedBy: string;
  }): void {
    try {
      this.analytics.trackVersionActivation(event);
    } catch (analyticsError) {
      console.error('Analytics event failed:', analyticsError);
    }
  }
}

export class StubVersionActivator implements VersionActivator {
  public lastCall: {
    templateId?: string;
    subjectId?: SubjectId;
    targetSemver?: SemVer;
    activatedBy?: string;
  } = {};
  public result: ActivationResult;

  constructor(result?: ActivationResult) {
    this.result = result ?? { ok: true, value: undefined } as unknown as ActivationResult;
  }

  async activate(templateId: string, activatedBy: string): Promise<ActivationResult> {
    this.lastCall = { templateId, activatedBy };
    return this.result;
  }

  async rollback(
    subjectId: SubjectId,
    targetSemver: SemVer,
    activatedBy: string
  ): Promise<ActivationResult> {
    this.lastCall = { subjectId, targetSemver, activatedBy };
    return this.result;
  }
}
