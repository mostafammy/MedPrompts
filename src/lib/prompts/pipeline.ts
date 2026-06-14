import { TopicNormalizer, NormalizationResult, NormalizerContext, NormalizerEnv, Correction } from './normalizer/contract';
import { NormalizerCache } from './normalizer/cache';

export class TopicNormalizationPipeline {
  constructor(
    private normalizers: TopicNormalizer[],
    private cache: NormalizerCache
  ) {}

  async normalize(raw: string, ctx: NormalizerContext, env: NormalizerEnv): Promise<NormalizationResult> {
    const cached = await this.cache.get(ctx.subjectId, raw);
    if (cached) {
      return cached;
    }

    let current = raw;
    let finalConfidence = 1.0;
    const allCorrections: Correction[] = [];
    const strategiesUsed: string[] = [];

    for (const normalizer of this.normalizers) {
      if (normalizer.requiresNetwork && !env.hasApiKey) {
        continue;
      }
      if (!normalizer.isEnabled(env)) {
        continue;
      }

      const result = await normalizer.normalize(current, ctx);
      
      if (result.cleaned !== current) {
        current = result.cleaned;
        finalConfidence = Math.min(finalConfidence, result.confidence);
        strategiesUsed.push(result.strategy);
        if (result.corrections) {
          allCorrections.push(...result.corrections);
        }
      }
    }

    const finalResult: NormalizationResult = {
      cleaned: current,
      confidence: finalConfidence,
      strategy: strategiesUsed.length > 0 ? strategiesUsed.join('+') : 'unchanged',
      ...(allCorrections.length > 0 ? { corrections: allCorrections } : {})
    };

    await this.cache.set(ctx.subjectId, raw, finalResult);

    return finalResult;
  }
}
