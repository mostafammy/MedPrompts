import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, map, flatMap, unwrapOr } from '../../src/lib/types/result';

describe('Result type', () => {
  it('creates ok', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('creates err', () => {
    const r = err('error');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('error');
  });

  it('checks isOk', () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isOk(err(1))).toBe(false);
  });

  it('checks isErr', () => {
    expect(isErr(ok(1))).toBe(false);
    expect(isErr(err(1))).toBe(true);
  });

  it('maps ok', () => {
    const r = map(ok(2), x => x * 2);
    expect(r).toEqual(ok(4));
  });

  it('does not map err', () => {
    const r = map(err('e'), (x: number) => x * 2);
    expect(r).toEqual(err('e'));
  });

  it('flatMaps ok', () => {
    const r = flatMap(ok(2), x => ok(x * 2));
    expect(r).toEqual(ok(4));
  });

  it('unwrapOr', () => {
    expect(unwrapOr(ok(1), 2)).toBe(1);
    expect(unwrapOr(err('e'), 2)).toBe(2);
  });
});
