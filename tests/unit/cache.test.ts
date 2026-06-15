import { describe, it, expect } from 'vitest';
import { createInMemoryCache } from '../../src/lib/prompts/cache';
import { SubjectId, Slug } from '../../src/lib/types/branded';

describe('PromptCache (InMemory)', () => {
  it('should get, set, and delete prompts', async () => {
    const cache = createInMemoryCache();
    const subjectId = 'pathology' as SubjectId;
    const slug = 'myocardial-infarction' as Slug;
    const prompt = 'Generated prompt content';

    // Miss
    expect(await cache.get(subjectId, slug)).toBeNull();

    // Set
    await cache.set(subjectId, slug, prompt, 3600);

    // Hit
    expect(await cache.get(subjectId, slug)).toBe(prompt);

    // Delete
    await cache.delete(subjectId);

    // Miss again
    expect(await cache.get(subjectId, slug)).toBeNull();
  });
});
