import { SemVer } from './semver';

export enum InvalidationScope {
  NONE = 'NONE',
  VERSION = 'VERSION',
  SUBJECT = 'SUBJECT',
}

export interface CacheInvalidationStrategy {
  scope(current: SemVer, next: SemVer): InvalidationScope;
  readonly name: string;
}

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

export class NoOpInvalidationStrategy implements CacheInvalidationStrategy {
  readonly name = 'no-op';

  scope(_current: SemVer, _next: SemVer): InvalidationScope {
    return InvalidationScope.NONE;
  }
}
