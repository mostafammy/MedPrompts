import { createHash } from 'node:crypto';
import { Result, ok, err } from '../types/result';
import { Slug } from '../types/branded';

export function canonicalJson(value: Record<string, string>): string {
  const sorted = Object.keys(value)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = value[key] ?? '';
      return acc;
    }, {});

  return JSON.stringify(sorted);
}

export function buildPromptCacheSlug(input: {
  topicSlug: Slug;
  templateVersion: number;
  variables: Record<string, string>;
}): Result<Slug, { code: 'INVALID_CACHE_KEY'; message: string }> {
  const hash = createHash('sha256')
    .update(canonicalJson(input.variables))
    .digest('hex')
    .slice(0, 16);

  const suffix = `-t${input.templateVersion}-${hash}`;
  // Slug.parse enforces a 74-char maximum. Truncate topicSlug to stay within limits.
  const maxPrefixLen = 74 - suffix.length;
  if (maxPrefixLen < 10) {
    return err({ code: 'INVALID_CACHE_KEY', message: `Template version ${input.templateVersion} makes cache key too long` });
  }

  const truncatedSlug = input.topicSlug.length > maxPrefixLen
    ? (input.topicSlug.slice(0, maxPrefixLen).replace(/-$/, '') as Slug)
    : input.topicSlug;

  const cacheKeyStr = `${truncatedSlug}${suffix}`;
  const parsedKey = Slug.parse(cacheKeyStr);
  if (!parsedKey.ok) {
    return err({ code: 'INVALID_CACHE_KEY', message: parsedKey.error.message });
  }
  return ok(parsedKey.value);
}
