# Implementation Plan: Semantic Prompt Versioning & Intelligent Caching

**Branch**: `006-prompt-versioning-caching` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification for semantic versioning and intelligent cache invalidation of medical prompt templates.

## Summary

Introduce semantic versioning (`MAJOR.MINOR.PATCH`) for prompt templates, replacing the current integer-based version system. Implement a pluggable cache invalidation strategy where invalidation scope scales with version bump magnitude (patch=none, minor=version-scoped, major=subject-scoped). Add an append-only version history table with `activatedBy` field for audit trail and rollback capability. All components follow SOLID principles with role-segregated interfaces (`VersionReader`, `VersionWriter`, `VersionActivator`) and constructor injection for infrastructure dependencies.

**Key design decisions** (from research.md):
- `SemVer` as branded value object with `parse()` returning `Result`, matching existing codebase convention
- `CacheInvalidationStrategy` interface following the existing `ValidationStrategy` pattern
- Cache key format: `prompt:{subjectId}:{slug}-v{major}.{minor}.{patch}-{hash16}`
- Full template text stored in version history (not diffs) for simplicity and data integrity
- Serializable transactions for concurrency control via SQLite's built-in writer lock
- Existing integer `version` column kept during migration, dual-written, then removed
- Three role-segregated interfaces instead of one fat `VersionManager` (ISP: read consumers never depend on write/activate surface)
- Cloudflare Queue binding for async cache invalidation retries (optional — graceful fallback to manual dashboard retry)
- Auth gate enforced at the route layer by existing `requireAdmin` middleware; `activatedBy` sourced from session

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+ (LTS), target ES2022  
**Primary Dependencies**: 
- `drizzle-orm` ^0.45.2 — schema, queries, transactions (existing)
- `@libsql/client` ^0.17.3 — Turso/libSQL driver (existing)
- Cloudflare KV (`PROMPT_CACHE_KV` binding, `d60bb9d253194c8a9e761cce22d1f28b`) (existing)
- `node:crypto` — SHA-256 for checksums and variable hashing (existing, used in cache-key.ts)
- Cloudflare Queue (`INVALIDATION_RETRY_QUEUE`) — NEW optional binding for async retry (NFR-006b)

**Storage**: 
- Primary: Turso (libSQL) via Drizzle ORM — existing `prompt_templates` table extended with 5 new columns; new `template_versions` append-only table with `activatedBy` column
- Cache: Cloudflare KV (`PROMPT_CACHE_KV`) — existing binding, key format updated to include semver
- Queue (optional): Cloudflare Queue for offloading retries beyond the request lifetime
- No new database services required

**Testing**: Vitest ^4.1.8 (existing), tests at `tests/unit/*.test.ts` (flat structure). Coverage thresholds: 80% lines, functions, branches, statements.

**Target Platform**: Cloudflare Workers via OpenNext (OpenNext 3.x, deployed via `opennextjs-cloudflare deploy`).

**Project Type**: Web application — Next.js 16 with App Router, React 19, hybrid server/client rendering via Cloudflare Workers

**Performance Goals**:
- Version activation (including synchronous cache invalidation): <5s for all bump types at current scale (~500 keys)
- Cache hit latency: <50ms p99 (KV read)
- Version history query: <2s for 100+ historical versions
- Rollback (within-major): <5s; rollback (cross-major): <10s
- Identity detection (same checksum rejection): <1s

**Constraints**:
- KV `list()` returns max 256 keys per call — must paginate with cursor for deletion operations
- KV `delete()` is per-key — batch deletes require sequential or limited-concurrent calls
- KV free tier: 1,000 read/write/list ops/day — a 500-key subject deletion uses ~502 ops (2 list + 500 delete), well within quota. A 10,000-key deletion (10,040 ops) exceeds quota — SC-004b is gated on KV paid tier upgrade
- Turso/libSQL uses SQLite under the hood: single-writer concurrency, serializable by default
- Turso deployed via Cloudflare Workers: if using embedded replicas, writes route through a single primary region. The 5-second activation budget must include primary round-trip latency for edge-originated transactions, not just local SQLite lock contention
- Cache TTL capped at 30 days by Cloudflare KV
- Template text size: assumed <100KB per spec
- Branded `Slug` type enforces 74-char max. Cache key suffix = `-v{semver}-{hash16}`. With 20-char semver max (FR-001), suffix is 2+20+1+16 = 39 chars worst-case, leaving 35 chars for topicSlug. The existing `buildPromptCacheSlug` computes available space dynamically (`74 - suffix.length`), not via hardcoded constant — no change needed

**Integration Points**:
| Existing Component | How It Changes |
|---|---|
| `src/lib/db/schema.ts` | Add `semver`, `version_major/minor/patch`, `checksum` to `prompt_templates`; add `template_versions` table with `activatedBy` |
| `src/lib/prompts/generator.ts` | `GenerateRequest.templateVersion: number` → `templateSemver: string` |
| `src/lib/prompts/cache-key.ts` | Accept `SemVer` object instead of `number` for cache key construction |
| `src/lib/prompts/caching-decorator.ts` | Pass semver into cache key builder; no other structural change |
| `src/lib/prompts/cache.ts` | Add `deleteVersion(subjectId, semver)` to interface + implementations |
| `src/lib/prompts/repository.ts` | `activateTemplate` accepts `CacheInvalidationStrategy` + `PromptCache` for smart invalidation |
| `src/lib/prompts/engine.ts` | Integrate `VersionReader` + `VersionActivator`; wire invalidation strategy |
| `src/lib/analytics.ts` | Add `trackVersionActivation(event)` with `activatedBy` field |
| Route/middleware layer (existing) | Enforce `requireAdmin` on activate/rollback endpoints (NFR-009); extract `activatedBy` from authenticated session. No plan-level changes needed — reference existing middleware |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` contains placeholder templates only — no concrete principles, gates, or constraints have been defined for this project.

- **No gate violations identified**: The constitution has no enforceable principles or constraints
- **No complexity tracking required**: No architecture/style violations to justify
- **Constitutional guidance**: Industry-standard TypeScript patterns apply: strict type safety, SOLID principles (as specified), interface-based abstractions, testable components, Result type for error handling. The MedPrompt_Engineering_Playbook.md (your de facto architectural reference) is followed explicitly: role-segregated interfaces (ISP), constructor-injected deps (DIP), decorator pattern for cross-cutting concerns
- **Post-design re-check**: No implicit violations found — no circular dependencies, abstractions are clean, ISP-segregated interfaces match the playbook's TemplateReader/TemplateWriter precedent

## Project Structure

### Documentation (this feature)

```text
specs/006-prompt-versioning-caching/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (14 success criteria, 22 FR, 13 NFR)
├── research.md          # Phase 0 output — 7 key decisions with rationale/alternatives
├── data-model.md        # Phase 1 output — 4 entities with attribute tables, indexes, state transitions
├── quickstart.md        # Phase 1 output — developer guide, migration steps, architecture diagram
├── contracts/           # Phase 1 output — 5 interface contracts
│   ├── version-reader.ts
│   ├── version-writer.ts
│   ├── version-activator.ts
│   ├── cache-invalidation-strategy.ts
│   ├── semver.ts
│   └── prompt-cache.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code Layout

