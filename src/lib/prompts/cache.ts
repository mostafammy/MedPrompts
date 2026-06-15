import { SubjectId, Slug } from '../types/branded';

export interface PromptCache {
  get(subjectId: SubjectId, slug: Slug): Promise<string | null>;
  set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void>;
  delete(subjectId: SubjectId): Promise<void>;
}

export class CloudflarePromptCache implements PromptCache {
  constructor(private kv: KVNamespace) {}

  private key(subjectId: SubjectId, slug: Slug): string {
    return `prompt:${subjectId}:${slug}`;
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

  async delete(subjectId: SubjectId): Promise<void> {
    try {
      const prefix = `prompt:${subjectId}:`;
      let list = await this.kv.list({ prefix });
      
      while (true) {
        for (const key of list.keys) {
          await this.kv.delete(key.name);
        }
        if (list.list_complete) break;
        list = await this.kv.list({ prefix, cursor: list.cursor });
      }
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
    async delete(subjectId: SubjectId) {
      const prefix = `prompt:${subjectId}:`;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    }
  };
}
