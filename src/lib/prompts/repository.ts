import { Database } from '../db/client';
import { promptTemplates, templateVersions, type PromptTemplate, type TemplateVersion } from '../db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Result, ok, err } from '../types/result';
import { PromptCache } from './cache';
import { CacheInvalidationStrategy, InvalidationScope } from './cache-invalidation-strategy';
import { SemVer } from './semver';
import { SubjectId } from '../types/branded';
import { createHash } from 'node:crypto';

export type ActivationError =
  | { code: 'NOT_FOUND'; templateId: string }
  | { code: 'IDENTITY_DETECTED'; message: string }
  | { code: 'CONCURRENT_ACTIVATION'; message: string };

export async function activateTemplate(
  db: Database,
  cache: PromptCache | null,
  strategy: CacheInvalidationStrategy,
  templateId: string,
  activatedBy: string
): Promise<Result<void, ActivationError>> {
  let activationScope: InvalidationScope = InvalidationScope.NONE;
  let oldSemver = '';
  let newSemver = '';
  let subjectIdResult = '';

  const txnResult = await db.transaction(async (tx) => {
    const target = await tx.select().from(promptTemplates).where(eq(promptTemplates.id, templateId)).limit(1);
    if (target.length === 0) {
      return err({ code: 'NOT_FOUND' as const, templateId });
    }
    const template = target[0]!;
    subjectIdResult = template.subjectId;
    newSemver = template.semver;

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
      oldSemver = active.semver;

      const currentSemverResult = SemVer.parse(active.semver);
      const nextSemverResult = SemVer.parse(template.semver);

      if (currentSemverResult.ok && nextSemverResult.ok) {
        const currentSv = currentSemverResult.value;
        const nextSv = nextSemverResult.value;

        if (currentSv.equals(nextSv) && active.checksum === template.checksum) {
          return err({ code: 'IDENTITY_DETECTED' as const, message: `Version ${template.semver} is already active with identical content` });
        }

        activationScope = strategy.scope(currentSv, nextSv);
      }
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
      parentSemver: oldSemver || null,
      activatedBy,
      activatedAt: new Date(),
      deactivatedAt: null,
    });

    return ok(undefined);
  });

  if (!txnResult.ok) {
    return txnResult;
  }

  if (cache && activationScope !== InvalidationScope.NONE) {
    const subjectId = subjectIdResult as SubjectId;
    let retries = 0;
    const maxRetries = 3;
    let delCount = 0;
    let totCount = 0;

    while (retries <= maxRetries) {
      try {
        if (activationScope === InvalidationScope.VERSION) {
          const semverParsed = SemVer.parse(newSemver);
          if (semverParsed.ok) {
            const result = await cache.deleteVersion(subjectId, semverParsed.value);
            delCount = result.deleted;
            totCount = result.total;
          }
        } else {
          const result = await cache.deleteSubject(subjectId);
          delCount = result.deleted;
          totCount = result.total;
        }
        break;
      } catch (e) {
        retries++;
        if (retries > maxRetries) {
          console.error(
            JSON.stringify({
              event: 'cache.invalidation_failed',
              scope: activationScope,
              subjectId,
              deletedCount: delCount,
              totalCount: totCount,
              remainingKeys: totCount - delCount,
              error: String(e),
            })
          );
        } else {
          await sleep(1000 * Math.pow(2, retries - 1));
        }
      }
    }
  }

  return ok(undefined);
}

export async function getActiveTemplateForSubject(
  db: Database,
  subjectId: SubjectId
): Promise<PromptTemplate | null> {
  const result = await db.select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.subjectId, subjectId),
        eq(promptTemplates.isActive, true)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getVersionHistory(
  db: Database,
  subjectId: SubjectId
): Promise<TemplateVersion[]> {
  const rows = await db.select()
    .from(templateVersions)
    .innerJoin(promptTemplates, eq(templateVersions.templateId, promptTemplates.id))
    .where(eq(promptTemplates.subjectId, subjectId))
    .orderBy(sql`${templateVersions.activatedAt} DESC`);

  return rows.map(r => r.template_versions);
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
