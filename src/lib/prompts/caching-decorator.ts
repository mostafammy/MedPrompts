import { Generator, GenerateRequest, GenerateSuccess, GenerateError } from './generator';
import { PromptCache } from './cache';
import { buildPromptCacheSlug } from './cache-key';
import { Result, ok, err } from '../types/result';

export class CachingDecorator implements Generator {
  constructor(
    private inner: Generator,
    private cache: PromptCache
  ) {}

  async generate(
    request: GenerateRequest
  ): Promise<Result<GenerateSuccess, GenerateError>> {
    const cacheKeyResult = buildPromptCacheSlug({
      topicSlug: request.topicSlug,
      templateVersion: request.templateVersion,
      variables: request.variables,
    });

    if (!cacheKeyResult.ok) {
      return err({ code: 'CACHE_KEY_FAILED', details: cacheKeyResult.error.message });
    }

    const cacheKey = cacheKeyResult.value;

    const cached = await this.cache.get(request.subjectId, cacheKey);
    if (cached) {
      const wordCount = cached.trim().split(/\s+/).filter(Boolean).length;
      return ok({
        output: cached,
        cacheKey,
        placeholderCount: 0,
        wordCount,
        characterCount: cached.length,
      });
    }

    const result = await this.inner.generate(request);

    if (result.ok) {
      await this.cache.set(request.subjectId, cacheKey, result.value.output, 2592000);
    }

    return result.ok ? ok({ ...result.value, cacheKey }) : result;
  }
}
