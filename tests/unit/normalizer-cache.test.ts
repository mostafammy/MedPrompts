import { describe, it, expect } from 'vitest';
import { createInMemoryCacheStore, NormalizerCache } from '../../src/lib/prompts/normalizer/cache';
import { SubjectId } from '../../src/lib/types/branded';
import { NormalizationResult } from '../../src/lib/prompts/normalizer/contract';

describe('NormalizerCache', () => {
  it('should get and set normalization results', async () => {
    const store = createInMemoryCacheStore();
    const cache = new NormalizerCache(store);
    const subjectId = 'pathology' as SubjectId;
    const raw = '  MI ';
    const result: NormalizationResult = {
      cleaned: 'Myocardial Infarction',
      confidence: 0.95,
      strategy: 'abbreviation'
    };

    // Miss
    expect(await cache.get(subjectId, raw)).toBeNull();

    // Set
    await cache.set(subjectId, raw, result);

    // Hit
    const hit = await cache.get(subjectId, raw);
    expect(hit).toEqual(result);

    // Corrupt JSON
    const keyStr = (cache as any).key(subjectId, raw);
    await store.put(keyStr, '{ bad json', { expirationTtl: 100 });
    expect(await cache.get(subjectId, raw)).toBeNull();
  });
});
