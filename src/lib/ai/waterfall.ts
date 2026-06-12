import { generateText, APICallError } from 'ai';
import { IBudgetManager, IProviderRegistry, InferenceResult, ProviderName } from './types';
import { logger } from './logger';

export async function executeWaterfall(
  prompt: string,
  budgetManager: IBudgetManager,
  registry: IProviderRegistry,
  timeoutMs = 8000
): Promise<InferenceResult> {
  const providers = registry.getWaterfallOrder();
  const exhausted: ProviderName[] = [];
  const waterfallStartTime = Date.now();

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    
    if (!budgetManager.canUseProvider(provider)) {
      logger.info('Skipping provider due to rate limit/degradation', { provider });
      exhausted.push(provider);
      continue;
    }

    try {
      const model = registry.getModel(provider);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      logger.info('Attempting inference', { provider, tier: i + 1 });
      
      const startTime = Date.now();
      const result = await generateText({
        model,
        prompt,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      budgetManager.recordSuccess(provider);
      const latencyMs = Date.now() - startTime;
      const totalLatencyMs = Date.now() - waterfallStartTime;

      logger.info('Inference successful', { 
        provider, 
        latencyMs, 
        totalLatencyMs,
        tokens: result.usage?.totalTokens 
      });

      return {
        success: true,
        provider,
        text: result.text,
        latencyMs: totalLatencyMs,
        tier: i + 1,
      };

    } catch (error: unknown) {
      let isRateLimit = false;
      const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('Timeout'));
      
      const err = error as Record<string, unknown>;
      if (err && typeof err === 'object') {
        if (err.statusCode === 429) {
          isRateLimit = true;
        } else if (error instanceof APICallError && error.statusCode === 429) {
          isRateLimit = true;
        }
      }

      logger.warn('Provider failed', { 
        provider, 
        error: error instanceof Error ? error.message : 'Unknown error',
        isRateLimit,
        isTimeout
      });

      if (isRateLimit) {
        const headers = err.responseHeaders as Record<string, string> | undefined;
        const retryAfter = headers?.['retry-after'];
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        budgetManager.recordRateLimit(
          provider, 
          !retryAfterSeconds || isNaN(retryAfterSeconds) ? undefined : retryAfterSeconds
        );
      } else {
        budgetManager.recordError(provider);
      }

      exhausted.push(provider);
    }
  }

  logger.error('All providers exhausted', { exhausted });

  return {
    success: false,
    error: 'All providers failed or were rate-limited.',
    exhaustedProviders: exhausted,
  };
}
