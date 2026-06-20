import { Generator, GenerateRequest, GenerateSuccess, GenerateError } from './generator';
import { PromptCache } from './cache';
import { Analytics, VersionActivationEvent } from '../analytics';
import { buildPromptCacheSlug } from './cache-key';
import { SemVer } from './semver';
import { Result, ok, err } from '../types/result';

const STAMPEDE_LOCK_TTL = 10;
const STAMPEDE_LOCK_RETRY_MS = 150;
const STAMPEDE_LOCK_MAX_RETRIES = 20;

export class CachingDecorator implements Generator {
  private inflight = new Map<string, Promise<Result<GenerateSuccess, GenerateError>>>();

  constructor(
    private inner: Generator,
    private cache: PromptCache,
    private analytics?: Analytics
  ) {}

  async generate(
    request: GenerateRequest
  ): Promise<Result<GenerateSuccess, GenerateError>> {
    const semverResult = SemVer.parse(request.templateSemver);
    if (!semverResult.ok) {
      return err({ code: 'CACHE_KEY_FAILED', details: `Invalid semver: ${request.templateSemver}` });
    }

    const cacheKeyResult = buildPromptCacheSlug({
      topicSlug: request.topicSlug,
      semver: semverResult.value,
      variables: request.variables,
    });

    if (!cacheKeyResult.ok) {
      return err({ code: 'CACHE_KEY_FAILED', details: cacheKeyResult.error.message });
    }

    const cacheKey = cacheKeyResult.value;
    const cacheKeyStr = `prompt:${request.subjectId}:${cacheKey}`;

    // Check in-flight requests (same-isolate dedup)
    const inflight = this.inflight.get(cacheKeyStr);
    if (inflight) {
      const result = await inflight;
      return result.ok ? ok({ ...result.value, cacheKey }) : result;
    }

    // Try cache
    const cached = await this.cache.get(request.subjectId, cacheKey);
    if (cached !== null && cached !== undefined) {
      this.trackEvent({ event: 'cache.hit', semver: request.templateSemver, subjectId: request.subjectId.toString() });
      const wordCount = cached.trim().split(/\s+/).filter(Boolean).length;
      return ok({
        output: cached,
        cacheKey,
        placeholderCount: 0,
        wordCount,
        characterCount: cached.length,
      });
    }

    // Distributed lock (cross-isolate stampede protection)
    const lockKey = `lock:${cacheKeyStr}`;
    const acquired = await this.cache.tryLock(lockKey, STAMPEDE_LOCK_TTL);

    if (!acquired) {
      // Another instance is generating — wait for it, retry cache
      for (let i = 0; i < STAMPEDE_LOCK_MAX_RETRIES; i++) {
        await sleep(STAMPEDE_LOCK_RETRY_MS);
        const filled = await this.cache.get(request.subjectId, cacheKey);
        if (filled !== null && filled !== undefined) {
          this.trackEvent({ event: 'cache.stampede_wait', semver: request.templateSemver, subjectId: request.subjectId.toString() });
          const wordCount = filled.trim().split(/\s+/).filter(Boolean).length;
          return ok({
            output: filled,
            cacheKey,
            placeholderCount: 0,
            wordCount,
            characterCount: filled.length,
          });
        }
      }
    }

    // Generate — guard with in-flight dedup
    const genPromise = this.inner.generate(request);
    this.inflight.set(cacheKeyStr, genPromise);

    try {
      const result = await genPromise;

      if (result.ok) {
        await this.cache.set(request.subjectId, cacheKey, result.value.output, 2592000);
      }

      this.trackEvent({
        event: result.ok ? 'cache.miss' : 'cache.generate_failed',
        semver: request.templateSemver,
        subjectId: request.subjectId.toString(),
      });

      return result.ok ? ok({ ...result.value, cacheKey }) : result;
    } finally {
      this.inflight.delete(cacheKeyStr);
      if (acquired) {
        await this.cache.unlock(lockKey).catch(() => {});
      }
    }
  }

  private trackEvent(payload: { event: string; semver: string; subjectId: string }): void {
    if (!this.analytics) return;
    try {
      this.analytics.trackVersionActivation(payload as unknown as VersionActivationEvent);
    } catch {
      // Never throw from telemetry
    }
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
