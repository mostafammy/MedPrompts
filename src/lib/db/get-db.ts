/**
 * [L2] get-db.ts — per-request DB factory
 *
 * Reads Turso credentials from the Cloudflare Worker env via
 * getCloudflareContext() — the ONLY reliable way to access Worker
 * secrets/vars in OpenNext. Falls back to process.env for the
 * Node.js build context (generateStaticParams, local dev).
 *
 * NEVER export a module-level db instance — Workers are stateless;
 * a global singleton created in one isolate is invisible to others.
 *
 * NOTE: Static import is required — dynamic require() is silently
 * tree-shaken or fails to resolve in bundled Cloudflare Workers.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/db/schema';

function getTursoCredentials(): { url: string; authToken?: string } {
  // Primary: Cloudflare Worker env (runtime — secrets, vars, KV bindings).
  // getCloudflareContext() reads from the AsyncLocalStorage that OpenNext
  // populates at the start of every Worker request.
  try {
    const { env } = getCloudflareContext();
    const url = env.TURSO_DATABASE_URL;
    const authToken = env.TURSO_AUTH_TOKEN;
    if (url) return { url, ...(authToken ? { authToken } : {}) };
  } catch {
    // Not in a CF Worker request context (build step, local dev) — fall through.
  }

  // Fallback: process.env (Next.js build step / local dev via .env.local)
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) return { url, ...(authToken ? { authToken } : {}) };

  throw new Error(
    'TURSO_DATABASE_URL is not set. ' +
    'In production: add it as a Cloudflare Secret (wrangler secret put TURSO_DATABASE_URL). ' +
    'In local dev: add it to .env.local.'
  );
}

export function getDb() {
  const { url, authToken } = getTursoCredentials();
  const client = createClient({ url, ...(authToken ? { authToken } : {}) });
  return drizzle(client, { schema });
}
