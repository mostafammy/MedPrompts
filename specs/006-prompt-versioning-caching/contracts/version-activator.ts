// Interface: VersionActivator
// File: src/lib/prompts/version-activator.ts (to be created)
//
// Activation and rollback — the highest-risk operations. Constructed once with
// PromptCache and CacheInvalidationStrategy baked in via constructor injection (DIP),
// matching the existing PromptEngineDeps pattern. Consumers never construct or pass
// infrastructure dependencies.

import type { SemVer } from './semver';
import type { SubjectId } from '../types/branded';
import type { Result } from '../types/result';

export type ActivationResult = Result<void, ActivationError>;
export type ActivationError =
  | { code: 'NOT_FOUND'; templateId: string }
  | { code: 'IDENTITY_DETECTED'; message: string }
  | { code: 'INVALID_SEMVER'; message: string }
  | { code: 'CONCURRENT_ACTIVATION'; message: string }
  | { code: 'CACHE_INVALIDATION_FAILED'; message: string; retryable: boolean };

export interface VersionActivator {
  /**
   * Activate a template version:
   *   1. Atomic DB transaction (deactivate old, activate new, insert history)
   *   2. Cache invalidation via injected strategy (sync retry ×3, then async enqueue or log)
   *   3. Telemetry with activatedBy
   * 
   * @param templateId — the template to activate
   * @param activatedBy — operator identifier from authenticated session (NFR-009)
   */
  activate(templateId: string, activatedBy: string): Promise<ActivationResult>;

  /**
   * Roll back to a previously activated version:
   *   1. Find target in template_versions history
   *   2. Restore template content, variables, interactive flag
   *   3. Cache invalidation proportionate to rollback scope
   * 
   * @param subjectId — the subject to roll back
   * @param targetSemver — the version to restore
   * @param activatedBy — operator identifier from authenticated session (NFR-009)
   */
  rollback(
    subjectId: SubjectId,
    targetSemver: SemVer,
    activatedBy: string
  ): Promise<ActivationResult>;
}

// Test double — lightweight stub that records calls for assertion
export class StubVersionActivator implements VersionActivator {
  public lastCall: { templateId?: string; subjectId?: SubjectId; targetSemver?: SemVer; activatedBy?: string } = {};
  public result: ActivationResult;

  constructor(result: ActivationResult = { ok: true, value: undefined } as unknown as ActivationResult) {
    this.result = result;
  }

  async activate(templateId: string, activatedBy: string): Promise<ActivationResult> {
    this.lastCall = { templateId, activatedBy };
    return this.result;
  }

  async rollback(subjectId: SubjectId, targetSemver: SemVer, activatedBy: string): Promise<ActivationResult> {
    this.lastCall = { subjectId, targetSemver, activatedBy };
    return this.result;
  }
}
