import { createGroq } from '@ai-sdk/groq';
import { createCerebras } from '@ai-sdk/cerebras';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { ProviderConfig, ProviderName, IProviderRegistry } from './types';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const deepinfra = createDeepInfra({ apiKey: process.env.DEEPINFRA_API_KEY });
const togetherai = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY });
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: {
    name: 'groq',
    displayName: 'Groq (LPU)',
    rpm: 30,
    tpd: 0,
    p50LatencyMs: 400,
    defaultCooldownMs: 10000,
    createModel: () => groq('llama3-8b-8192'),
  },
  cerebras: {
    name: 'cerebras',
    displayName: 'Cerebras',
    rpm: 30,
    tpd: 0,
    p50LatencyMs: 300,
    defaultCooldownMs: 10000,
    createModel: () => cerebras('llama3.1-8b'),
  },
  deepinfra: {
    name: 'deepinfra',
    displayName: 'DeepInfra',
    rpm: 25,
    tpd: 0,
    p50LatencyMs: 500,
    defaultCooldownMs: 10000,
    createModel: () => deepinfra('meta-llama/Meta-Llama-3-8B-Instruct'),
  },
  togetherai: {
    name: 'togetherai',
    displayName: 'Together AI',
    rpm: 60,
    tpd: 0,
    p50LatencyMs: 600,
    defaultCooldownMs: 10000,
    createModel: () => togetherai('meta-llama/Llama-3-8b-chat-hf'),
  },
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter (Free)',
    rpm: 200,
    tpd: 0,
    p50LatencyMs: 800,
    defaultCooldownMs: 10000,
    createModel: () => openrouter('meta-llama/llama-3-8b-instruct:free'),
  },
  google: {
    name: 'google',
    displayName: 'Google Gemini',
    rpm: 15,
    tpd: 0,
    p50LatencyMs: 1000,
    defaultCooldownMs: 10000,
    createModel: () => google('gemini-1.5-flash'),
  },
};

export class ProviderRegistry implements IProviderRegistry {
  getWaterfallOrder(): ProviderName[] {
    return ['groq', 'cerebras', 'deepinfra', 'togetherai', 'openrouter', 'google'];
  }

  getModel(provider: ProviderName): LanguageModel {
    return PROVIDERS[provider].createModel();
  }

  getConfig(provider: ProviderName): ProviderConfig {
    return PROVIDERS[provider];
  }
}