```text
src/lib/
├── db/
│   ├── schema.ts                  # prompt_templates: +5 columns; +template_versions (with activatedBy)
│   └── migrations/
│       └── 0002_semver_versioning/  # NEW — Drizzle migration (generated by `drizzle-kit generate`)
├── prompts/
│   ├── cache.ts                   # + deleteVersion() on PromptCache + CloudflarePromptCache + InMemoryCache
│   ├── cache-key.ts               # buildPromptCacheSlug accepts SemVer instead of number
│   ├── caching-decorator.ts       # Passes SemVer to cache key builder
│   ├── repository.ts              # activateTemplate: +strategy param for targeted invalidation
│   ├── engine.ts                  # Integrates VersionReader + VersionActivator
│   ├── generator.ts               # GenerateRequest.templateVersion → templateSemver (string)
│   ├── semver.ts                  # NEW — SemVer value object class
│   ├── version-reader.ts          # NEW — read-only interface + impl (getActive, getHistory)
│   ├── version-writer.ts          # NEW — write-only interface + impl (createVersion)
│   ├── version-activator.ts       # NEW — activation interface + impl (activate, rollback); 
│   │                               #       constructor-injected PromptCache + CacheInvalidationStrategy
│   └── cache-invalidation-strategy.ts  # NEW — interface + SemanticInvalidationStrategy + NoOpStrat
├── types/
│   └── branded.ts                 # (optional) — SemVer class encapsulates its own validation
└── analytics.ts                   # + trackVersionActivation() with activatedBy

tests/unit/
├── semver.test.ts                 # NEW — parse, bump, compare, equals, edge cases
├── version-reader.test.ts         # NEW — getActive, getHistory with mock DB
├── version-writer.test.ts         # NEW — createVersion validation, checksum, duplicate detection
├── version-activator.test.ts      # NEW — activate atomicity, rollback restoration, concurrency conflict
├── cache-invalidation-strategy.test.ts  # NEW — scope for all 6 bump/rollback transitions
├── cache-key.test.ts              # EXISTING — update for SemVer parameter
└── caching-decorator.test.ts      # EXISTING — update GenerateRequest shape

scripts/
└── migrate-versions.ts            # NEW — idempotent backfill of existing integer versions to semver

workers/
└── invalidation-retry.ts          # NEW — Queue consumer for async invalidation retries (optional, Phase 8)
```

**Structure Decision**: Single-project web application (existing Next.js structure). All new code integrates into `src/lib/prompts/` following the existing decorator pattern. The Queue consumer lives in a new `workers/` directory, external to the Next.js app (deployed as a separate Worker binding the same KV namespace). Database changes go into `src/lib/db/schema.ts` with a new Drizzle migration. No new frontend code.

## Implementation Phases

### Phase 1: Foundation — SemVer Value Object (no dependencies)

**Goal**: Create the `SemVer` class with full validation, comparison, and bump logic. Independent of database and cache.

**Files**:
- `src/lib/prompts/semver.ts` (NEW)
- `tests/unit/semver.test.ts` (NEW)

**Implementation details**:
```
class SemVer:
  - private constructor(major, minor, patch)
  - static parse(s: string): Result<SemVer, ValidationError>
      Rules: /^\d+\.\d+\.\d+$/, each component < 100000, no leading zeros
  - static unsafeParse(major, minor, patch): SemVer  (for tests)
  - toString(): string → "${major}.${minor}.${patch}"
  - bump(type): SemVer  → patch: +1 patch; minor: +1 minor, patch=0; major: +1 major, minor=0, patch=0
  - compare(other): -1 | 0 | 1  → numeric comparison major→minor→patch
  - bumpType(other): 'major'|'minor'|'patch'|'none'  → classify difference
  - equals(other): boolean
```

**Test coverage**:
- Valid parse: "1.0.0", "0.0.1", "999.999.999"
- Invalid parse: "1.0", "1.0.0.0", "01.0.0", "a.b.c", empty string
- Bump: patch→increment patch; minor→increment minor, reset patch; major→increment major, reset minor/patch
- Compare: -1 for newer, 0 for same, 1 for older
- BumpType: detects all 4 classifications correctly
- Immutability: bump returns new instance, original unchanged
- Equals / toString consistency

**Cross-cutting**: No integration with other components needed — fully unit testable.

---

### Phase 2: Contracts — Role-Segregated Interfaces + Strategy (depends on Phase 1)

**Goal**: Define all interfaces (ISP-segregated) and the invalidation strategy. No database or cache code yet — pure abstraction layer. Follows the MedPrompt_Engineering_Playbook precedent of splitting TemplateRepository into role-based interfaces.

