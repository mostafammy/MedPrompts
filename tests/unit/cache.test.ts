import { describe, it, expect } from 'vitest';
import { createInMemoryCache } from '../../src/lib/prompts/cache';
import { SubjectId, Slug } from '../../src/lib/types/branded';
import { SemVer } from '../../src/lib/prompts/semver';

describe('PromptCache (InMemory)', () => {
  it('should get, set, and delete prompts', async () => {
    const cache = createInMemoryCache();
    const subjectId = 'pathology' as SubjectId;
    const slug = 'myocardial-infarction' as Slug;
    const prompt = 'Generated prompt content';

    expect(await cache.get(subjectId, slug)).toBeNull();

    await cache.set(subjectId, slug, prompt, 3600);

    expect(await cache.get(subjectId, slug)).toBe(prompt);

    await cache.deleteSubject(subjectId);

    expect(await cache.get(subjectId, slug)).toBeNull();
  });

  it('should delete version-specific keys', async () => {
    const cache = createInMemoryCache();
    const subjectId = 'pathology' as SubjectId;
    const v1Slug = 'topic-v1-0-0-a1b2c3d4e5f67890' as Slug;
    const v2Slug = 'topic-v1-1-0-a1b2c3d4e5f67890' as Slug;

    await cache.set(subjectId, v1Slug, 'v1 content', 3600);
    await cache.set(subjectId, v2Slug, 'v2 content', 3600);

    expect(await cache.get(subjectId, v1Slug)).toBe('v1 content');
    expect(await cache.get(subjectId, v2Slug)).toBe('v2 content');

    const deleted = await cache.deleteVersion(subjectId, SemVer.unsafeParse(1, 0, 0));
    expect(deleted.deleted).toBe(1);
    expect(deleted.total).toBe(1);

    expect(await cache.get(subjectId, v1Slug)).toBeNull();
    expect(await cache.get(subjectId, v2Slug)).toBe('v2 content');
  });
});
