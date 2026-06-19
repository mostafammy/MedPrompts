import { createHash } from 'node:crypto';
import { Result, ok, err } from '../types/result';
import { Slug } from '../types/branded';

export function canonicalJson(value: Record<string, string>): string {
  const sorted = Object.keys(value)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = value[key];
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

  const parsed = Slug.parse(`${input.topicSlug}-t${input.templateVersion}-${hash}`);
  if (!parsed.ok) {
    return err({ code: 'INVALID_CACHE_KEY', message: parsed.error.message });
  }

  return ok(parsed.value);
}
