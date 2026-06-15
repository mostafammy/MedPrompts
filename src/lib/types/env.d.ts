/// <reference types="@cloudflare/workers-types" />

export interface Env {
  PROMPT_CACHE_KV: KVNamespace;
  NORMALIZER_CACHE_KV: KVNamespace;
  RATE_LIMITER: {
    limit(key: string): Promise<{ success: boolean }>;
  };
  HEALTH_CHECK_SECRET: string;
}
