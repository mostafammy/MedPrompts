import type { Database } from '../db/client';
import type { SubjectId } from '../types/branded';
import type { PromptTemplate, TemplateVersion } from '../db/schema';
import { promptTemplates, templateVersions } from '../db/schema';
import { and, eq, desc } from 'drizzle-orm';

export interface VersionReader {
  getActive(db: Database, subjectId: SubjectId): Promise<PromptTemplate | null>;
  getHistory(db: Database, subjectId: SubjectId): Promise<TemplateVersion[]>;
}

export class DatabaseVersionReader implements VersionReader {
  constructor(private readonly db: Database) {}

  async getActive(_db: Database, subjectId: SubjectId): Promise<PromptTemplate | null> {
    const result = await this.db.query.promptTemplates.findFirst({
      where: and(eq(promptTemplates.subjectId, subjectId), eq(promptTemplates.isActive, true)),
    });
    return result ?? null;
  }

  async getHistory(_db: Database, subjectId: SubjectId): Promise<TemplateVersion[]> {
    const rows = await this.db.select()
      .from(templateVersions)
      .innerJoin(promptTemplates, eq(templateVersions.templateId, promptTemplates.id))
      .where(eq(promptTemplates.subjectId, subjectId))
      .orderBy(desc(templateVersions.activatedAt));

    return rows.map(r => r.template_versions);
  }
}

export class StubVersionReader implements VersionReader {
  private templates: Map<string, PromptTemplate> = new Map();
  private histories: Map<string, TemplateVersion[]> = new Map();

  withActive(subjectId: string, template: PromptTemplate): this {
    this.templates.set(subjectId, template);
    return this;
  }

  withHistory(subjectId: string, versions: TemplateVersion[]): this {
    this.histories.set(subjectId, versions);
    return this;
  }

  async getActive(_db: Database, subjectId: SubjectId): Promise<PromptTemplate | null> {
    return this.templates.get(subjectId) ?? null;
  }

  async getHistory(_db: Database, subjectId: SubjectId): Promise<TemplateVersion[]> {
    return this.histories.get(subjectId) ?? [];
  }
}
