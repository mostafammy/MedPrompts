---

description: "Task list for Semantic Prompt Versioning & Intelligent Caching feature"
---

# Tasks: Semantic Prompt Versioning & Intelligent Caching

**Input**: Design documents from `specs/006-prompt-versioning-caching/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Implementation Status

Several foundational components are already implemented:
- `src/lib/prompts/semver.ts` — SemVer value object (parse, bump, compare, bumpType, equals)
- `src/lib/prompts/cache-invalidation-strategy.ts` — SemanticInvalidationStrategy + NoOpInvalidationStrategy
- `src/lib/prompts/cache.ts` — PromptCache interface + CloudflarePromptCache + createInMemoryCache (with deleteVersion/deleteSubject)
- `src/lib/prompts/version-reader.ts` — VersionReader interface + StubVersionReader
- `src/lib/prompts/version-writer.ts` — VersionWriter interface + StubVersionWriter
- `src/lib/prompts/version-activator.ts` — VersionActivator interface + StubVersionActivator
- `src/lib/db/schema.ts` — promptTemplates extended (+semver, +versionMajor/Minor/Patch, +checksum) + templateVersions table
- `src/lib/prompts/generator.ts` — GenerateRequest already has templateSemver: string
- `tests/unit/semver.test.ts` — SemVer tests
- `tests/unit/cache-invalidation-strategy.test.ts` — Strategy tests

---

## Phase 1: Setup — Drizzle Migration Generation

**Purpose**: Generate the Drizzle migration file from existing schema changes to make the database reflect the new columns and table.

- [x] T001 Generate Drizzle migration for schema changes via `pnpm db:generate` (detects `semver`, `version_major`, `version_minor`, `version_patch`, `checksum` columns + `template_versions` table)
- [x] T002 Review generated migration SQL in `drizzle/0002_semver_versioning.sql` and confirm columns, indexes, and foreign keys are correct
- [x] T003 [P] Apply migration to local dev database via `pnpm db:push`

---

## Phase 2: Foundational — Interface Implementation & Data Layer (Blocks ALL User Stories)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Implements the three role-segregated interfaces and the updated repository layer.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [US1] Implement `DatabaseVersionWriter` class in `src/lib/prompts/version-writer.ts` with `createVersion()` that validates semver via `SemVer.parse()`, computes SHA-256 checksum, checks identity against current active, and inserts a new `promptTemplates` row with `isActive: false`
- [x] T005 [US1] Implement `activateTemplate` in `src/lib/prompts/repository.ts` accepting `CacheInvalidationStrategy` + `activatedBy` param — performs atomic DB transaction (deactivate old, activate new, insert `templateVersions` history record with `activatedBy`), then delegates cache invalidation to strategy
- [x] T006 [US1] Implement `DatabaseVersionActivator` class in `src/lib/prompts/version-activator.ts` with `activate(templateId, activatedBy)` that delegates to repository's `activateTemplate` with injected cache + strategy
- [x] T007 [US1] Implement `DatabaseVersionReader` class in `src/lib/prompts/version-reader.ts` with `getActive(db, subjectId)` (query active template) and `getHistory(db, subjectId)` (join through `promptTemplates` to find history by `subjectId`, ordered by `activatedAt DESC`)
- [x] T008 [P] [US3] Implement `DatabaseVersionActivator.rollback(subjectId, targetSemver, activatedBy)` in `src/lib/prompts/version-activator.ts` — find target in `templateVersions` via JOIN, restore template content + variables + interactive flag, insert new active row with `versionMajor/Minor/Patch` parsed from semver, deactivate old, invalidate cache via strategy

**Checkpoint**: Foundation ready — all three role interfaces implemented and deployable. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Patch Version Activation (Priority: P1) 🎯 MVP

**Goal**: Prompt engineer creates patch versions (v1.0.0 → v1.0.1) with no cache invalidation (FR-012). Existing cached prompts for the old patch continue serving. New requests populate cache for the new version.

**Independent Test**: Activate a patch bump and verify old cache entries remain accessible while new requests generate v1.0.1 cache entries.

### Implementation for User Story 1

- [x] T009 [P] [US1] Update `buildPromptCacheSlug` in `src/lib/prompts/cache-key.ts` to accept `semver: SemVer` instead of `templateVersion: number` — key format changes from `-t{n}-{hash}` to `-v{major}-{minor}-{patch}-{hash}`
- [x] T010 [P] [US1] Update `CachingDecorator.generate()` in `src/lib/prompts/caching-decorator.ts` to pass `templateSemver` from `GenerateRequest` through `SemVer.parse()` into `buildPromptCacheSlug` instead of `templateVersion`
- [x] T011 [P] [US1] Update `PromptEngine` constructor in `src/lib/prompts/engine.ts` to accept `VersionReader`, `VersionWriter`, `VersionActivator` as constructor-injected dependencies; wire them into the generation pipeline
- [x] T012 [US1] Update `PromptEngine.generatePrompt()` in `src/lib/prompts/engine.ts` to use `template.semver` instead of `template.version` when calling `this.generator.generate()`
- [x] T013 [US1] Add `trackVersionActivation()` method to `Analytics` interface in `src/lib/analytics.ts` — event payload includes subjectId, oldSemver, newSemver, bumpType, invalidationScope, durationMs, success, activatedBy
- [x] T014 [P] [US1] Implement `trackVersionActivation()` in `plausibleAnalytics` and `noopAnalytics` in `src/lib/analytics.ts` — wrap telemetry call in try/catch to prevent poisoned-success scenario (NFR-005)
- [x] T015 [US1] Implement `ConcurrentActivationError` class in `src/lib/prompts/version-activator.ts` for concurrent activation conflict detection (FR-021, FR-022)
- [x] T016 [US1] Implement `sleep()` utility in `src/lib/prompts/version-activator.ts` for retry backoff; implement `enqueueOrLog()` method for async invalidation off-ramp (Gap 4, Gap 5)
- [x] T017 [US1] Implement cache stampede protection in `src/lib/prompts/caching-decorator.ts` — first-request-wins locking for cache-miss keys using KV lock prefix (`lock:${cacheKey}`)

**Checkpoint**: At this point, User Story 1 should be fully functional — patch version activation works end-to-end with correct cache key format, no cache invalidation on patch bump, and telemetry events emitted.

---

## Phase 4: User Story 2 — Major Version Activation (Priority: P1)

**Goal**: Prompt engineer releases major rewrites (v1.x.x → v2.0.0) with full subject-scoped cache invalidation (FR-014). All cached prompts for the subject are deleted, and subsequent requests populate fresh cache entries.

**Independent Test**: Activate a major bump and verify all v1.x.x cache entries for that subject are deleted while entries for other subjects remain untouched.

### Implementation for User Story 2

- [x] T018 [US2] Wire full `DatabaseVersionActivator.activate()` invalidation path — after DB commit, determine scope via `SemanticInvalidationStrategy.scope()`, if SUBJECT then call `cache.deleteSubject(subjectId)` with sync retry (3× exponential backoff: 1s, 2s, 4s) per NFR-006a
- [x] T019 [US2] Add deleted-count tracking to `DatabaseVersionActivator.invalidate()` — return `deletedCount` from cache operations for telemetry and dashboard
- [x] T020 [US2] Wire telemetry in `DatabaseVersionActivator.activate()` — emit `trackVersionActivation` event after successful activation with bumpType='major', invalidationScope='SUBJECT', activatedBy from parameter

**Checkpoint**: Major version activation works end-to-end — all cache entries for the subject are invalidated, new entries are created on first request, and telemetry is emitted.

---

## Phase 5: User Story 5 — Minor Version Activation (Priority: P1)

**Goal**: Prompt engineer adds optional variables via minor bumps (v1.1.0 → v1.2.0) with version-scoped cache invalidation (FR-013). Only cache keys matching the old minor prefix are deleted.

**Independent Test**: Activate a minor bump and verify only cache keys containing the old minor prefix (`-v1.1.`) are deleted, while other versions' entries remain.

### Implementation for User Story 5

- [x] T021 [US5] Wire `DatabaseVersionActivator.activate()` VERSION-scoped invalidation — when `strategy.scope()` returns VERSION, call `cache.deleteVersion(subjectId, currentSemver)` with sync retry (3× exponential backoff)
- [x] T022 [US5] Wire telemetry in `DatabaseVersionActivator.activate()` for minor bumps — emit `trackVersionActivation` with bumpType='minor', invalidationScope='VERSION'

**Checkpoint**: Minor version activation works end-to-end — only version-scoped cache entries are invalidated, and telemetry is emitted with correct scope.

---

## Phase 6: User Story 3 — Version Rollback (Priority: P2)

**Goal**: Administrator rolls back to a previous version (e.g., v2.0.0 → v1.3.2) with targeted cache invalidation proportionate to rollback scope (FR-006). Template content restored byte-for-byte from version history.

**Independent Test**: Activate v2.0.0, then roll back to v1.3.2, and verify prompts are generated from the restored v1.3.2 template.

### Implementation for User Story 3

- [x] T023 [US3] Implement rollback cache invalidation in `DatabaseVersionActivator.rollback()` — determine scope via strategy (within-major=VERSION, cross-major=SUBJECT), execute appropriate `cache.deleteVersion()` or `cache.deleteSubject()`
- [x] T024 [US3] Add rollback telemetry in `DatabaseVersionActivator.rollback()` — emit `trackVersionActivation` with proper old/new semver, bumpType, invalidationScope
- [x] T025 [US3] Add checksum verification on rollback in `DatabaseVersionActivator.rollback()` — after restoring template from history, verify SHA-256 checksum matches stored value; refuse restoration on mismatch and alert operator

**Checkpoint**: Rollback works end-to-end — template content restored byte-for-byte, cache invalidation scoped correctly, telemetry emitted.

---

## Phase 7: User Story 6 — Observability & Operator Dashboard (Priority: P2)

**Goal**: Operators monitor version activation activity, cache hit/miss rates, invalidation success rates, and template checksum integrity (SC-011, SC-012). All version lifecycle operations produce observable telemetry.

**Independent Test**: Every version activation (patch/minor/major) produces a telemetry event with subject, old/new semver, bump type, invalidation scope, and duration.

### Implementation for User Story 6

- [x] T026 [P] [US6] Create `workers/template-drift-checker.ts` — daily Cron Trigger (06:00 UTC) that queries active templates, recomputes SHA-256 checksums, and flags mismatches against stored `checksum` column; emits alert event on drift detection
- [x] T027 [US6] Add error-guarded telemetry in `DatabaseVersionActivator` — wrap all `trackVersionActivation` calls in try/catch to prevent poisoned-success where DB committed but analytics throws (Gap 7 fix)
- [x] T028 [US6] Implement cache hit/miss telemetry with version segmentation in `src/lib/prompts/caching-decorator.ts` — include semver string in analytics events for per-version hit/miss tracking
- [x] T029 [US6] Add operator-facing invalidation retry mechanism — log failed invalidations with `remainingKeys` count to console for dashboard display and manual retry action

**Checkpoint**: All activation events produce observable telemetry. Template drift detection runs daily. Cache hit/miss rates queryable per version.

---

## Phase 8: User Story 4 — Version Audit Trail (Priority: P3)

**Goal**: Auditors query full version history for each subject including who activated what version, when, and the changelog (FR-005, FR-016, FR-017, FR-018). The `activatedBy` field captures the operator identity.

**Independent Test**: Activate multiple versions for a subject and query version history — all versions returned with timestamps, semver strings, changelogs, and activatedBy.

### Implementation for User Story 4

- [x] T030 [US4] Implement `DatabaseVersionReader.getHistory()` in `src/lib/prompts/version-reader.ts` — query `templateVersions` JOINed with `promptTemplates` on `templateId` to filter by `subjectId`, ordered by `activatedAt DESC` (Gap 1 fix)
- [x] T031 [US4] Verify `activatedBy` propagation end-to-end — confirm that `DatabaseVersionActivator.activate()` and `.rollback()` pass `activatedBy` through `repository.ts` into the `templateVersions` history record
- [x] T032 [US4] Add `trackVersionActivation` telemetry completeness — ensure every activation/rollback event includes `activatedBy` in the telemetry payload for full audit trail

**Checkpoint**: Version history queries return complete records. `activatedBy` field populated in both database and telemetry for all activation events.

---

## Phase 9: Migration & Backfill

**Purpose**: Convert existing integer versions to semver and deploy database migration to production.

- [x] T033 Create `scripts/migrate-versions.ts` — idempotent backfill script that converts existing integer `version` to `{version}.0.0` semver format, computes SHA-256 checksums, inserts `templateVersions` history records with `activatedBy: 'system:migration'` (idempotency guard: skip if `semver !== '1.0.0'`)
- [x] T034 Run backfill script against dev database: `npx tsx scripts/migrate-versions.ts` — verify existing templates get semver assigned and history records created
- [x] T035 Run full test suite: `pnpm test:unit` — verify all existing tests pass with new semver-based code
- [ ] T036 Deploy migration to staging, run backfill, verify backward cache compatibility (old `-t{n}-{hash}` keys coexist with new `-v{semver}-{hash}` keys)

---

## Phase 10: Unit Tests

**Purpose**: Verify all new components work independently with proper test doubles.

- [x] T037 [P] [US1] Create `tests/unit/version-writer.test.ts` — tests for `DatabaseVersionWriter.createVersion()`: validates semver, computes checksum, detects identity, rejects invalid input
- [x] T038 [P] [US1] Create `tests/unit/version-activator.test.ts` — tests for `DatabaseVersionActivator.activate()`: successful activation, identity detection rejection, concurrent activation conflict (exactly one succeeds), cache invalidation delegation, `activatedBy` propagation into history record
- [x] T039 [P] [US1] Create `tests/unit/version-reader.test.ts` — tests for `DatabaseVersionReader`: `getActive` returns correct template, `getHistory` orders by date desc with JOIN, handles empty subject
- [x] T040 [US3] Add rollback tests to `tests/unit/version-activator.test.ts` — rollback restores exact template content verified by checksum, cache invalidation delegates to strategy correctly, cross-major vs within-major scope
- [x] T041 [US2] Add major activation tests to `tests/unit/version-activator.test.ts` — verifies SUBJECT scope invalidation called
- [x] T042 [US5] Add minor activation tests to `tests/unit/version-activator.test.ts` — verifies VERSION scope invalidation called
- [x] T043 [P] [US6] Create `tests/unit/analytics.test.ts` — add tests for `trackVersionActivation` in `noopAnalytics` (no-op) and verify error-guarded telemetry doesn't throw
- [ ] T044 [P] [US1] Update existing `tests/unit/cache-key.test.ts` — change `templateVersion: number` to `semver: SemVer` parameter, update assertions for new `-v{major}.{minor}.{patch}-{hash}` key format
- [ ] T045 [US1] Update existing `tests/unit/caching-decorator.test.ts` — update `GenerateRequest` shape to use `templateSemver` string instead of `templateVersion` number

---

## Phase 11: Polish & Cross-Cutting Concerns (OPTIONAL)

**Purpose**: Optional improvements that affect multiple user stories.

- [x] T046 [P] Create `workers/invalidation-retry.ts` — Cloudflare Queue consumer for async invalidation retries (Phase 8 from plan, requires `INVALIDATION_RETRY_QUEUE` binding to be provisioned)
- [ ] T047 Run quickstart.md validation steps — verify migration, backfill, and activation flow end-to-end
- [ ] T048 Code cleanup and refactoring — remove deprecated `version: integer` column usage once migration is stable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Phase 2 completion
  - US1 (Phase 3, P1) and US2 (Phase 4, P1) and US5 (Phase 5, P1) share the same `DatabaseVersionActivator.activate()` — implement together
  - US3 (Phase 6, P2): Depends on Phase 3-5 completion (uses activator infra)
  - US6 (Phase 7, P2): Partially parallel with Phase 3-5 (drift checker independent)
  - US4 (Phase 8, P3): Depends on Phase 2 (reader implemention is blocking)
- **Migration (Phase 9)**: Depends on Phase 2 (schema, backfill script)
- **Tests (Phase 10)**: Phase-specific — T037/T038/T039 parallel with Phase 3-5; T040-T043 parallel with Phase 6-8
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Implemented alongside US1 (shared `activate()` code path)
- **US5 (P1)**: Implemented alongside US1 (shared `activate()` code path)
- **US3 (P2)**: Depends on US1/US2/US5 — uses same `DatabaseVersionActivator` infra
- **US6 (P2)**: Partially independent (drift checker worker) — analytics integration depends on US1-US5
- **US4 (P3)**: Depends on `DatabaseVersionReader` (Phase 2) for getHistory implementation

### Within Each User Story

- Implementations before integration
- Wire activation flow before telemetry
- Cache invalidation before stampede protection
- Story complete before moving to next

### Parallel Opportunities

- T009-T011 (cache-key, caching-decorator, engine updates) can run in parallel
- T013-T014 (analytics interface + implementations) can run in parallel
- T026 (drift checker worker) can run in parallel with Phases 3-5
- All test tasks within a story marked [P] can run in parallel
- Phase 9 (migration) can run in parallel with Phase 10 (tests) for non-schema tests

---

## Parallel Example: User Story 1 (P1)

```bash
# Launch all cache/engine updates together:
Task: "Update cache-key.ts to accept SemVer"
Task: "Update caching-decorator.ts to use templateSemver"
Task: "Update engine.ts to wire VersionReader/Writer/Activator"

# Launch all analytics changes together:
Task: "Add trackVersionActivation to Analytics interface"
Task: "Implement trackVersionActivation in plausibleAnalytics + noopAnalytics"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Drizzle migration)
2. Complete Phase 2: Foundational (DatabaseVersionWriter, DatabaseVersionActivator, DatabaseVersionReader)
3. Complete Phase 3: User Story 1 (Patch version activation)
4. **STOP and VALIDATE**: Test patch activation independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 + US5 (P1) → All bump types working → Deploy/Demo (MVP!)
3. Add US3 (P2) → Rollback working → Deploy
4. Add US6 (P2) → Observability → Deploy
5. Add US4 (P3) → Audit trail → Deploy
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together
2. Once Foundational is done:
   - Developer A: US1 + US2 + US5 (activation core, cache-key, caching-decorator, engine)
   - Developer B: Tests (T037-T045)
   - Developer C: Migration script + analytics
3. Developer A continues to US3 (rollback), US6 (observability), US4 (audit)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- Several foundational files already exist (SemVer, contracts, interfaces, schema) — tasks focus on remaining implementation
- The plan's Gap fixes (1-14) are incorporated into the relevant tasks above
- Tests are included as Phase 10 — write tests before implementation for TDD approach
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
