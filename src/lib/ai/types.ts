import { LanguageModel } from 'ai';

export type ProviderName = 'groq' | 'cerebras' | 'deepinfra' | 'togetherai' | 'openrouter' | 'google';

export type ProviderState = 'READY' | 'PENDING' | 'RATE_LIMITED' | 'COOLING' | 'DEGRADED';

export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  rpm: number;
  tpd: number;
  p50LatencyMs: number;
  defaultCooldownMs: number;
  createModel: () => LanguageModel;
}

export interface ProviderStatus {
  state: ProviderState;
  cooldownUntil: number;
  requestsThisMinute: number;
  lastResetAt: number;
  totalRequestsToday: number;
  totalFailures: number;
}

export type InferenceResult = {
  success: true;
  provider: ProviderName;
  text: string;
  latencyMs: number;
  tier: number;
} | {
  success: false;
  error: string;
  exhaustedProviders: ProviderName[];
};

export interface IBudgetManager {
  canUseProvider(provider: ProviderName): boolean;
  recordSuccess(provider: ProviderName): void;
  recordRateLimit(provider: ProviderName, retryAfterSeconds?: number): void;
  recordError(provider: ProviderName): void;
  getStatuses(): Record<ProviderName, ProviderStatus>;
}

export interface IProviderRegistry {
  getWaterfallOrder(): ProviderName[];
  getModel(provider: ProviderName): LanguageModel;
  getConfig(provider: ProviderName): ProviderConfig;
}