**Files**:
- `src/lib/prompts/version-reader.ts` (NEW)
- `src/lib/prompts/version-writer.ts` (NEW)
- `src/lib/prompts/version-activator.ts` (NEW)
- `src/lib/prompts/cache-invalidation-strategy.ts` (NEW)
- `src/lib/prompts/cache.ts` (MODIFY — add `deleteVersion`)
- `src/lib/prompts/generator.ts` (MODIFY — rename `templateVersion` → `templateSemver`)
- `tests/unit/cache-invalidation-strategy.test.ts` (NEW)

**Interface definitions** (matching playbook precedent):

```typescript
// version-reader.ts — read-only, used by prompt-rendering page and audit dashboard
interface VersionReader {
  getActive(db: Database, subjectId: SubjectId): Promise<PromptTemplate | null>;
  getHistory(db: Database, subjectId: SubjectId): Promise<TemplateVersion[]>;
}

// version-writer.ts — write-only, used by admin template editor
interface VersionWriter {
  createVersion(db: Database, input: CreateTemplateInput): Promise<Result<PromptTemplate, ValidationError>>;
}

// version-activator.ts — activation/rollback, highest risk, infra dependencies injected
interface VersionActivator {
  activate(templateId: string, activatedBy: string): Promise<ActivationResult>;
  rollback(subjectId: SubjectId, targetSemver: SemVer, activatedBy: string): Promise<ActivationResult>;
}
```

**VersionActivator DIP — constructor injection matching PromptEngineDeps pattern**:
```typescript
class DatabaseVersionActivator implements VersionActivator {
  constructor(
    private readonly db: Database,
    private readonly cache: PromptCache,
    private readonly strategy: CacheInvalidationStrategy
  ) {}

  async activate(templateId: string, activatedBy: string): Promise<ActivationResult> { ... }
  async rollback(...): Promise<ActivationResult> { ... }
}
```

This way:
- `VersionReader` consumers (prompt page, audit page) never depend on cache or strategy types
- `VersionWriter` consumers never depend on cache, strategy, or read surfaces
- `VersionActivator` consumers receive a fully-wired instance; they don't construct or pass cache/strategy

**CacheInvalidationStrategy** (strategy pattern, same as existing `ValidationStrategy`):
```typescript
enum InvalidationScope { NONE, VERSION, SUBJECT }

interface CacheInvalidationStrategy {
  scope(current: SemVer, next: SemVer): InvalidationScope;
  readonly name: string;
}

class SemanticInvalidationStrategy implements CacheInvalidationStrategy {
  name = 'semantic-scoping';
  scope(current, next) {
    switch(current.bumpType(next)) {
      case 'patch': return NONE;
      case 'minor': return VERSION;
      case 'major': return SUBJECT;
      case 'none':  return NONE;
    }
  }
}
```

**PromptCache extension**:
- `deleteVersion(subjectId, semver)`: KV prefix `prompt:{subjectId}:*-v{semver.major}.{semver.minor}.` + paginated delete
- `createInMemoryCache()`: Map-based prefix matching for tests

**GenerateRequest change**:
- `templateVersion: number` → `templateSemver: string`

**Test coverage for invalidation strategy**:
- Patch bump (v1.0.0 → v1.0.1): scope = NONE
- Minor bump (v1.0.0 → v1.1.0): scope = VERSION
- Major bump (v1.0.0 → v2.0.0): scope = SUBJECT
- Identity (v1.0.0 → v1.0.0): scope = NONE (detected later by VersionActivator)
- Rollback within major (v2.1.0 → v2.0.0): scope = VERSION
- Cross-major rollback (v2.0.0 → v1.3.2): scope = SUBJECT

---

### Phase 3: Data Layer — Schema Migration + Repository (depends on Phase 2)

**Goal**: Database changes — extend `prompt_templates`, create `template_versions` with `activatedBy`, update `activateTemplate`.

**Files**:
- `src/lib/db/schema.ts` (MODIFY)
- `src/lib/prompts/repository.ts` (MODIFY)
- `scripts/migrate-versions.ts` (NEW)

**Schema changes to `src/lib/db/schema.ts`**:

Add to `promptTemplates`:
```typescript
semver: text('semver').notNull().default('1.0.0'),
versionMajor: integer('version_major').notNull().default(1),
versionMinor: integer('version_minor').notNull().default(0),
versionPatch: integer('version_patch').notNull().default(0),
checksum: text('checksum').notNull().default(''),
```

Keep existing `version: integer` — dual-written during migration, removed in a future migration.

New `templateVersions` table:
```typescript
export const templateVersions = sqliteTable('template_versions', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => promptTemplates.id),
  semver: text('semver').notNull(),
  template: text('template').notNull(),
  checksum: text('checksum').notNull(),
  changelog: text('changelog'),
  parentSemver: text('parent_semver'),
  activatedBy: text('activated_by').notNull(), // ← satisfies User Story 4 audit requirement
  activatedAt: integer('activated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deactivatedAt: integer('deactivated_at', { mode: 'timestamp' }),
}, (table) => ({
  historyIdx: index('version_history_idx').on(table.templateId, table.activatedAt),
}));
```

**Migration script** (`scripts/migrate-versions.ts`) — idempotent:
```typescript
import { createHash } from 'node:crypto';
import { db } from '../src/lib/db/client';
import { promptTemplates, templateVersions } from '../src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function migrateVersions() {
  const templates = await db.select().from(promptTemplates);
  
  for (const t of templates) {
    // Idempotency guard: skip if this template already has a semver !== default
    if (t.semver && t.semver !== '1.0.0') continue; // already migrated
    
    const semver = `${t.version}.0.0`;
    const checksum = createHash('sha256').update(t.template).digest('hex');
    
    // Single atomic update per template (runs inside implicit transaction)
    await db.transaction(async (tx) => {
      await tx.update(promptTemplates)
        .set({ semver, versionMajor: t.version, versionMinor: 0, versionPatch: 0, checksum })
        .where(eq(promptTemplates.id, t.id));
      
      // Only insert history if no record exists for this activation
      const existing = await tx.select()
        .from(templateVersions)
        .where(
          sql`${templateVersions.templateId} = ${t.id} AND ${templateVersions.semver} = ${semver}`
        )
        .limit(1);
      
      if (existing.length === 0) {
        await tx.insert(templateVersions).values({
          id: crypto.randomUUID(),
          templateId: t.id,
          semver,
          template: t.template,
          checksum,
          changelog: t.changelog,
          parentSemver: null,
          activatedBy: 'system:migration', // audit trail identifies migration-originated records
          activatedAt: t.createdAt,
          deactivatedAt: t.isActive ? null : new Date(),
        });
      }
    });
  }
}
```

