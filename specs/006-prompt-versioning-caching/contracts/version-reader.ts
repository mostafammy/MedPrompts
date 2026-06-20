// Interface: VersionReader
// File: src/lib/prompts/version-reader.ts (to be created)
//
// Read-only interface for querying template versions.
// Consumers: prompt-rendering page (getActive), audit dashboard (getHistory).
// These consumers never need write/activate dependencies — ISP-segregated from VersionWriter/VersionActivator.

import type { Database } from '../db/client';
import type { SubjectId } from '../types/branded';

export interface VersionReader {
  /** Get the currently active template for a subject (used by prompt generation) */
  getActive(db: Database, subjectId: SubjectId): Promise<PromptTemplate | null>;

  /** List full version history for a subject, newest first (used by audit dashboard) */
  getHistory(db: Database, subjectId: SubjectId): Promise<TemplateVersion[]>;
}

// Test double
export class StubVersionReader implements VersionReader {
  private templates: Map<string, PromptTemplate> = new Map();
  private histories: Map<string, TemplateVersion[]> = new Map();

  withActive(subjectId: SubjectId, template: PromptTemplate): this {
    this.templates.set(subjectId, template);
    return this;
  }

  withHistory(subjectId: SubjectId, versions: TemplateVersion[]): this {
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
