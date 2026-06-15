import { Slug, Topic } from '../types/branded';

const MAX_SLUG_BODY = 67;

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

  const truncated = body.slice(0, MAX_SLUG_BODY).replace(/-[^-]*$/, '');
  return `${truncated}-${fnv1a(body)}` as Slug;  // hash of FULL body — collision-resistant
}

/**
 * @pure
 */
export function slugToTopic(slug: Slug | string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