**Error handling**: `activatedBy` is a required non-null field. Every activation and rollback must provide it, sourced from the authenticated session at the route layer.

**Updated `repository.ts` — `activateTemplate`**:
```typescript
export async function activateTemplate(
  db: Database,
  cache: PromptCache | null,
  strategy: CacheInvalidationStrategy,
  templateId: string,
  activatedBy: string  // NEW — satisfies audit trail
): Promise<Result<void, ActivationError>> {
  return await db.transaction(async (tx) => {
    // 1. Load target template, verify exists
    // 2. Load current active template for the same subject
    // 3. Compute bump type via SemVer comparison
    // 4. Identity check: same semver + same checksum → reject
    // 5. Deactivate all, activate target
    // 6. Insert version history record with activatedBy
    // 7. Commit transaction
  });
  // After transaction:
  // 8. Determine invalidation scope via strategy
  // 9. Execute cache invalidation (sync retry ×3, then async enqueue or log)
  // 10. Log telemetry event with activatedBy
}
```

---

### Phase 4: Orchestration — Reader, Writer, Activator (depends on Phases 1-3)

**Goal**: Implement `VersionReader`, `VersionWriter`, and `VersionActivator` as separate classes with constructor injection.

**Files**:
- `src/lib/prompts/version-reader.ts` (NEW — impl alongside interface)
- `src/lib/prompts/version-writer.ts` (NEW — impl alongside interface)
- `src/lib/prompts/version-activator.ts` (NEW — impl alongside interface)
- `tests/unit/version-reader.test.ts` (NEW)
- `tests/unit/version-writer.test.ts` (NEW)
- `tests/unit/version-activator.test.ts` (NEW)

**`DatabaseVersionReader`**:
```typescript
class DatabaseVersionReader implements VersionReader {
  constructor(private readonly db: Database) {}
  // ↑ constructor takes only what it needs — no cache, no strategy, no write surface

  async getActive(subjectId): Promise<PromptTemplate | null> {
    return this.db.query.promptTemplates.findFirst({
      where: and(eq(promptTemplates.subjectId, subjectId), eq(promptTemplates.isActive, true)),
    });
  }

  async getHistory(subjectId): Promise<TemplateVersion[]> {
    return this.db.query.templateVersions.findMany({
      where: eq(templateVersions.subjectId, subjectId),
      orderBy: [desc(templateVersions.activatedAt)],
    });
  }
}
```

**`DatabaseVersionWriter`**:
```typescript
class DatabaseVersionWriter implements VersionWriter {
  constructor(private readonly db: Database) {}

  async createVersion(input): Promise<Result<PromptTemplate, ValidationError>> {
    // 1. SemVer.parse(input.semver)
    // 2. Compute SHA-256 checksum
    // 3. Check identity against current active
    // 4. Insert into prompt_templates (isActive: false)
    // 5. Return created template
  }
}
```

**`DatabaseVersionActivator`**:
```typescript
class DatabaseVersionActivator implements VersionActivator {
  constructor(
    private readonly db: Database,
    private readonly cache: PromptCache,
    private readonly strategy: CacheInvalidationStrategy
  ) {}
  // ↑ DIP: infrastructure dependencies injected, not constructed internally.
  //    Matches PromptEngineDeps constructor-injection pattern.

  async activate(templateId, activatedBy): Promise<ActivationResult> {
    // Delegates to repository.ts activateTemplate with cache+strategy+activatedBy
  }

  async rollback(subjectId, targetSemver, activatedBy): Promise<ActivationResult> {
    // Full rollback logic: find target, restore, invalidate cache
  }
}
```

**Test coverage for activator**:
- Successful activation returns success, DB has new active record
- Identity detection rejects same semver + same checksum
- Concurrent activation (two simultaneous calls for same subject) — exactly one succeeds
- Rollback restores exact template content verified by checksum
- Cache invalidation delegates to strategy correctly (mock strategy → verify scope call)
- `activatedBy` propagates into history record

---

### Phase 5: Integration — Engine + Decorator Updates (depends on Phases 1-4)

**Goal**: Wire everything into the existing prompt generation pipeline. Update `cache-key.ts`, `caching-decorator.ts`, and `engine.ts`.

**Files**:
- `src/lib/prompts/cache-key.ts` (MODIFY)
- `src/lib/prompts/caching-decorator.ts` (MODIFY)
- `src/lib/prompts/engine.ts` (MODIFY)
- `src/lib/analytics.ts` (MODIFY)

**`cache-key.ts` changes**:
```typescript
// Before:
export function buildPromptCacheSlug(input: {
  topicSlug: Slug;
  templateVersion: number;
  variables: Record<string, string>;
}): Result<Slug, Error> { ... }

// After:
export function buildPromptCacheSlug(input: {
  topicSlug: Slug;
  semver: SemVer;
  variables: Record<string, string>;
}): Result<Slug, Error> {
  // Key format: {truncatedSlug}-v{major}.{minor}.{patch}-{hash16}
  // Suffix length varies with semver string length (max ~39 chars for 20-char semver)
  // Available space computed dynamically: 74 - suffix.length (existing pattern)
}
```

**`caching-decorator.ts` changes**:
```typescript
// In generate():
const semverResult = SemVer.parse(request.templateSemver);
if (!semverResult.ok) return err({ code: 'CACHE_KEY_FAILED', details: 'Invalid semver in request' });
const cacheKeyResult = buildPromptCacheSlug({
  topicSlug: request.topicSlug,
  semver: semverResult.value,
  variables: request.variables,
});
```

