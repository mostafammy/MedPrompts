import { describe, it, expect } from 'vitest';
import { SemVer } from '../../src/lib/prompts/semver';
import {
  SemanticInvalidationStrategy,
  InvalidationScope,
  NoOpInvalidationStrategy,
} from '../../src/lib/prompts/cache-invalidation-strategy';

describe('SemanticInvalidationStrategy', () => {
  const strategy = new SemanticInvalidationStrategy();

  it('returns NONE for patch bump (v1.0.0 → v1.0.1)', () => {
    const current = SemVer.unsafeParse(1, 0, 0);
    const next = SemVer.unsafeParse(1, 0, 1);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.NONE);
  });

  it('returns VERSION for minor bump (v1.0.0 → v1.1.0)', () => {
    const current = SemVer.unsafeParse(1, 0, 0);
    const next = SemVer.unsafeParse(1, 1, 0);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.VERSION);
  });

  it('returns SUBJECT for major bump (v1.0.0 → v2.0.0)', () => {
    const current = SemVer.unsafeParse(1, 0, 0);
    const next = SemVer.unsafeParse(2, 0, 0);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.SUBJECT);
  });

  it('returns NONE for identical versions (v1.0.0 → v1.0.0)', () => {
    const current = SemVer.unsafeParse(1, 0, 0);
    const next = SemVer.unsafeParse(1, 0, 0);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.NONE);
  });

  it('returns VERSION for rollback within same major (v2.1.0 → v2.0.0)', () => {
    const current = SemVer.unsafeParse(2, 1, 0);
    const next = SemVer.unsafeParse(2, 0, 0);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.VERSION);
  });

  it('returns SUBJECT for cross-major rollback (v2.0.0 → v1.3.2)', () => {
    const current = SemVer.unsafeParse(2, 0, 0);
    const next = SemVer.unsafeParse(1, 3, 2);
    expect(strategy.scope(current, next)).toBe(InvalidationScope.SUBJECT);
  });
});

describe('NoOpInvalidationStrategy', () => {
  it('always returns NONE', () => {
    const strategy = new NoOpInvalidationStrategy();
    expect(strategy.scope(SemVer.unsafeParse(1, 0, 0), SemVer.unsafeParse(2, 0, 0))).toBe(InvalidationScope.NONE);
    expect(strategy.scope(SemVer.unsafeParse(1, 0, 0), SemVer.unsafeParse(1, 0, 1))).toBe(InvalidationScope.NONE);
    expect(strategy.scope(SemVer.unsafeParse(1, 0, 0), SemVer.unsafeParse(1, 0, 0))).toBe(InvalidationScope.NONE);
  });
});
