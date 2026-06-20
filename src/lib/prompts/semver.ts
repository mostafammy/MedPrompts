import { Result, ok, err } from '../types/result';
import { ValidationError } from '../types/branded';

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;
const MAX_COMPONENT = 99999;

export class SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;

  private constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  static parse(s: string): Result<SemVer, ValidationError> {
    const trimmed = s.trim();
    if (trimmed.length === 0) {
      return err({ code: 'EMPTY_SEMVER', message: 'Semver string must not be empty' });
    }
    if (trimmed.length > 20) {
      return err({ code: 'SEMVER_TOO_LONG', message: `Semver string too long (max 20 chars): ${trimmed}` });
    }

    const match = SEMVER_REGEX.exec(trimmed);
    if (!match) {
      return err({ code: 'INVALID_SEMVER_FORMAT', message: `Invalid semver format: "${trimmed}". Expected MAJOR.MINOR.PATCH` });
    }

    const major = parseInt(match[1]!, 10);
    const minor = parseInt(match[2]!, 10);
    const patch = parseInt(match[3]!, 10);

    if (match[1]!.startsWith('0') && match[1]!.length > 1) {
      return err({ code: 'LEADING_ZERO', message: `Major version has leading zero: "${trimmed}"` });
    }
    if (match[2]!.startsWith('0') && match[2]!.length > 1) {
      return err({ code: 'LEADING_ZERO', message: `Minor version has leading zero: "${trimmed}"` });
    }
    if (match[3]!.startsWith('0') && match[3]!.length > 1) {
      return err({ code: 'LEADING_ZERO', message: `Patch version has leading zero: "${trimmed}"` });
    }

    if (major >= MAX_COMPONENT || minor >= MAX_COMPONENT || patch >= MAX_COMPONENT) {
      return err({
        code: 'COMPONENT_TOO_LARGE',
        message: `Semver component exceeds max value ${MAX_COMPONENT - 1}: "${trimmed}"`,
      });
    }

    return ok(new SemVer(major, minor, patch));
  }

  static unsafeParse(major: number, minor: number, patch: number): SemVer {
    return new SemVer(major, minor, patch);
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  bump(type: 'major' | 'minor' | 'patch'): SemVer {
    switch (type) {
      case 'major':
        return new SemVer(this.major + 1, 0, 0);
      case 'minor':
        return new SemVer(this.major, this.minor + 1, 0);
      case 'patch':
        return new SemVer(this.major, this.minor, this.patch + 1);
    }
  }

  compare(other: SemVer): -1 | 0 | 1 {
    if (this.major !== other.major) return this.major > other.major ? 1 : -1;
    if (this.minor !== other.minor) return this.minor > other.minor ? 1 : -1;
    if (this.patch !== other.patch) return this.patch > other.patch ? 1 : -1;
    return 0;
  }

  bumpType(other: SemVer): 'major' | 'minor' | 'patch' | 'none' {
    if (this.equals(other)) return 'none';
    if (this.major !== other.major) return 'major';
    if (this.minor !== other.minor) return 'minor';
    return 'patch';
  }

  equals(other: SemVer): boolean {
    return this.major === other.major && this.minor === other.minor && this.patch === other.patch;
  }
}
