import { SubjectId } from '../../types/branded';

export type NormalizerEnv = {
  hasApiKey: boolean;
  userPlan: 'free' | 'pro';
};

export type NormalizerContext = {
  subjectId: SubjectId;
  raw: string;
};

export type Correction = {
  from: string;
  to: string;
  reason: string;
};

export type NormalizationResult = {
  cleaned: string;
  corrections?: Correction[];
  confidence: number;
  strategy: string;
};

export interface TopicNormalizer {
  name: string;
  requiresNetwork: boolean;
  isEnabled(env: NormalizerEnv): boolean;
  normalize(raw: string, ctx: NormalizerContext): Promise<NormalizationResult>;
}
