// Interface: SemVer Value Object
// File: src/lib/prompts/semver.ts (to be created)
//
// Immutable value object representing a semantic version.
// Follows the existing Branded<T> pattern with parse/unsafeParse.

import type { Result } from '../types/result';
import type { ValidationError } from '../types/branded';

export class SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;

  private constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  /** Parse a "MAJOR.MINOR.PATCH" string into a SemVer */
  static parse(s: string): Result<SemVer, ValidationError>;

  /** Create a SemVer bypassing validation (for tests and trusted contexts) */
  static unsafeParse(major: number, minor: number, patch: number): SemVer;

  /** "1.0.0" */
  toString(): string;

  /** Create a new SemVer with the specified bump type */
  bump(type: 'major' | 'minor' | 'patch'): SemVer;

  /** Classify the difference between this and another SemVer */
  bumpType(other: SemVer): 'major' | 'minor' | 'patch' | 'none';

  /** Compare two SemVers (-1, 0, 1) */
  compare(other: SemVer): -1 | 0 | 1;

  /** Check equality */
  equals(other: SemVer): boolean;
}
