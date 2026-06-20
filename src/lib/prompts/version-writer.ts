import type { Database } from '../db/client';
import type { SubjectId } from '../types/branded';
import type { PromptTemplate } from '../db/schema';
import type { Result } from '../types/result';
import { promptTemplates } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { ok, err } from '../types/result';
import { SemVer } from './semver';
import { createHash, randomUUID } from 'node:crypto';

export type CreateTemplateInput = {
  subjectId: SubjectId;
  template: string;
  semver: string;
  changelog?: string;
  isInteractive?: boolean;
  requiredVariables?: unknown[];
};

export type CreateTemplateError =
  | { code: 'INVALID_SEMVER'; message: string }
  | { code: 'CHECKSUM_IDENTITY'; message: string }
  | { code: 'DUPLICATE_VERSION'; message: string };

export interface VersionWriter {
  createVersion(
    db: Database,
    input: CreateTemplateInput
  ): Promise<Result<PromptTemplate, CreateTemplateError>>;
}

export class DatabaseVersionWriter implements VersionWriter {
  constructor(private readonly db: Database) {}

  async createVersion(
    _db: Database,
    input: CreateTemplateInput
  ): Promise<Result<PromptTemplate, CreateTemplateError>> {
    const semverResult = SemVer.parse(input.semver);
    if (!semverResult.ok) {
      return err({ code: 'INVALID_SEMVER', message: semverResult.error.message });
    }

    const sv = semverResult.value;
    const checksum = createHash('sha256').update(input.template).digest('hex');

    const currentActive = await this.db.query.promptTemplates.findFirst({
      where: and(
        eq(promptTemplates.subjectId, input.subjectId),
        eq(promptTemplates.isActive, true)
      ),
    });

    if (currentActive) {
      if (currentActive.semver === input.semver && currentActive.checksum === checksum) {
        return err({
          code: 'CHECKSUM_IDENTITY',
          message: `Version ${input.semver} is identical to the currently active version`,
        });
      }
    }

    const existingVersion = await this.db.query.promptTemplates.findFirst({
      where: and(
        eq(promptTemplates.subjectId, input.subjectId),
        eq(promptTemplates.semver, input.semver)
      ),
    });

    if (existingVersion) {
      return err({
        code: 'DUPLICATE_VERSION',
        message: `Version ${input.semver} already exists for this subject`,
      });
    }

    const now = new Date();
    const [created] = await this.db.insert(promptTemplates).values({
      id: randomUUID(),
      subjectId: input.subjectId,
      template: input.template,
      version: sv.major,
      semver: input.semver,
      versionMajor: sv.major,
      versionMinor: sv.minor,
      versionPatch: sv.patch,
      checksum,
      isActive: false,
      changelog: input.changelog,
      isInteractive: input.isInteractive ?? false,
      requiredVariables: (input.requiredVariables ?? []) as never[],
      createdAt: now,
    }).returning();

    return ok(created!);
  }
}

export class StubVersionWriter implements VersionWriter {
  private result: Result<PromptTemplate, CreateTemplateError>;

  constructor(result: Result<PromptTemplate, CreateTemplateError>) {
    this.result = result;
  }

  async createVersion(
    _db: Database,
    _input: CreateTemplateInput
  ): Promise<Result<PromptTemplate, CreateTemplateError>> {
    return this.result;
  }
}
