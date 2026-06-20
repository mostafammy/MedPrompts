# Quickstart: Semantic Prompt Versioning

## Overview

This feature adds semantic versioning (`MAJOR.MINOR.PATCH`) to prompt templates with intelligent cache invalidation that scales with the magnitude of the version bump.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **SemVer** | Value object (`1.0.0`) replacing the integer `version` field. Supports `bump()`, `compare()`, `bumpType()` |
| **CacheInvalidationStrategy** | Pluggable strategy determining which cache entries to delete on activation |
| **InvalidationScope** | `NONE` (patch), `VERSION` (minor), `SUBJECT` (major) |
| **VersionReader** | Read-only interface (getActive, getHistory) — used by prompt rendering and audit. No write/activate surface |
| **VersionWriter** | Write-only interface (createVersion) — used by admin editor. No read/activate/cache surface |
| **VersionActivator** | Activation/rollback interface with constructor-injected PromptCache + CacheInvalidationStrategy (DIP) |
| **template_versions** | New append-only table with `activatedBy` field for audit trail and rollback |

## Files to Create

```text
src/lib/prompts/
├── semver.ts                         # SemVer value object
├── version-reader.ts                 # Read-only interface + impl (getActive, getHistory)
├── version-writer.ts                 # Write-only interface + impl (createVersion)
├── version-activator.ts              # Activation interface + impl (activate, rollback)
├── cache-invalidation-strategy.ts    # Strategy interface + SemanticInvalidationStrategy
└── cache.ts                          # Extended PromptCache interface (add deleteVersion)

tests/unit/
├── semver.test.ts
├── version-reader.test.ts
├── version-writer.test.ts
├── version-activator.test.ts
└── cache-invalidation-strategy.test.ts
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/db/schema.ts` | Add `semver`, `version_major/minor/patch`, `checksum` columns to `prompt_templates`; add `template_versions` table |
| `src/lib/prompts/cache-key.ts` | Change `templateVersion: number` to `semver: SemVer` in `buildPromptCacheSlug` |
| `src/lib/prompts/caching-decorator.ts` | Pass semver instead of number version |
| `src/lib/prompts/generator.ts` | Change `templateVersion: number` to `templateSemver: string` in `GenerateRequest` |
| `src/lib/prompts/repository.ts` | Update `activateTemplate` to accept `CacheInvalidationStrategy` |
| `src/lib/prompts/engine.ts` | Use VersionManager instead of direct repository calls |
| `src/lib/prompts/cache.ts` | Add `deleteVersion()` to `PromptCache` interface + `CloudflarePromptCache` |
| `src/lib/analytics.ts` | Add `trackVersionActivation()` to `Analytics` interface |

## Migration

1. `pnpm db:generate` — generates migration file under `drizzle/`
2. `pnpm db:push` — applies migration to local dev database
3. Backfill existing templates: `version=1 → "1.0.0"`, `version=2 → "2.0.0"` etc.

## Testing

```bash
pnpm test:unit                          # Run all unit tests
pnpm test:unit tests/unit/semver.test.ts # Run specific test
```

## Architecture Diagram

```
VersionManager
  ├── createVersion()  → validates semver, computes checksum, inserts record
  ├── activate()       → DB transaction + cache invalidation via strategy
  ├── rollback()       → restores from history + cache invalidation
  ├── getActive()      → read-only query
  └── getHistory()     → read-only query

CacheInvalidationStrategy (interface)
  ├── SemanticInvalidationStrategy  → scope by bump type
  └── NoOpInvalidationStrategy      → for tests

PromptCache (interface)
  ├── CloudflarePromptCache  → KV-backed
  └── createInMemoryCache()  → Map-backed (tests)
```
