import { describe, it, expect, vi } from 'vitest';
import { TopicNormalizationPipeline } from '../../src/lib/prompts/pipeline';
import { NormalizerCache, createInMemoryCacheStore } from '../../src/lib/prompts/normalizer/cache';
import { TopicNormalizer, NormalizerContext, NormalizerEnv } from '../../src/lib/prompts/normalizer/contract';
import { SubjectId } from '../../src/lib/types/branded';

describe('TopicNormalizationPipeline', () => {
  const dummyContext: NormalizerContext = { subjectId: 'pathology' as SubjectId, raw: 'input' };
  const dummyEnv: NormalizerEnv = { hasApiKey: true, userPlan: 'free' };

  it('should return cached result if available', async () => {
    const store = createInMemoryCacheStore();
    const cache = new NormalizerCache(store);
    await cache.set('pathology' as SubjectId, 'input', { cleaned: 'Cached Output', confidence: 1.0, strategy: 'cache' });

    const pipeline = new TopicNormalizationPipeline([], cache);
    const result = await pipeline.normalize('input', dummyContext, dummyEnv);
    
    expect(result.cleaned).toBe('Cached Output');
  });

  it('should run normalizers sequentially and cache result on miss', async () => {
    const store = createInMemoryCacheStore();
    const cache = new NormalizerCache(store);

    const norm1: TopicNormalizer = {
      name: 'n1',
      requiresNetwork: false,
      isEnabled: () => true,
      normalize: async (raw) => ({ cleaned: raw.trim(), confidence: 1.0, strategy: 'n1' })
    };

    const norm2: TopicNormalizer = {
      name: 'n2',
      requiresNetwork: false,
      isEnabled: () => true,
      normalize: async (raw) => ({ cleaned: raw.toUpperCase(), confidence: 0.9, strategy: 'n2', corrections: [{ from: raw, to: raw.toUpperCase(), reason: 'upper' }] })
    };

    const pipeline = new TopicNormalizationPipeline([norm1, norm2], cache);
    const result = await pipeline.normalize('  hello  ', dummyContext, dummyEnv);

    expect(result.cleaned).toBe('HELLO');
    expect(result.confidence).toBe(0.9);
    expect(result.strategy).toBe('n1+n2');
    
    // Verify it was cached
    const cached = await cache.get('pathology' as SubjectId, '  hello  ');
    expect(cached?.cleaned).toBe('HELLO');
  });

  it('should skip normalizers requiring network if no API key', async () => {
    const store = createInMemoryCacheStore();
    const cache = new NormalizerCache(store);

    const networkNorm: TopicNormalizer = {
      name: 'net',
      requiresNetwork: true,
      isEnabled: () => true,
      normalize: async () => ({ cleaned: 'Network Output', confidence: 0.8, strategy: 'net' })
    };

    const pipeline = new TopicNormalizationPipeline([networkNorm], cache);
    const envNoKey: NormalizerEnv = { hasApiKey: false, userPlan: 'free' };
    
    const result = await pipeline.normalize('input', dummyContext, envNoKey);
    expect(result.cleaned).toBe('input'); // Skipped network
  });
});
