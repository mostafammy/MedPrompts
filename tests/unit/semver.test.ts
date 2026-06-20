import { describe, it, expect } from 'vitest';
import { SemVer } from '../../src/lib/prompts/semver';

describe('SemVer', () => {
  describe('parse', () => {
    it('parses valid semver strings', () => {
      const r1 = SemVer.parse('1.0.0');
      expect(r1.ok).toBe(true);
      if (r1.ok) {
        expect(r1.value.toString()).toBe('1.0.0');
        expect(r1.value.major).toBe(1);
        expect(r1.value.minor).toBe(0);
        expect(r1.value.patch).toBe(0);
      }

      const r2 = SemVer.parse('0.0.1');
      expect(r2.ok).toBe(true);

      const r3 = SemVer.parse('999.999.999');
      expect(r3.ok).toBe(true);

      const r4 = SemVer.parse(' 2.1.3 ');
      expect(r4.ok).toBe(true);
      if (r4.ok) expect(r4.value.toString()).toBe('2.1.3');
    });

    it('rejects invalid formats', () => {
      expect(SemVer.parse('').ok).toBe(false);
      expect(SemVer.parse('1.0').ok).toBe(false);
      expect(SemVer.parse('1.0.0.0').ok).toBe(false);
      expect(SemVer.parse('01.0.0').ok).toBe(false);
      expect(SemVer.parse('0.01.0').ok).toBe(false);
      expect(SemVer.parse('0.0.01').ok).toBe(false);
      expect(SemVer.parse('a.b.c').ok).toBe(false);
      expect(SemVer.parse('1.0.0-beta').ok).toBe(false);
      expect(SemVer.parse('v1.0.0').ok).toBe(false);
    });

    it('rejects oversized components', () => {
      expect(SemVer.parse('100000.0.0').ok).toBe(false);
      expect(SemVer.parse('0.100000.0').ok).toBe(false);
      expect(SemVer.parse('0.0.100000').ok).toBe(false);
    });

    it('rejects overly long semver strings', () => {
      expect(SemVer.parse('1234567.890123.456789').ok).toBe(false);
    });
  });

  describe('unsafeParse', () => {
    it('creates SemVer without validation', () => {
      const sv = SemVer.unsafeParse(2, 1, 3);
      expect(sv.major).toBe(2);
      expect(sv.minor).toBe(1);
      expect(sv.patch).toBe(3);
      expect(sv.toString()).toBe('2.1.3');
    });
  });

  describe('bump', () => {
    it('increments patch on patch bump', () => {
      const v = SemVer.unsafeParse(1, 0, 0);
      const bumped = v.bump('patch');
      expect(bumped.toString()).toBe('1.0.1');
    });

    it('increments minor and resets patch on minor bump', () => {
      const v = SemVer.unsafeParse(1, 0, 5);
      const bumped = v.bump('minor');
      expect(bumped.toString()).toBe('1.1.0');
    });

    it('increments major and resets minor/patch on major bump', () => {
      const v = SemVer.unsafeParse(1, 3, 2);
      const bumped = v.bump('major');
      expect(bumped.toString()).toBe('2.0.0');
    });

    it('is immutable - original unchanged', () => {
      const v = SemVer.unsafeParse(1, 0, 0);
      v.bump('major');
      expect(v.toString()).toBe('1.0.0');
    });
  });

  describe('compare', () => {
    it('returns -1 when this is older', () => {
      const older = SemVer.unsafeParse(1, 0, 0);
      const newer = SemVer.unsafeParse(2, 0, 0);
      expect(older.compare(newer)).toBe(-1);
    });

    it('returns 1 when this is newer', () => {
      const older = SemVer.unsafeParse(1, 0, 0);
      const newer = SemVer.unsafeParse(2, 0, 0);
      expect(newer.compare(older)).toBe(1);
    });

    it('returns 0 when equal', () => {
      const a = SemVer.unsafeParse(1, 2, 3);
      const b = SemVer.unsafeParse(1, 2, 3);
      expect(a.compare(b)).toBe(0);
    });

    it('compares minor before patch', () => {
      const a = SemVer.unsafeParse(1, 0, 9);
      const b = SemVer.unsafeParse(1, 1, 0);
      expect(a.compare(b)).toBe(-1);
    });
  });

  describe('bumpType', () => {
    const v = SemVer.unsafeParse(1, 0, 0);

    it('detects patch bump', () => {
      expect(v.bumpType(SemVer.unsafeParse(1, 0, 1))).toBe('patch');
    });

    it('detects minor bump', () => {
      expect(v.bumpType(SemVer.unsafeParse(1, 1, 0))).toBe('minor');
    });

    it('detects major bump', () => {
      expect(v.bumpType(SemVer.unsafeParse(2, 0, 0))).toBe('major');
    });

    it('detects no bump for identical versions', () => {
      expect(v.bumpType(SemVer.unsafeParse(1, 0, 0))).toBe('none');
    });
  });

  describe('equals', () => {
    it('returns true for same version', () => {
      expect(SemVer.unsafeParse(1, 2, 3).equals(SemVer.unsafeParse(1, 2, 3))).toBe(true);
    });

    it('returns false for different versions', () => {
      expect(SemVer.unsafeParse(1, 2, 3).equals(SemVer.unsafeParse(1, 2, 4))).toBe(false);
      expect(SemVer.unsafeParse(1, 2, 3).equals(SemVer.unsafeParse(1, 3, 3))).toBe(false);
      expect(SemVer.unsafeParse(1, 2, 3).equals(SemVer.unsafeParse(2, 2, 3))).toBe(false);
    });
  });

  describe('toString', () => {
    it('formats correctly', () => {
      expect(SemVer.unsafeParse(0, 0, 0).toString()).toBe('0.0.0');
      expect(SemVer.unsafeParse(10, 20, 30).toString()).toBe('10.20.30');
    });
  });
});
