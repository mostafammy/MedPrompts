/// <reference types="@cloudflare/workers-types" />

/** Worker bindings declared in wrangler.jsonc */
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

/**
 * Augment the global CloudflareEnv interface that @opennextjs/cloudflare
 * uses for getCloudflareContext().env. Declaration merging here means
 * getCloudflareContext().env is fully typed — no casting required.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CloudflareEnv extends Env {}
}
