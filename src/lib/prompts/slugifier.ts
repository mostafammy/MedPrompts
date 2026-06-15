import { Slug, Topic } from '../types/branded';

const MAX_SLUG_BODY = 67;
// Matches outputs of this function: URL-safe body ending with a 6-char base-36 hash suffix.
// Used to short-circuit re-hashing when a hashed slug is passed back in (idempotency guard).
const ALREADY_HASHED_RE = /^[a-z0-9][a-z0-9-]*-[a-z0-9]{6}$/;

export function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).padStart(6, '0').slice(-6);
}

/**
 * @pure
 */
export function slugifyTopic(topic: Topic | string): Slug {
  const body = (topic as string)
    .toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')     // Remove non-alphanumeric
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (body.length === 0) return 'unknown' as Slug;

  if (body.length <= MAX_SLUG_BODY) return body as Slug;  // Common case: no hash needed

  // Idempotency guard: hashed slug outputs are MAX_SLUG_BODY+1..MAX_SLUG_BODY+7 chars and end with
  // a 6-char base-36 suffix. Re-hashing would produce a different suffix because the input changes.
  if (body.length <= MAX_SLUG_BODY + 7 && ALREADY_HASHED_RE.test(body)) return body as Slug;

  const truncated = body.slice(0, MAX_SLUG_BODY).replace(/-[^-]*$/, '');
  return `${truncated}-${fnv1a(body)}` as Slug;  // hash of FULL body — collision-resistant
}

/**
 * @pure
 */
export function slugToTopic(slug: Slug | string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