**`engine.ts` — PromptEngine changes**:
```typescript
class PromptEngine {
  constructor(
    private db: Database,
    private promptCache: PromptCache,
    private pipeline: TopicNormalizationPipeline,
    private analytics: Analytics,
    // NEW:
    private versionReader: VersionReader,       // for getActive
    private versionWriter: VersionWriter,       // for createVersion
    private versionActivator: VersionActivator, // for activate/rollback
  ) { ... }
}
```

**Analytics update**:
```typescript
interface Analytics {
  trackVersionActivation(event: {
    subjectId: SubjectId;
    oldSemver: string;
    newSemver: string;
    bumpType: 'patch' | 'minor' | 'major';
    invalidationScope: 'NONE' | 'VERSION' | 'SUBJECT';
    durationMs: number;
    success: boolean;
    activatedBy: string;  // NEW — satisfies User Story 4 telemetry requirement
  }): void;
}
```

---

### Phase 6: Migration & Backfill (depends on Phase 3)

**Goal**: Run the migration script to convert existing integer versions to semver. Deploy database migration.

**Steps**:
1. Run `pnpm db:generate` to create migration file (detects schema changes automatically)
2. Review generated migration SQL — verify columns added, table created, indexes correct
3. Run `pnpm db:push` to apply to local dev database
4. Run `npx tsx scripts/migrate-versions.ts` to backfill existing templates (idempotent — safe to rerun)
5. Verify with `pnpm test:unit`
6. Deploy to staging — run migration there
7. Verify cache entries still serve with old keys (backward compat: old `-t{n}-{hash}` keys coexist with new `-v{semver}-{hash}` keys)
8. Deploy to production — run migration, then deploy code

**Backward compatibility**: Old cache entries `prompt:{subject}:{slug}-t1-{hash}` remain valid for their TTL. New entries use `prompt:{subject}:{slug}-v1.0.0-{hash}`. Both formats coexist; old keys expire naturally. No forced cutover.

---

### Phase 7: Observability & Testing (parallel with Phases 4-6)

**Goal**: Add telemetry, verify all success criteria, run full test suite.

**Telemetry implementation**:
```typescript
// After activation in VersionActivator:
this.analytics.trackVersionActivation({
  subjectId,
  oldSemver: current.semver,
  newSemver: template.semver,
  bumpType: /* from strategy */,
  invalidationScope: /* from strategy */,
  durationMs,
  success: true,
  activatedBy, // sourced from authenticated session at the route layer
});
```

**Template drift detection**:
Add a simple scheduled check (Cron Trigger, once daily) that queries all active templates, recomputes their checksums, and flags any mismatch against the stored `checksum` column. This covers the out-of-band edit scenario that FR-004's activation-time check cannot catch.

```
workers/template-drift-checker.ts — NEW
  Cron: 0 6 * * * (daily, 06:00 UTC)
  Action: SELECT id, checksum FROM prompt_templates WHERE isActive = true
          For each: SHA-256(stored template) !== stored checksum → emit alert event
```

This worker is small (~30 lines), has no external dependencies beyond the DB, and satisfies the "template drift" alert in the spec's Alert Thresholds table.

---

### Phase 8: Queue-Backed Async Retry (OPTIONAL — depends on Phase 4)

**Goal**: If Cloudflare Queue binding is provisioned, add async retry for cache invalidation failures.

**Files**:
- `workers/invalidation-retry.ts` (NEW — Queue consumer)

**Queue consumer**:
```typescript
// Triggered when synchronous retries (3× with backoff, ~21s total) are exhausted
// Queue: INVALIDATION_RETRY_QUEUE
// Max retries: 3, with 60s/300s/900s delays (Queue-managed)
export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const { subjectId, semver, scope } = msg.body;
      const kv = env.PROMPT_CACHE_KV;
      
      // Attempt invalidation again
      try {
        if (scope === 'VERSION') {
          await deleteVersionFromKV(kv, subjectId, SemVer.parse(semver));
        } else {
          await deleteSubjectFromKV(kv, subjectId);
        }
        msg.ack(); // success
      } catch (e) {
        msg.retry({ delaySeconds: 60 }); // queue will retry
      }
    }
  }
}
```

