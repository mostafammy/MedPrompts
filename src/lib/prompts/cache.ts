import { SubjectId, Slug } from '../types/branded';
import { SemVer } from './semver';
import { versionPrefix } from './cache-key';

export type DeleteResult = {
  deleted: number;
  total: number;
};

export interface PromptCache {
  get(subjectId: SubjectId, slug: Slug): Promise<string | null>;
  set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void>;
  deleteSubject(subjectId: SubjectId): Promise<DeleteResult>;
  deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<DeleteResult>;
  tryLock(key: string, ttlSeconds: number): Promise<boolean>;
  unlock(key: string): Promise<void>;
}

export class CloudflarePromptCache implements PromptCache {
  constructor(private kv: KVNamespace) {}

  private key(subjectId: SubjectId, slug: Slug): string {
    return `prompt:${subjectId}:${slug}`;
  }

  private lockKey(rawKey: string): string {
    return `lock:${rawKey}`;
  }

  async get(subjectId: SubjectId, slug: Slug): Promise<string | null> {
    try {
      return await this.kv.get(this.key(subjectId, slug));
    } catch {
      return null;
    }
  }

  async set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void> {
    try {
      await this.kv.put(this.key(subjectId, slug), prompt, { expirationTtl: ttlSeconds });
    } catch {
      // Never throw
    }
  }

  async deleteSubject(subjectId: SubjectId): Promise<DeleteResult> {
    let deletedCount = 0;
    let totalCount = 0;
    try {
      const prefix = `prompt:${subjectId}:`;
      let list = await this.kv.list({ prefix });

      while (true) {
        totalCount += list.keys.length;
        const results = await Promise.allSettled(list.keys.map(k => this.kv.delete(k.name)));
        deletedCount += results.filter(r => r.status === 'fulfilled').length;
        if (list.list_complete) break;
        list = await this.kv.list({ prefix, cursor: list.cursor });
      }
    } catch {
      // Never throw
    }
    return { deleted: deletedCount, total: totalCount };
  }

  async deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<DeleteResult> {
    let deletedCount = 0;
    let totalCount = 0;
    try {
      const prefix = `prompt:${subjectId}:`;
      const marker = versionPrefix(semver);
      let list = await this.kv.list({ prefix });

      while (true) {
        const versionKeys = list.keys.filter(k => k.name.includes(marker));
        totalCount += versionKeys.length;
        const results = await Promise.allSettled(versionKeys.map(k => this.kv.delete(k.name)));
        deletedCount += results.filter(r => r.status === 'fulfilled').length;
        if (list.list_complete) break;
        list = await this.kv.list({ prefix, cursor: list.cursor });
      }
    } catch {
      // Never throw
    }
    return { deleted: deletedCount, total: totalCount };
  }

  async tryLock(rawKey: string, ttlSeconds: number): Promise<boolean> {
    try {
      const existing = await this.kv.get(this.lockKey(rawKey));
      if (existing !== null) return false;
      await this.kv.put(this.lockKey(rawKey), '1', { expirationTtl: ttlSeconds, metadata: { lock: true } });
      return true;
    } catch {
      return false;
    }
  }

  async unlock(rawKey: string): Promise<void> {
    try {
      await this.kv.delete(this.lockKey(rawKey));
    } catch {
      // Never throw
    }
  }
}

export function createInMemoryCache(): PromptCache {
  const store = new Map<string, string>();

  return {
    async get(subjectId: SubjectId, slug: Slug) {
      return store.get(`prompt:${subjectId}:${slug}`) || null;
    },
    async set(subjectId: SubjectId, slug: Slug, prompt: string) {
      store.set(`prompt:${subjectId}:${slug}`, prompt);
    },
    async deleteSubject(subjectId: SubjectId) {
      const prefix = `prompt:${subjectId}:`;
      let count = 0;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
          count++;
        }
      }
      return { deleted: count, total: count };
    },
    async deleteVersion(subjectId: SubjectId, semver: SemVer) {
      const prefix = `prompt:${subjectId}:`;
      const marker = versionPrefix(semver);
      let count = 0;
      for (const key of store.keys()) {
        if (key.startsWith(prefix) && key.includes(marker)) {
          store.delete(key);
          count++;
        }
      }
      return { deleted: count, total: count };
    },
    async tryLock(_key: string, _ttlSeconds: number) {
      return true;
    },
    async unlock(_key: string) {
      // no-op
    },
  };
}
