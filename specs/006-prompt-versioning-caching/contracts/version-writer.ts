// Interface: VersionWriter
// File: src/lib/prompts/version-writer.ts (to be created)
//
// Write-only interface for creating new template versions.
// Consumers: admin template editor UI.
// No read, activate, or cache surface — ISP-segregated from VersionReader/VersionActivator.

import type { Database } from '../db/client';
import type { SubjectId } from '../types/branded';
import type { Result } from '../types/result';

export type CreateTemplateInput = {
  subjectId: SubjectId;
  template: string;
  semver: string;
  changelog?: string;
  isInteractive?: boolean;
  requiredVariables?: TemplateVariableDefinition[];
};

export type CreateTemplateError =
  | { code: 'INVALID_SEMVER'; message: string }
  | { code: 'CHECKSUM_IDENTITY'; message: string }
  | { code: 'DUPLICATE_VERSION'; message: string };

export interface VersionWriter {
  /** Create a new template version without activating it. Returns the created template. */
  createVersion(
    db: Database,
    input: CreateTemplateInput
  ): Promise<Result<PromptTemplate, CreateTemplateError>>;
}

// Test double
export class StubVersionWriter implements VersionWriter {
  private result: Result<PromptTemplate, CreateTemplateError>;

  constructor(result: Result<PromptTemplate, CreateTemplateError>) {
    this.result = result;
  }

  async createVersion(_db: Database, _input: CreateTemplateInput): Promise<Result<PromptTemplate, CreateTemplateError>> {
    return this.result;
  }
}
