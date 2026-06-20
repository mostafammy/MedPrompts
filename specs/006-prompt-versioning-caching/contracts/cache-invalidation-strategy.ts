// Interface: CacheInvalidationStrategy
// File: src/lib/prompts/cache-invalidation-strategy.ts (to be created)
//
// Pluggable strategy that determines cache invalidation scope from a version bump.
// New strategies can be added without modifying activation logic (OCP).

import type { SemVer } from './semver';

export enum InvalidationScope {
  /** No invalidation — let TTL expire old entries naturally */
  NONE = 'NONE',

  /** Delete only cache keys matching the old minor version prefix (e.g., -v1.0.*) */
  VERSION = 'VERSION',

  /** Delete all cache keys for the subject regardless of version */
  SUBJECT = 'SUBJECT',
}

export interface CacheInvalidationStrategy {
  /** Determine invalidation scope from the version transition */
  scope(current: SemVer, next: SemVer): InvalidationScope;

  /** Human-readable name for logging and dashboard */
  readonly name: string;
}

// Production implementation
export class SemanticInvalidationStrategy implements CacheInvalidationStrategy {
  readonly name = 'semantic-scoping';

  scope(current: SemVer, next: SemVer): InvalidationScope {
    switch (current.bumpType(next)) {
      case 'patch':
        return InvalidationScope.NONE;
      case 'minor':
        return InvalidationScope.VERSION;
      case 'major':
        return InvalidationScope.SUBJECT;
      case 'none':
        return InvalidationScope.NONE;
    }
  }
}

// Test double — no-op strategy for unit tests
export class NoOpInvalidationStrategy implements CacheInvalidationStrategy {
  readonly name = 'no-op';
  scope(_current: SemVer, _next: SemVer): InvalidationScope {
    return InvalidationScope.NONE;
  }
}
