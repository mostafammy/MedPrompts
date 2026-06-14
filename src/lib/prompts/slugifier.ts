import { Slug, Topic } from '../types/branded';

const MAX_SLUG_BODY = 67;

export function fnv1a(s: string): string {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * @pure
 */
export function slugifyTopic(topic: Topic | string): Slug {
  const normalized = topic.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (normalized.length === 0) return 'unknown' as Slug;

  if (normalized.length > MAX_SLUG_BODY) {
    const truncated = normalized.substring(0, MAX_SLUG_BODY).replace(/-$/, '');
    const hash = fnv1a(topic as string).substring(0, 6);
    return `${truncated}-${hash}` as Slug;
  }

  return normalized as Slug;
}

/**
 * @pure
 */
export function slugToTopic(slug: Slug | string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
