// Interface: PromptCache (Extended)
// File: src/lib/prompts/cache.ts (existing — extend with deleteVersion)
//
// Abstraction over the edge cache layer. Isolates the rest of the system
// from the specific cache provider (Cloudflare KV, in-memory, etc.).

import type { SubjectId, Slug } from '../types/branded';
import type { SemVer } from './semver';

export interface PromptCache {
  /** Retrieve a cached prompt. Returns null if not found or expired. */
  get(subjectId: SubjectId, slug: Slug): Promise<string | null>;

  /** Store a prompt with TTL in seconds. Silently handles failures. */
  set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void>;

  /** Delete all cached prompts for a subject (major bump or subject-scoped invalidation).
   *  Returns the number of keys deleted. */
  deleteSubject(subjectId: SubjectId): Promise<number>;

  /** Delete cached prompts matching a specific version prefix (minor bump invalidation).
   *  E.g., for SemVer(1,0,0), deletes all keys containing "-v1.0."
   *  Returns the number of keys deleted. */
  deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<number>;
}
