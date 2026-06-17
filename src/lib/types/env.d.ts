/// <reference types="@cloudflare/workers-types" />

export interface Env {
  PROMPT_CACHE_KV: KVNamespace;
  NORMALIZER_CACHE_KV: KVNamespace;
  RATE_LIMITER: {
    limit(key: string): Promise<{ success: boolean }>;
  };
  HEALTH_CHECK_SECRET: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}
