import { SubjectId } from '../../types/branded';
import { NormalizationResult } from './contract';
import { fnv1a } from '../slugifier';

export interface NormalizerCacheStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export class CloudflareNormalizerCacheStore implements NormalizerCacheStore {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.kv.get(key);
    } catch {
      return null;
    }
  }

  async put(key: string, value: string, options: { expirationTtl: number }): Promise<void> {
    try {
      await this.kv.put(key, value, options);
    } catch {
      // Ignore errors
    }
  }
}

export function createInMemoryCacheStore(): NormalizerCacheStore {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) || null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    }
  };
}

export class NormalizerCache {
  constructor(private store: NormalizerCacheStore) {}

  private key(subjectId: SubjectId, raw: string): string {
    const hash = fnv1a(raw.toLowerCase().trim());
    return `norm:${subjectId}:${hash}`;
  }

  async get(subjectId: SubjectId, raw: string): Promise<NormalizationResult | null> {
    const val = await this.store.get(this.key(subjectId, raw));
    if (!val) return null;
    try {
      return JSON.parse(val) as NormalizationResult;
    } catch {
      return null;
    }
  }

  async set(subjectId: SubjectId, raw: string, result: NormalizationResult): Promise<void> {
    const ttl = 604800; // 7 days
    try {
      await this.store.put(this.key(subjectId, raw), JSON.stringify(result), { expirationTtl: ttl });
    } catch {
      // Ignore errors
    }
  }
}
