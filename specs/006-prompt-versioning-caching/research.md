# Research: Semantic Prompt Versioning & Intelligent Caching

## Decisions & Rationale

### Decision 1: SemVer Value Object Pattern

**Decision**: Model `SemVer` as a branded value object with static `parse()` returning `Result<SemVer, ValidationError>`.

**Rationale**:
- Follows the existing branded type pattern in `src/lib/types/branded.ts` — every logical domain type has a branded wrapper with `parse`/`unsafeParse`
- Guarantees at the type level that invalid semver strings cannot be passed to downstream consumers
- `bump()` method returns a new instance (immutable), aligning with value object semantics
- `compare()` and `bumpType()` enable the cache invalidation strategy to determine scope without parsing strings

**Alternatives considered**:
- Plain string with runtime validation: Loses type safety, requires validation at every usage site
- Array of numbers `[1, 0, 0]`: Loses semantic meaning, poor DX for comparison
- Third-party semver library: Overkill for MAJOR.MINOR.PATCH only (no pre-release, no ranges); adds dependency

### Decision 2: Strategy Pattern for Cache Invalidation

**Decision**: Implement `CacheInvalidationStrategy` as an interface with `scope(old, new) → InvalidationScope`, following the existing `ValidationStrategy` pattern.

**Rationale**:
- The existing codebase already uses this exact pattern (`src/lib/prompts/validation-strategy.ts`): interface with a single method, factory function, multiple implementations
- OCP-compliant — new strategies (A/B testing, canary, traffic-split) are added without modifying activation code
- The `SemanticInvalidationStrategy` is the production implementation; tests use a `NoOpInvalidationStrategy` or a custom test double
- The strategy is injected into the activation function, not constructed inside it (DIP)

**Alternatives considered**:
- Hardcoded invalidation logic in `activateTemplate`: Violates OCP, harder to test, impossible to extend without modifying activation code
- Configuration-driven (JSON rules engine): Over-engineering for three scopes; strategy pattern is simpler and matches codebase conventions

### Decision 3: Cache Key Format

**Decision**: `prompt:{subjectId}:{topicSlug}-v{major}.{minor}.{patch}-{hash16}`

**Rationale**:
- Matches existing convention: current keys are `prompt:{subjectId}:{slug}` — we extend the slug portion to include version
- The `v{major}.{minor}.{patch}` prefix enables KV prefix-based deletion: `deleteVersion()` uses `prompt:{subjectId}:*-v1.0.*` as prefix pattern
- 16-char hex hash from canonicalized variable JSON ensures deterministic keys
- The branded `Slug` type enforces the 74-char max; version and hash take at most ~25 chars (`-v2.1.3-{hash16}` = 25), leaving 49 chars for topicSlug — more than enough

**Alternatives considered**:
- Separate KV key segments: Would require restructuring the key namespace, breaking existing cache entries
- Version in KV metadata: Cloudflare KV metadata is not queryable by prefix; can't use it for selective invalidation

### Decision 4: DB Schema Evolution

**Decision**: Add columns to existing `prompt_templates` table + create new `template_versions` table in a single Drizzle migration.

**Rationale**:
- Drizzle supports adding columns to existing tables via `ALTER TABLE` — no data migration needed for new nullable columns
- The existing `version: integer` column will be deprecated (kept for backward compatibility during migration, removed in a future migration)
- New columns: `semver text`, `version_major integer`, `version_minor integer`, `version_patch integer`, `checksum text`
- `template_versions` table is append-only with FK to `prompt_templates.id`
- One migration file covers both changes; Drizzle migration naming: `0002_semver_versioning`

**Alternatives considered**:
- Replace `version` entirely: Would break existing seeded data; safer to dual-write during migration
- Separate version table with no FK: Loses referential integrity; rollbacks could target orphaned versions

### Decision 5: Activation Concurrency Control

**Decision**: Use Drizzle's `transaction()` with serializable isolation. The transaction reads the current active version, checks for identity, updates both records, and commits atomically.

**Rationale**:
- Turso/libSQL supports serializable isolation via SQLite's default locking behavior
- The transaction is short (3-4 queries), minimizing lock contention
- No additional infrastructure (Redis locks, advisory locks) needed
- If two concurrent activations race, SQLite's writer lock ensures exactly one commits; the second receives a `SQLITE_BUSY` error which maps to a conflict response

**Alternatives considered**:
- Optimistic locking with version number: Adds complexity; SQLite's built-in locking is simpler and equally effective for this low-contention operation
- Distributed lock (Redis): Over-engineering — activations are infrequent and single-node

### Decision 6: Test Architecture

**Decision**: Follow existing patterns — flat test files in `tests/unit/`, in-memory stores for cache tests, Result assertions.

**Rationale**:
- All existing tests use Vitest in flat `tests/unit/` — consistency matters
- `createInMemoryCache()` already exists for cache testing — we extend the interface to add `deleteVersion()` with in-memory prefix matching
- `SemVer` tests use property-based testing (vitest's `vitest` built-in) for exhaustive edge cases
- Strategy tests use a mock strategy to verify the activation function delegates correctly

**Files to create**:
- `tests/unit/semver.test.ts`
- `tests/unit/version-manager.test.ts`
- `tests/unit/cache-invalidation-strategy.test.ts`

**Existing patterns to follow**:
- `import { describe, it, expect } from 'vitest'`
- `expect(result.ok).toBe(true)` / `expect(result.ok).toBe(false)`
- `if (result.ok) { expect(result.value).toBe(...) }`
- `import { ok, err } from '../../src/lib/types/result'`

### Decision 7: Observability Integration

**Decision**: Use the existing `Analytics` interface — add new method `trackVersionActivation(...)` for version events.

**Rationale**:
- The `Analytics` interface is already injected into the decorator chain
- Adding a method is OCP-friendly (no existing code changes)
- `PlausibleAnalytics` implements it for production; `NoopAnalytics` for tests
- Avoids introducing a new analytics abstraction

**Alternatives considered**:
- Dedicated telemetry module: Over-engineering for current scope; can be extracted if needed later
- Direct Plausible API calls: Violates DIP; couples version code to analytics provider

## Dependency & Integration Analysis

| Dependency | How Used | Migration Notes |
|------------|----------|-----------------|
| `drizzle-orm` 0.45.2 | `sqliteTable`, `text`, `integer`, `eq`, `and`, `transaction` | All supported in current version |
| `@libsql/client` 0.17.3 | `createClient` | Serializable transactions supported |
| Cloudflare KV | `KVNamespace.list({prefix})`, `KVNamespace.delete()` | KV free tier: 1000 ops/day; batch deletes in pages of 1000 |
| `Result<T, E>` | All error handling follows discriminated union | New code must return `Result` types |
| Branded types | `SubjectId`, `Slug` with `parse()` | New `SemVer` follows same pattern |

## Open Questions (Resolved)

1. **How to handle KV pagination in `deleteVersion()`?**: KV `list()` returns at most 1000 keys. Must paginate with cursor until `list_complete`. The existing `CloudflarePromptCache.delete()` already does this — copy the pattern.

2. **Should `template_versions` store the full template text or diffs?**: Full text. Storing diffs adds complexity (ordered application, merge conflicts) for negligible storage savings at this scale (templates are <10KB each, 50 versions = 500KB).

3. **How to migrate existing integer versions?**: Backfill: version 1 → "1.0.0", version 2 → "2.0.0" (all existing versions treated as major bumps). This preserves backward compatibility with existing cache entries.