If the Queue binding is NOT provisioned, the synchronous retry path is used alone, and failed invalidations appear in the dashboard for manual retry (as specified in the spec's operator dashboard requirements).

---

## Dependency Graph

```
Phase 1: SemVer class
  └── No dependencies

Phase 2: Interfaces + Strategy
  └── Depends on: Phase 1 (SemVer for comparison)

Phase 3: Data Layer
  └── Depends on: Phase 2 (interfaces for repository types)

Phase 4: Reader, Writer, Activator
  └── Depends on: Phase 1 (SemVer), Phase 2 (interfaces), Phase 3 (data layer)

Phase 5: Engine Integration
  └── Depends on: Phase 4 (all three role interfaces wired in)

Phase 6: Migration
  └── Depends on: Phase 3 (schema changes applied)

Phase 7: Observability
  └── Depends on: Phase 4 (activator telemetry), Phase 5 (engine integration)
  └── Parallel: Cron trigger for template drift (independent of other phases)

Phase 8: Queue-backed retry (optional)
  └── Depends on: Phase 4 (activator's retry logic)
  └── Blocked on: Cloudflare Queue binding being provisioned

Execution order: P1 → P2 → P3 → (P4 + P6 + P7 partial) → P5 → P7 complete → P8
```

## Testing Strategy

### Unit Tests (Phase-specific)

| Test File | Phase | What It Covers |
|-----------|-------|----------------|
| `tests/unit/semver.test.ts` | P1 | Parse (valid/invalid), bump, compare, bumpType, equals, immutability, toString |
| `tests/unit/cache-invalidation-strategy.test.ts` | P2 | All 6 bump/rollback scenarios return correct scope |
| `tests/unit/version-reader.test.ts` | P4 | getActive returns correct template; getHistory orders by date desc; handles empty subject |
| `tests/unit/version-writer.test.ts` | P4 | createVersion validates semver, computes checksum, detects identity, rejects invalid input |
| `tests/unit/version-activator.test.ts` | P4 | activate atomicity, rollback restoration, concurrent conflict rejection, activatedBy propagation, cache invalidation delegation |

### Integration Tests

| Test | What It Covers |
|------|----------------|
| Schema migration | Drizzle generates valid SQL for new columns and table |
| Backfill script (idempotent) | Running twice produces the same state — guard prevents duplicate `template_versions` rows |
| Full activation flow | DB transaction + synchronous cache invalidation + telemetry |

### Existing Tests to Update

| Existing Test | Change Required |
|---------------|-----------------|
| `tests/unit/cache-key.test.ts` | `templateVersion: number` → `semver: SemVer.unsafeParse(...)` |
| `tests/unit/caching-decorator.test.ts` | `GenerateRequest` uses `templateSemver` string |

### Test Doubles

| Double | Purpose |
|--------|---------|
| `NoOpInvalidationStrategy` | Always returns NONE — for testing activation without cache side effects |
| `createInMemoryCache()` | Extend with `deleteVersion()` doing Map prefix matching |
| `MockDatabase` | For testing Reader/Writer/Activator without real Turso |
| `FakeAnalytics` | Captures emitted events for assertion |

## Risk Mitigation (Implementation-Level)

| Risk | Detection | Mitigation |
|------|-----------|------------|
| KV `deleteVersion()` too slow at current scale (~500 keys) | Duration metric >2s | Bounded concurrent deletes (batch 50 via `Promise.allSettled`); worst case: TTL handles it |
| KV free tier quota exceeded on major bump | SC-004a metric track | At 500 keys, a major bump uses ~502 ops (2 list + 500 delete) — fits in 1,000/day quota. SC-004b (10k keys) explicitly gated on paid tier upgrade |
| Drizzle migration conflicts with existing nullable columns | Migration dry-run fails | All new columns have defaults; run on staging first |
| SemVer parse rejects existing seeded versions | Migration script error | `unsafeParse()` bypass for migration; validate all existing versions in dry-run |
| Activation transaction timeout on edge-originated writes | SQLITE_BUSY at 5s | Keep transaction under 10 queries (<100ms); retry once on timeout; if using Turso embedded replicas, add 200ms buffer for primary region round-trip |
| Backfill script double-inserts `template_versions` rows | Duplicate history entries | Idempotency guard: skip if semver !== default '1.0.0' before processing; per-template transaction with existence check |
| Template drift alert with no data source | Missing dashboard widget | Phase 7 adds a Cron Trigger worker that daily recomputes and compares checksums |

## Auth Enforcement

NFR-009 requires admin-authenticated sessions for `activate` and `rollback`. This is enforced by **existing middleware** at the route layer — no new plan work required. The `activatedBy` value is extracted from the authenticated session and passed through to `VersionActivator.activate()` and `.rollback()` as a required parameter. The plan's integration and testing phases verify that `activatedBy` propagates correctly into the `template_versions` history record and the telemetry event.

**Route guard pseudocode** (existing, not new):
```typescript
// POST /api/admin/templates/:id/activate
adminRouter.post('/:id/activate', requireAdmin, async (req, res) => {
  const activatedBy = req.session.user.id; // from existing auth middleware
  await versionActivator.activate(req.params.id, activatedBy);
});
```

## Complexity Tracking

Not required — Constitution Check passed with no violations. All abstractions (SemVer, CacheInvalidationStrategy, PromptCache, VersionReader, VersionWriter, VersionActivator) are justified by ISP and directly map to independently testable units with distinct consumer surfaces.

---

## v4 Addendum: Identified Gaps and Corrections

The following gaps were identified during a systematic cross-document comparison of v3 against the spec, contracts, data-model, and existing codebase. Each gap includes the fix.

### Gap 1 — `templateVersions.subjectId` does not exist (needs JOIN)

**Location**: Phase 4, `DatabaseVersionReader.getHistory` and rollback.

**Problem**: `template_versions` has `template_id` (FK to `prompt_templates.id`), not `subject_id`. Directly querying by `subjectId` is impossible without a JOIN.

**Fix — `getHistory`**:
```typescript
class DatabaseVersionReader implements VersionReader {
  // ... getActive unchanged ...

  async getHistory(subjectId: SubjectId): Promise<TemplateVersion[]> {
    const rows = await this.db.select()
      .from(templateVersions)
      .innerJoin(promptTemplates, eq(templateVersions.templateId, promptTemplates.id))
      .where(eq(promptTemplates.subjectId, subjectId))
      .orderBy(desc(templateVersions.activatedAt));
    return rows.map(r => r.template_versions);
  }
}
```

**Fix — rollback checksum query** (in `DatabaseVersionActivator.rollback`):
```typescript
// To find the target history record for rollback, MUST join through promptTemplates:
const [historyRecord] = await this.db.select()
  .from(templateVersions)
  .innerJoin(promptTemplates, eq(templateVersions.templateId, promptTemplates.id))
  .where(
    and(
      eq(promptTemplates.subjectId, subjectId),
      eq(templateVersions.semver, targetSemver.toString())
    )
  )
  .limit(1);
```

---

### Gap 2 — `deleteVersion`/`deleteSubject` return `Promise<void>` but invalidate needs key count

**Location**: Phase 2 contract `prompt-cache.ts` and Phase 4 `DatabaseVersionActivator.invalidate()`.

**Problem**: The activators `invalidate()` method captures `deletedCount` from cache operations, but both `PromptCache.deleteVersion` and `deleteSubject` return `Promise<void>` — the count is typed away.

**Fix — update contract + implementations to return `Promise<number>`**:

```typescript
// contracts/prompt-cache.ts:
export interface PromptCache {
  get(subjectId: SubjectId, slug: Slug): Promise<string | null>;
  set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void>;
  deleteSubject(subjectId: SubjectId): Promise<number>;
  deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<number>;
}

// CloudflarePromptCache implementation:
async deleteSubject(subjectId: SubjectId): Promise<number> {
  let deletedCount = 0;
  try {
    const prefix = `prompt:${subjectId}:`;
    let list = await this.kv.list({ prefix });
    while (true) {
      const deleteBatch = list.keys.map(k => this.kv.delete(k.name));
      const results = await Promise.allSettled(deleteBatch);
      deletedCount += results.filter(r => r.status === 'fulfilled').length;
      if (list.list_complete) break;
      list = await this.kv.list({ prefix, cursor: list.cursor });
    }
  } catch { /* never throw */ }
  return deletedCount;
}

async deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<number> {
  let deletedCount = 0;
  try {
    const prefix = `prompt:${subjectId}:`;
    const versionMarker = `-v${semver.major}.${semver.minor}.`;
    let cursor: string | undefined;
    do {
      const list = await this.kv.list({ prefix, cursor });
      const versionKeys = list.keys.filter(k => k.name.includes(versionMarker));
      const deleteBatch = versionKeys.map(k => this.kv.delete(k.name));
      const results = await Promise.allSettled(deleteBatch);
      deletedCount += results.filter(r => r.status === 'fulfilled').length;
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
  } catch { /* never throw */ }
  return deletedCount;
}

// createInMemoryCache update:
{
  async deleteSubject(subjectId) {
    const prefix = `prompt:${subjectId}:`;
    let count = 0;
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) { store.delete(key); count++; }
    }
    return count;
  },
  async deleteVersion(subjectId, semver) {
    const versionMarker = `-v${semver.major}.${semver.minor}.`;
    let count = 0;
    for (const key of store.keys()) {
      if (key.startsWith(`prompt:${subjectId}:`) && key.includes(versionMarker)) {
        store.delete(key); count++;
      }
    }
    return count;
  },
}
```

---

### Gap 3 — `ConcurrentActivationError` never defined

**Location**: Phase 4, `DatabaseVersionActivator.activate()` transaction.

**Problem**: `throw new ConcurrentActivationError(target.subjectId)` references a class that does not exist.

**Fix — add definition** (top of `version-activator.ts`):
```typescript
export class ConcurrentActivationError extends Error {
  constructor(public readonly subjectId: string) {
    super(`Concurrent activation detected for subject ${subjectId}`);
    this.name = 'ConcurrentActivationError';
  }
}
```

---

### Gap 4 — `sleep()` utility never defined

**Location**: Phase 4, `DatabaseVersionActivator.invalidate()` retry loop and `KvSoftLock.awaitResult()`.

**Problem**: `await sleep(150 + Math.random() * 100)` is called without any `sleep` function being defined or imported.

**Fix — add utility** (e.g., in `version-activator.ts` or a shared `src/lib/prompts/utils.ts`):
```typescript
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
```

Add at module level. This is a simple wrapper around `setTimeout` — available in Workers via the Web API and in Node.js via `timers`.

---

### Gap 5 — `enqueueOrLog()` method referenced but never defined

**Location**: Phase 4, `DatabaseVersionActivator.invalidate()`.

**Problem**: The async off-ramp calls `this.enqueueOrLog()` which has no definition in the plan.

**Fix — define method on `DatabaseVersionActivator`**:
```typescript
private enqueueOrLog(
  scope: InvalidationScope,
  subjectId: SubjectId,
  deletedCount: number,
  error: unknown
): void {
  const remaining = `see previous error`; // detailed count available from caller
  console.error(
    JSON.stringify({
      event: 'cache.invalidation_failed',
      scope,
      subjectId,
      deletedCount,
      error: String(error),
    })
  );
  // If Queue binding is available via env:
  // await env.INVALIDATION_RETRY_QUEUE.send({ subjectId, semver, scope });
  // Otherwise, rely on dashboard manual retry (logged above).
}
```

---

### Gap 6 — `trackVersionActivation` missing from `plausibleAnalytics` and `noopAnalytics`

**Location**: Phase 5, `src/lib/analytics.ts` interface update shown but concrete implementations omitted.

**Problem**: The plan shows the Analytics interface change but not the `plausibleAnalytics` and `noopAnalytics` object implementations.

**Fix — add to Phase 5**:
```typescript
// src/lib/analytics.ts — add to plausibleAnalytics:
export const plausibleAnalytics: Analytics = {
  // ... existing methods ...

  trackVersionActivation(event: {
    subjectId: SubjectId;
    oldSemver: string;
    newSemver: string;
    bumpType: string;
    invalidationScope: string;
    durationMs: number;
    success: boolean;
    activatedBy: string;
  }): void {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Version Activated', { props: event });
    }
  },
};

// add to noopAnalytics:
export const noopAnalytics: Analytics = {
  // ... existing methods ...
  trackVersionActivation() {},
};
```

---

### Gap 7 — `trackVersionActivation` not error-guarded (can crash activation post-commit)

**Location**: Phase 4, `DatabaseVersionActivator.activate()` telemetry call.

**Problem**: The telemetry call runs after the DB transaction commits. If `analytics.trackVersionActivation()` throws, the activation appears to fail even though the DB already committed. This is a "poisoned success" scenario.

**Fix — wrap in try/catch**:
```typescript
// After DB commit, before return:
try {
  this.analytics.trackVersionActivation({ ... });
} catch (analyticsError) {
  // Log but never fail — DB already committed (NFR-005)
  console.error('Analytics event failed:', analyticsError);
}
```

---

### Gap 8 — Rollback insert missing `versionMajor/minor/patch`

**Location**: Phase 4, `DatabaseVersionActivator.rollback()` — creating new `promptTemplates` row from history.

**Problem**: The rollback creates `{ semver, template, checksum, changelog, ... }` but does not parse the semver to populate `versionMajor`, `versionMinor`, `versionPatch` — all `NOT NULL` columns.

**Fix — parse semver when building the new row**:
```typescript
const semverParsed = SemVer.parse(semver);
if (!semverParsed.ok) {
  return err({ code: 'INVALID_SEMVER', message: `Corrupted version in history: ${semver}` });
}
const { major, minor, patch } = semverParsed.value;

await tx.insert(promptTemplates).values({
  id: crypto.randomUUID(),
  subjectId,
  template: historyRecord.template,
  version: 0,                                    // deprecated column, dual-written
  semver,
  versionMajor: major,                           // ← was missing
  versionMinor: minor,                           // ← was missing
  versionPatch: patch,                           // ← was missing
  checksum: historyRecord.checksum ?? '',
  isActive: true,
  changelog: historyRecord.changelog,
  isInteractive: /* restored from rollback logic */,
  requiredVariables: /* restored from rollback logic */,
  createdAt: new Date(),
});
```

---

### Gap 9 — `isNull` import missing from Drizzle ORM import list

**Location**: Phase 4, `DatabaseVersionActivator.activate()` transaction uses `isNull(templateVersions.deactivatedAt)`.

**Problem**: Drizzle's `isNull` is imported from `drizzle-orm` but not shown in the activator's imports.

**Fix — add to imports**:
```typescript
import { and, eq, desc, isNull } from 'drizzle-orm';
```

---

### Gap 10 — Queue consumer uses undefined helper functions

**Location**: Phase 8, `workers/invalidation-retry.ts`.

**Problem**: The consumer calls `deleteVersionFromKV(kv, ...)` and `deleteSubjectFromKV(kv, ...)` — neither function is defined. Also passes `SemVer.parse(semver)` but the message body contains a string, not a SemVer object.

**Fix — define helper functions and use proper parsing**:
```typescript
// workers/invalidation-retry.ts
import { SemVer } from '../src/lib/prompts/semver';

async function deleteVersionFromKV(
  kv: KVNamespace,
  subjectId: string,
  semver: string
): Promise<number> {
  const prefix = `prompt:${subjectId}:`;
  const versionMarker = `-v${semver.split('.').slice(0, 2).join('.')}.`;
  let deletedCount = 0;
  let cursor: string | undefined;
  do {
    const list = await kv.list({ prefix, cursor });
    const toDelete = list.keys.filter(k => k.name.includes(versionMarker));
    await Promise.allSettled(toDelete.map(k => kv.delete(k.name)));
    deletedCount += toDelete.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return deletedCount;
}

async function deleteSubjectFromKV(
  kv: KVNamespace,
  subjectId: string
): Promise<number> {
  const prefix = `prompt:${subjectId}:`;
  let deletedCount = 0;
  let cursor: string | undefined;
  do {
    const list = await kv.list({ prefix, cursor });
    await Promise.allSettled(list.keys.map(k => kv.delete(k.name)));
    deletedCount += list.keys.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return deletedCount;
}

export default {
  async queue(batch: MessageBatch<{ subjectId: string; semver: string; scope: string }>, env: Env) {
    for (const msg of batch.messages) {
      const { subjectId, semver, scope } = msg.body;
      try {
        const deleted = scope === 'SUBJECT'
          ? await deleteSubjectFromKV(env.PROMPT_CACHE_KV, subjectId)
          : await deleteVersionFromKV(env.PROMPT_CACHE_KV, subjectId, semver);
        console.log(`Queue invalidation succeeded: subject=${subjectId}, scope=${scope}, deleted=${deleted}`);
        msg.ack();
      } catch (e) {
        console.error(`Queue invalidation failed (will retry): subject=${subjectId}, error=${e}`);
        msg.retry({ delaySeconds: 60 });
      }
    }
  },
};
```

---

### Gap 11 — `lock:` prefix not documented as safe in shared KV namespace

**Location**: Phase 4, `KvSoftLock` uses `lock:${key}` in the same KV namespace as cache entries (`prompt:${subjectId}:${slug}`).

**Problem**: Not explicitly stated that `lock:` prefix does not collide with `prompt:` prefix. Low risk but the plan should document this.

**Fix — add documentation note in Phase 4**:
```
Note: The lock uses `lock:${cacheKey}` as its KV key. Cache entries use `prompt:${subjectId}:${slug}`. 
The `lock:` prefix is distinct from `prompt:`, so there is zero collision risk in the shared KV namespace.
```

---

### Gap 12 — Metric name `cache.stampede_detected` vs spec `cache_stampede_events_total`

**Location**: Phase 4, stampede metric name used in wire code. The spec lists `cache_stampede_events_total` (underscore convention in table at spec:452).

**Problem**: Inconsistency between plan conventions and spec conventions. The spec uses underscores for metric names (`version_activations_total`, `cache_hits_total`). The plan uses dots (`cache.stampede_detected`).

**Fix — align with spec's underscore convention**:
- `cache.stampede_detected` → `cache_stampede_detected`
- All spec counters use `{noun}_{action}_total` pattern; matched by the plan already everywhere except this one event name.

---

### Gap 13 — `crypto.randomUUID()` source not clarified for Worker vs Node.js contexts

**Location**: Phase 3 migration script (node: `crypto.randomUUID()`) and Phase 4 activator (Worker: same).

**Problem**: In Cloudflare Workers, `crypto.randomUUID()` is available via the global `crypto` (Web Crypto API) with `nodejs_compat` flag. In Node.js, it needs explicit import. The plan should clarify which import path to use where.

**Fix — add import notes**:
```
Migration script (Node.js, runs via tsx):
  import { randomUUID } from 'node:crypto';

Worker code (runs in Cloudflare Workers with nodejs_compat):
  const id = crypto.randomUUID();  // global crypto, no import needed
```

---

### Gap 14 — Concurrent delete batching in `CloudflarePromptCache` not bounded

**Location**: Phase 4, `CloudflarePromptCache.deleteSubject()` and `deleteVersion()`.

**Problem**: At scale (10k+ keys per SC-004b), `Promise.allSettled()` over 10,000 deletes in a single list page could overwhelm the event loop. The spec says "batch deletes in pages of 1000" but the delete operations are per-key.

**Fix — batch deletes within each list page** (already bounded by KV `list()` returning at most 1,000 keys per page, which is safe for `Promise.allSettled`). Documented in Constraints already (line 52: "KV `delete()` is per-key — batch deletes require sequential or limited-concurrent calls"). **No code change needed** — the 1,000-key page size is the natural concurrency limit. Add a comment to the implementation:
```
// KV list() returns at most 1,000 keys per page. Concurrent deletes bounded by page size.
const results = await Promise.allSettled(list.keys.map(k => this.kv.delete(k.name)));
```
