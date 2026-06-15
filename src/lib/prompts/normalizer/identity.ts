import { TopicNormalizer, NormalizationResult, NormalizerContext, NormalizerEnv } from './contract';

export const identityNormalizer: TopicNormalizer = {
  name: 'identity',
  requiresNetwork: false,
  isEnabled(_env: NormalizerEnv): boolean {
    return true;
  },
  async normalize(raw: string, _ctx: NormalizerContext): Promise<NormalizationResult> {
    return {
      cleaned: raw.trim(),
      confidence: 1.0,
      strategy: 'unchanged'
    };
  }
};
