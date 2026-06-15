export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * @pure Creates a successful Result
 * @example ok(42)
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * @pure Creates a failed Result
 * @example err(new Error('failed'))
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * @pure Checks if a Result is successful
 * @example isOk(result)
 */
export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;

/**
 * @pure Checks if a Result is failed
 * @example isErr(result)
 */
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

/**
 * @pure Maps a successful Result to a new value
 * @example map(ok(2), x => x * 2) // ok(4)
 */
export const map = <T, U, E>(r: Result<T, E>, fn: (t: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

/**
 * @pure Chains multiple Result-returning functions
 * @example flatMap(ok(2), x => ok(x * 2)) // ok(4)
 */
export const flatMap = <T, U, E>(r: Result<T, E>, fn: (t: T) => Result<U, E>): Result<U, E> =>
  r.ok ? fn(r.value) : r;

/**
 * @pure Unwraps a successful Result, or returns the fallback if failed
 * @example unwrapOr(err('fail'), 42) // 42
 */
export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r.ok ? r.value : fallback;
