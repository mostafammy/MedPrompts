import { describe, it, expect, vi } from 'vitest';
import { PromptEngine, EngineEnv } from '../../src/lib/prompts/engine';
import { TopicNormalizationPipeline } from '../../src/lib/prompts/pipeline';
import { createInMemoryCache } from '../../src/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '../../src/lib/prompts/normalizer/cache';
import { noopAnalytics } from '../../src/lib/analytics';
import { SubjectId, Slug } from '../../src/lib/types/branded';
import * as loader from '../../src/lib/prompts/loader';

vi.mock('../../src/lib/prompts/loader', () => ({
  getActiveTemplate: vi.fn()
}));

describe('PromptEngine', () => {
  const dummyEnv: EngineEnv = { hasApiKey: false, userPlan: 'free' };
  const subjectId = 'pathology' as SubjectId;

  it('should return cached prompt if available', async () => {
    const promptCache = createInMemoryCache();
    await promptCache.set(subjectId, 'mi' as Slug, 'Cached content', 3600);

    const normCache = new NormalizerCache(createInMemoryCacheStore());
    const pipeline = new TopicNormalizationPipeline([], normCache);
    const engine = new PromptEngine({} as any, promptCache, pipeline, noopAnalytics);

    const result = await engine.generatePrompt(subjectId, 'mi', dummyEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('Cached content');
    }
  });

  it('should return SUBJECT_NOT_FOUND if no template is active', async () => {
    vi.mocked(loader.getActiveTemplate).mockResolvedValueOnce(null);

    const promptCache = createInMemoryCache();
    const normCache = new NormalizerCache(createInMemoryCacheStore());
    const pipeline = new TopicNormalizationPipeline([], normCache);
    const engine = new PromptEngine({} as any, promptCache, pipeline, noopAnalytics);

    const result = await engine.generatePrompt(subjectId, 'New Topic', dummyEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SUBJECT_NOT_FOUND');
    }
  });

  it('should follow full generation flow and cache result', async () => {
    const validTemplate = `
## Pathogenesis
{{TOPIC}} test
This is a test prompt to ensure that we meet the minimum 50 word requirement
for the validateTemplate function to pass successfully. I need to keep writing 
more words here so that the length of this string is at least fifty words.
This should be getting close to the limit by now. Let's add a few more words
just to be absolutely safe about this. One two three four five six seven eight.
## Clinical
## Management
⚠️ Verify this info.
    `;
    vi.mocked(loader.getActiveTemplate).mockResolvedValue({
      id: '1', subjectId, template: validTemplate, version: 1, isActive: true, createdAt: new Date(), changelog: null
    });

    const promptCache = createInMemoryCache();
    const normCache = new NormalizerCache(createInMemoryCacheStore());
    const pipeline = new TopicNormalizationPipeline([], normCache);
    
    const trackSpy = vi.spyOn(noopAnalytics, 'trackPromptGenerated');

    const engine = new PromptEngine({} as any, promptCache, pipeline, noopAnalytics);

    const result = await engine.generatePrompt(subjectId, 'Myocardial Infarction', dummyEnv);
    
    expect(result.ok).toBe(true);
    
    // Instead of guessing the slug, run generate again and verify it hits cache
    const secondResult = await engine.generatePrompt(subjectId, 'Myocardial Infarction', dummyEnv);
    if (!secondResult.ok) {
      console.error('Second result error:', secondResult.error);
    }
    expect(secondResult.ok).toBe(true);
    if (secondResult.ok && result.ok) {
      expect(secondResult.value).toBe(result.value);
    }

    // Should have tracked analytics twice (one generated, one cached)
    expect(trackSpy).toHaveBeenCalledTimes(2);
    expect(trackSpy).toHaveBeenCalledWith(subjectId, 'myocardial-infarction', expect.any(Number));
  });
});
