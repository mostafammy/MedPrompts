# Tasks: Promptica V1 Core

**Input**: Design documents from `/specs/003-promptica-v1/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅
**Organization**: Tasks are grouped by user story for independent implementation and testing.
**Tests**: Included — production-grade code requires a full testing pyramid.

## Format Reference

```
- [ ] [TaskID] [P?] [Story?] Description — exact file path — acceptance criteria
```

- **[P]**: Can run in parallel (touches different files, no incomplete deps)
- **[Story]**: User story label (US1, US2, US3)
- **Acceptance**: Each task has inline "Done When" criteria

---

## Phase 1: Setup & Project Initialization

**Purpose**: Bootstrap the project scaffold, toolchain, and developer experience so that all subsequent tasks have a reliable, reproducible base.

**Done When**: `pnpm dev` starts without errors, `pnpm lint` and `pnpm typecheck` pass on an empty codebase, and all config files are in place.

### Project Scaffold

- [x] T001 Initialize Next.js 15 App Router project with TypeScript using `npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"` — project root — Done when `pnpm dev` runs and `/` returns 200

- [x] T002 [P] Configure pnpm strict mode — add `strict-peer-dependencies=true` and `auto-install-peers=false` to `.npmrc` — Done when `pnpm install` completes without phantom dependency warnings

- [x] T003 [P] Install core dependencies:
  ```
  pnpm add drizzle-orm @libsql/client zod
  pnpm add -D drizzle-kit @types/node vitest @vitest/coverage-v8 playwright fast-check
  pnpm add -D @cloudflare/workers-types wrangler@latest @opennextjs/cloudflare
  ```
  — Done when `pnpm list` shows all packages

- [x] T004 [P] Configure TypeScript — update `tsconfig.json` with `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, path alias `@/*` → `src/*` — `src/tsconfig.json` — Done when `pnpm typecheck` passes on fresh scaffold

- [x] T005 [P] Configure ESLint with import boundary rules — `.eslintrc.js` — rules:
  - `import/no-restricted-paths` zones enforcing L1→L2→L3→L4 hierarchy
  - `no-restricted-syntax` blocking `console.log` in `src/lib/`
  - Done when `pnpm lint` fails intentionally on a layer violation test import

- [x] T006 [P] Configure Vitest — `vitest.config.ts` — settings:
  - `test.environment: 'node'` for unit/integration
  - `test.globals: true`
  - coverage with `v8` provider, 80% threshold
  - separate projects: `unit`, `integration`, `property`
  - Done when `pnpm test` discovers zero tests and exits 0

- [x] T007 [P] Configure Playwright — `playwright.config.ts` — settings:
  - browsers: chromium, firefox, webkit (mobile viewport 390×844)
  - `baseURL` from `TEST_BASE_URL` env var (CF Pages preview)
  - `grantPermissions: ['clipboard-read', 'clipboard-write']`
  - Done when `pnpm test:e2e --list` shows no errors

- [x] T008 [P] Configure Cloudflare — `wrangler.toml`:
  ```toml
  name = "promptica"
  compatibility_date = "2024-09-23"
  compatibility_flags = ["nodejs_compat"]

  [[kv_namespaces]]
  binding = "PROMPT_CACHE_KV"
  id = "PLACEHOLDER"

  [[kv_namespaces]]
  binding = "NORMALIZER_CACHE_KV"
  id = "PLACEHOLDER"

  [[unsafe.bindings]]
  name = "RATE_LIMITER"
  type = "ratelimit"
  namespace_id = "1001"
  simple = { limit = 60, period = 60 }
  ```
  — Done when `wrangler dev` starts without config errors

- [x] T009 [P] Configure OpenNext — `open-next.config.ts` — targeting Cloudflare Pages adapter — Done when `pnpm opennext build` produces a `.open-next/` directory

- [x] T010 [P] Configure Drizzle Kit — `drizzle.config.ts`:
  ```typescript
  export default { schema: './src/lib/db/schema.ts', out: './drizzle', dialect: 'sqlite', driver: 'turso' }
  ```
  — Done when `pnpm drizzle-kit generate` can read the config without errors

- [x] T011 [P] Add `package.json` scripts:
  ```json
  {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:property": "vitest run tests/property",
    "test:e2e": "playwright test",
    "bundle:check": "node scripts/check-bundle-size.js",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push"
  }
  ```

- [x] T012 [P] Create bundle size check script — `scripts/check-bundle-size.js`:
  - Reads `.next/analyze/` output
  - Fails with exit 1 if JS gzip > 80000 bytes or CSS gzip > 20000 bytes
  - Done when `pnpm bundle:check` fails on a known oversized bundle

- [x] T013 [P] Configure `.env.local` template — `.env.local.example`:
  ```env
  TURSO_DATABASE_URL=libsql://...
  TURSO_AUTH_TOKEN=...
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medprompts.mostafayaser.earth
  ```
  — Done when developer README references this file

- [x] T014 Create GitHub Actions CI workflow — `.github/workflows/ci.yml` — with jobs: `lint` → `db-safety` → `test` → `build` → `e2e` → `deploy` (main only) — Done when a test PR shows all jobs run in dependency order

**Phase 1 Checkpoint**: `pnpm dev` + `pnpm lint` + `pnpm typecheck` + `pnpm test` all pass.

---

## Phase 2: Foundational — Core Infrastructure

**Purpose**: Build all L1 and L2 primitives that every user story depends on. MUST complete before any user story work begins.

**⚠️ CRITICAL**: All Phase 3+ tasks have a hard dependency on Phase 2 completion.

**Done When**: All L1 modules have passing unit tests. `PromptEngine` can be constructed with in-memory fakes and `engine.generate()` returns a `Result.ok` for a seeded template.

### Layer 1: Pure Types & Result Infrastructure

- [x] T015 [P] Implement `Result<T, E>` type and combinators — `src/lib/types/result.ts`:
  - `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`
  - Functions: `ok()`, `err()`, `isOk()`, `isErr()`, `map()`, `flatMap()`, `unwrapOr()`
  - TSDoc on every export with `@pure` and `@example` tags
  - Done when `tests/unit/result.test.ts` covers all 7 functions

- [x] T016 [P] Implement Branded types and smart constructors — `src/lib/types/branded.ts`:
  - `Branded<T, B>` utility type
  - Smart constructors: `Topic.parse()`, `SubjectId.parse()`, `Slug.parse()`, each returning `Result<T, ValidationError>`
  - `unsafeParse()` variants for test fixtures only (documented with `@throws`)
  - Done when a plain `string` causes a TypeScript error when passed as `Topic` to `injectTopic()`

- [x] T017 [P] Implement Cloudflare Worker `Env` interface — `src/lib/types/env.d.ts`:
  ```typescript
  interface Env {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN: string;
    PROMPT_CACHE_KV: KVNamespace;
    NORMALIZER_CACHE_KV: KVNamespace;
    RATE_LIMITER: RateLimit;
    FLAGS_KV: KVNamespace;
  }
  ```
  — Done when `wrangler types` generates a matching `worker-configuration.d.ts`

- [x] T018 [P] Implement `Logger` interface and implementations — `src/lib/logger.ts`:
  - `Logger` interface: `debug()`, `info()`, `warn()`, `error()`
  - `cloudflareLogger`: JSON-structured to stdout (`console.log(JSON.stringify({level, msg, ...ctx, ts}))`)
  - `noopLogger`: all methods no-op (for tests that don't assert on logs)
  - `TestLogger`: accumulates logs in `this.logs[]` for assertions
  - Done when unit test imports `TestLogger` and asserts `logger.logs` after `PromptEngine.generate()`

### Layer 1: Zod Schemas

- [x] T019 [P] Implement Zod schemas for all domain entities — `src/lib/prompts/schema.ts`:
  - `SubjectIdSchema`: regex `/^[a-z][a-z0-9-]*$/`
  - `TopicSchema`: min 1, max 120 chars, injection pattern check via `.refine()`
  - `SlugSchema`: regex `/^[a-z0-9]+(-[a-z0-9]+)*$/`, max 74 chars
  - `PromptTemplateSchema`: must contain `{{TOPIC}}`, min 100 chars, max 8000 chars
  - `SubjectSchema`: `id`, `label`, `icon`, `sortOrder`, `isActive`
  - Done when `SubjectIdSchema.parse('pathology')` returns `'pathology'` and `SubjectIdSchema.parse('PAT HOL')` throws `ZodError`

### Layer 1: Pure Functions

- [x] T020 [P] Implement `injectTopic()` pure function — `src/lib/prompts/injector.ts`:
  - Signature: `injectTopic(template: string, topic: Topic): Result<InjectionSuccess, InjectionError>`
  - Uses `split().join()` — NOT `String.replace()` (avoids `$$` escape bug)
  - Returns `InjectionError` with discriminated codes: `TEMPLATE_EMPTY`, `MISSING_PLACEHOLDER`, `TOPIC_TOO_LONG`
  - Returns `InjectionSuccess` with `output`, `placeholderCount`, `wordCount`, `characterCount`
  - TSDoc: `@pure @throws Never`
  - Done when 8 unit tests pass (happy path × 2, 3 error codes, special chars, multiple placeholders, case-sensitive placeholder)

- [x] T021 [P] Implement `sanitizeTopic()` pure function — `src/lib/prompts/sanitizer.ts`:
  - Injection pattern list (8 regexes): `ignore previous instructions`, `you are now`, `pretend to be`, `system prompt`, `reveal your`, `disregard`, `DAN`, `jailbreak`
  - Unicode-aware character allowlist: `/^[\p{L}\p{N}\s\-,.'!?&()]+$/u`
  - Max length: 120 chars
  - Done when 12 unit tests pass (empty, too long, each injection pattern × 1, clean input, Arabic chars, accented chars)

- [x] T022 [P] Implement `slugifyTopic()` and `slugToTopic()` pure functions — `src/lib/prompts/slugifier.ts`:
  - `slugifyTopic(topic: Topic): Slug`
    - NFKD normalize → remove diacritics → lowercase → remove non-alphanumeric → spaces to hyphens → collapse hyphens → trim edges
    - FNV-1a hash suffix when body > `MAX_SLUG_BODY` (67 chars): `${truncated}-${fnv1a(fullBody)}`
    - Total max: 74 chars
  - `slugToTopic(slug: Slug): string` — hyphens to title-case spaces (for display)
  - `fnv1a(s: string): string` — internal helper, non-exported
  - Done when 10 unit tests + 4 property tests (idempotent, url-safe, ≤74, collision-resistance) all pass

- [x] T023 [P] Implement `validateTemplate()` quality gate — `src/lib/prompts/evaluator.ts`:
  - Validates template has required structural sections (min 3 `##` headers)
  - Validates contains `⚠️ Verify` or `verify` disclaimer
  - Validates `{{TOPIC}}` placeholder present
  - Validates word count 50–3000
  - Returns `Result<void, ValidationError[]>` — all violations collected, not fail-fast
  - Done when unit test with a malformed template (no disclaimer, no headers) returns `ok: false` with 2 errors

- [x] T024 [P] Implement `abbreviationNormalizer` — `src/lib/prompts/normalizer/abbreviation.ts`:
  - `ABBREVIATION_MAP`: min 20 medical abbreviations (MI, ACS, AFIB, COPD, PE, DVT, UTI, CKD, SLE, RA, TB, HIV, ARF, ARDS, SIDS, IBS, GERD, CAD, CHF, DM)
  - `TYPO_MAP`: min 10 common typos (alzhimers, parkinsins, brcal, mycardl, etc.)
  - Conforms to `TopicNormalizer` interface
  - `requiresNetwork: false`, `isEnabled: () => true`
  - Confidence: 0.95 for abbreviation match, 0.85 for typo correction, 1.0 for no change
  - Done when `normalizer.normalize('mi', ctx)` returns `{ cleaned: 'Myocardial Infarction', confidence: 0.95, strategy: 'abbreviation' }`

- [x] T025 [P] Implement `identityNormalizer` — `src/lib/prompts/normalizer/identity.ts`:
  - Trims whitespace, no other change
  - Confidence: 1.0, strategy: 'unchanged'
  - Always `isEnabled(): true`
  - Done when unit test verifies `normalize('  Myocardial  ')` returns `{ cleaned: 'Myocardial', confidence: 1.0 }`

- [x] T026 [P] Implement `TopicNormalizer` contract interface — `src/lib/prompts/normalizer/contract.ts`:
  - `TopicNormalizer` interface with `name`, `requiresNetwork`, `normalize()`, `isEnabled()`
  - `NormalizationResult` type: `{ cleaned, corrections, confidence, strategy }`
  - `Correction` type: `{ from, to, reason }`
  - `NormalizerContext` type: `{ subjectId: SubjectId; raw: string }`
  - `NormalizerEnv` type: `{ hasApiKey: boolean; userPlan: 'free' | 'pro' }`
  - Done when `abbreviationNormalizer` and `identityNormalizer` satisfy the interface type check

### Layer 1: i18n

- [x] T027 [P] Implement i18n message system — `src/lib/i18n/messages.ts`:
  - `MessageKey` union type (all UI string keys)
  - `Messages` type: `Readonly<Record<MessageKey, string>>`
  - `en` messages object (all English strings)
  - `ar` messages object (Arabic: anatomy, pathology, copy, copied, topic placeholder, error)
  - `t(messages, key, vars?)` helper function
  - Done when `t(ar, 'actions.copy')` returns `'نسخ'`

### Layer 2: I/O Wrappers

- [x] T028 Implement Drizzle database schema — `src/lib/db/schema.ts`:
  - Tables: `subjects`, `prompt_templates`, `topics_seed`, `prompt_events`
  - All indexes defined inline: `activeSubjectIdx`, `sortIdx`, `uniqueSubjectSlug`, `highYieldIdx`, `copiedAtIdx`
  - All types exported: `Subject`, `PromptTemplate`, `TopicSeed`, `PromptEvent`
  - Done when `pnpm db:generate` produces a valid `.sql` migration file with all 4 tables and all indexes

- [x] T029 Implement Turso DB client factory — `src/lib/db/client.ts`:
  - `createDb(env: { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string }): Database`
  - `type Database = ReturnType<typeof createDb>`
  - MUST NOT use module-level singleton
  - Done when unit test creates two separate instances and verifies they are independent

- [x] T030 [P] Implement `getActiveTemplate()` loader — `src/lib/prompts/loader.ts`:
  - Signature: `getActiveTemplate(db: Database, subjectId: SubjectId): Promise<PromptTemplate | null>`
  - Uses `activeSubjectIdx` (composite index on `subject_id` + `is_active`)
  - Returns `null` when no active template found (caller maps to `SUBJECT_NOT_FOUND`)
  - Done when integration test with in-memory SQLite seed returns the active template and `null` for unknown subject

- [x] T031 [P] Implement KV-backed `PromptCache` — `src/lib/prompts/cache.ts`:
  - Implements `PromptCache` interface: `get(subjectId, slug): Promise<string | null>`, `set(subjectId, slug, prompt, ttl): Promise<void>`, `delete(subjectId): Promise<void>`
  - KV key format: `prompt:{subjectId}:{slug}`
  - Returns `null` on corrupt/missing entry (never throws)
  - `createInMemoryCache()` factory for tests (Map-backed, in-process)
  - Done when unit test: cache miss → set → cache hit → verify value → delete → cache miss again

- [x] T032 [P] Implement KV-backed `NormalizerCache` — `src/lib/prompts/normalizer/cache.ts`:
  - Key: `norm:{subjectId}:{fnv1a(raw.toLowerCase().trim())}`
  - TTL: 7 days (604800 seconds)
  - `NormalizerCacheStore` interface: `get(key)`, `put(key, value, { expirationTtl })`
  - `createInMemoryCacheStore()` for tests
  - Returns `null` on JSON.parse failure (corrupt entry treated as cache miss)
  - Done when unit test verifies cache hit on second normalize call with same input

- [x] T033 [P] Implement `activateTemplate()` repository — `src/lib/prompts/repository.ts`:
  - Signature: `activateTemplate(db: Database, templateId: PromptId): Promise<Result<void, ActivationError>>`
  - Uses DB transaction: deactivate old → activate new (atomic)
  - Returns `err({ code: 'NOT_FOUND', templateId })` if template doesn't exist
  - Calls `invalidateSubjectCache()` after activation
  - Done when integration test: seed 2 templates → activate second → verify only second is_active=true

- [x] T034 [P] Implement atomic rate limiter — `src/lib/security/rateLimit.ts`:
  - Signature: `rateLimit(request: Request, env: { RATE_LIMITER: RateLimit }): Promise<Response | null>`
  - Uses `env.RATE_LIMITER.limit({ key: ip })` (CF binding — atomic, no TOCTOU)
  - Returns `new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } })` on limit
  - Returns `null` when request is allowed
  - Done when unit test with a mock `RateLimit` binding verifies 429 on `success: false`

- [x] T035 [P] Implement security headers middleware — `src/lib/security/headers.ts`:
  - Signature: `securityHeaders(response: Response): Response`
  - Sets: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`, full CSP
  - CSP: no `unsafe-inline` in `style-src`, no `unsafe-eval` in `script-src`
  - Done when unit test verifies all 6 headers are present on the returned response

- [x] T036 [P] Implement Plausible analytics tracker — `src/lib/analytics.ts`:
  - `trackPromptGenerated(subject, slug, latencyMs)` → `window.plausible?.('Prompt Generated', ...)`
  - `trackPromptCopied(subject, method)` → `window.plausible?.('Prompt Copied', ...)`
  - `trackSharedUrlVisited(subject, source)` → `window.plausible?.('Shared URL Visited', ...)`
  - Noop `Analytics` interface implementation for testing
  - Done when unit test with `window.plausible` spy verifies correct event name and props on each call

- [x] T037 [P] Implement `copyToClipboard()` 3-level fallback — `src/lib/clipboard.ts`:
  - Level 1: `navigator.clipboard.writeText()` with 3s timeout
  - Level 2: `document.execCommand('copy')` via hidden textarea
  - Level 3: Returns `{ ok: true, method: 'manual' }` (caller shows `ManualCopySheet`)
  - `CopyResult`, `CopyMethod`, `CopyError` types defined in this file
  - Done when unit test with jsdom mocks verifies fallback chain (clipboard mock throws → execCommand mock fails → manual result)

### Layer 3: Orchestration

- [ ] T038 Implement `NormalizerPipeline` — `src/lib/prompts/normalizer/pipeline.ts`:
  - Signature: `class NormalizerPipeline { constructor(stages: TopicNormalizer[], logger?: Logger) }`
  - `run(raw: string, ctx: NormalizerContext): Promise<NormalizationResult>`
  - Per-stage 2s timeout via `Promise.race()`
  - Short-circuit: if confidence ≥ 0.9 AND `!stage.requiresNetwork` → skip remaining stages
  - On stage failure: log warn, continue to next stage (NEVER block user)
  - Final fallback: if all stages fail, return `{ cleaned: raw.trim(), confidence: 1.0, strategy: 'unchanged' }`
  - Done when integration test: abbreviation stage short-circuits (MI → Myocardial Infarction, skips identity), and a timing-out stage does not block the result

- [ ] T039 Implement `PromptEngine` orchestrator — `src/lib/prompts/service.ts`:
  - Class `PromptEngine { constructor(deps: PromptEngineDeps) }`
  - `generate(input: PromptEngineInput): Promise<Result<PromptEngineOutput, PromptEngineError>>`
  - 7-step pipeline: sanitize → slugify → cache check → load template → inject → cache write → track
  - Error codes: `TOPIC_INVALID`, `SUBJECT_NOT_FOUND`, `TEMPLATE_MALFORMED`, `INTERNAL`
  - Cache hit path returns `metadata.fromCache: true`, skips DB + inject
  - Done when integration test with seeded fake deps: generate returns `ok`, second call returns `fromCache: true`, injection pattern returns `TOPIC_INVALID`

**Phase 2 Checkpoint**: `pnpm test:unit` and `pnpm test:integration` both pass. `PromptEngine.generate()` with in-memory fakes produces a correct prompt string.

---

## Phase 3: User Story 1 — Select Subject + Generate + Copy Prompt (Priority: P1) 🎯 MVP

**Goal**: A medical student visits the home page, clicks a subject (e.g., Pathology), types a topic (e.g., "MI"), and receives a formatted prompt that they can copy with one tap. The abbreviation normalizer silently expands "MI" to "Myocardial Infarction".

**Independent Test**:
1. Visit `/`
2. Click "Pathology"
3. Type "MI" in the topic input
4. Observe abbreviation hint: "Did you mean: Myocardial Infarction?"
5. Click Generate
6. Verify URL changes to `/pathology/myocardial-infarction`
7. Verify prompt contains "Myocardial Infarction" in the expected sections
8. Click Copy
9. Paste into any text editor — full prompt is there

### Database Seed

- [ ] T040 [US1] Create database migration — `drizzle/0001_initial.sql`:
  - All 4 tables with all indexes
  - Done when `pnpm drizzle-kit push` against a local SQLite file creates all tables

- [ ] T041 [US1] Seed `subjects` table with 6 initial subjects — `scripts/seed.ts`:
  ```
  pathology, anatomy, physiology, pharmacology, microbiology, biochemistry
  ```
  Each with `label`, `icon` (lucide-react name), `sortOrder`, `isActive: true`
  — Done when `pnpm tsx scripts/seed.ts` inserts 6 rows and `SELECT count(*) FROM subjects` returns 6

- [ ] T042 [US1] Seed `prompt_templates` with initial pathology template — `scripts/seed.ts`:
  - Full pathology prompt with `{{TOPIC}}` placeholder, ≥7 `##` sections, `⚠️ Verify` disclaimer
  - `is_active: true`, `version: 1`
  - Template passes `validateTemplate()` quality gate
  - Done when `pnpm tsx scripts/seed.ts` inserts template and `validateTemplate()` returns `ok: true`

- [ ] T043 [P] [US1] Seed `topics_seed` with 20 high-yield pathology topics — `scripts/seed.ts`:
  - Topics: `Myocardial Infarction`, `Pneumonia`, `Cirrhosis`, `Glomerulonephritis`, `Stroke`, etc.
  - Each with `slug`, `isHighYield: true`
  - Done when autocomplete query returns matching suggestions for `"myocard"`

### API Layer (Edge Runtime)

- [ ] T044 [US1] Implement POST `/api/generate` route — `src/app/api/generate/route.ts`:
  - Edge runtime: `export const runtime = 'edge'`
  - Request body: `{ subjectId: string, topic: string }`
  - Parse with `SubjectIdSchema` + `TopicSchema` → 400 on failure
  - Call `PromptEngine.generate()` → 404 on `SUBJECT_NOT_FOUND`, 500 on `TEMPLATE_MALFORMED`
  - Response: `{ prompt, slug, wordCount, characterCount, fromCache }`
  - Attach `X-Cache: HIT | MISS` header
  - Done when `curl -X POST /api/generate -d '{"subjectId":"pathology","topic":"MI"}'` returns `200` with prompt containing "Myocardial Infarction"

### Home Page (Subject Grid)

- [ ] T045 [P] [US1] Implement `SubjectGrid` RSC — `src/components/SubjectGrid/SubjectGrid.tsx`:
  - Fetches subjects from DB via `createDb(env)` (no client JS)
  - Renders `SubjectCard` per subject
  - `aria-label="Select a medical subject"` on the grid container
  - Done when visiting `/` renders 6 subject cards without any client JS

- [ ] T046 [P] [US1] Implement `SubjectCard` client component — `src/components/SubjectGrid/SubjectCard.tsx`:
  - Props: `{ id: SubjectId, label: string, icon: string, isSelected: boolean, onSelect: () => void }`
  - `role="button"`, `aria-pressed={isSelected}`, `tabIndex={0}`, keyboard: `Enter` and `Space` trigger `onSelect`
  - Hover state via CSS (not JS)
  - Touch target ≥ 44×44px
  - Done when keyboard navigation selects a card and `aria-pressed` toggles

- [ ] T047 [US1] Implement Home page — `src/app/page.tsx`:
  - Server component renders `<SubjectGrid>` with pre-fetched subjects
  - `<TopicInput>` renders below grid (client component island)
  - Page `<title>`: "MedPrompts — Medical Prompt Library for Students"
  - `<meta name="description">`: meaningful description for SEO
  - `<h1>`: "Find Your Medical Study Prompt"
  - Done when Lighthouse SEO score is 100

### Topic Input

- [ ] T048 [P] [US1] Implement `TopicInput` client component — `src/components/TopicInput/TopicInput.tsx`:
  - Props: `{ subjectId: SubjectId | null, onGenerate: (topic: string) => void }`
  - Debounced abbreviation check (300ms) — calls `abbreviationNormalizer.normalize()` client-side
  - Shows inline hint "Did you mean: [expansion]?" when confidence ≥ 0.9
  - `<label for="topic-input">Topic</label>` + `<input id="topic-input" type="text" aria-describedby="topic-hint">`
  - Character counter display (0/120)
  - Submit disabled when `subjectId` is null or input is empty
  - Error state: red border + `role="alert"` on validation failure
  - Done when typing "MI" shows "Myocardial Infarction" hint within 300ms

- [ ] T049 [P] [US1] Implement `TopicInput` reducer — `src/components/TopicInput/TopicInput.reducer.ts`:
  - States: `{ status: 'idle' } | { status: 'typing'; value: string } | { status: 'validating' } | { status: 'error'; reason: string } | { status: 'ready'; topic: string }`
  - Actions: `INPUT_CHANGED`, `VALIDATION_STARTED`, `VALIDATION_PASSED`, `VALIDATION_FAILED`, `RESET`
  - Done when unit test: `INPUT_CHANGED → VALIDATION_STARTED → VALIDATION_PASSED` sequence reaches `ready` state

### Prompt Display

- [ ] T050 [P] [US1] Implement `PromptDisplay` RSC — `src/components/PromptDisplay/PromptDisplay.tsx`:
  - Props: `{ prompt: string; subject: string; topic: string; wordCount: number; fromCache: boolean }`
  - Renders `<pre><code>{prompt}</code></pre>` — NEVER `dangerouslySetInnerHTML`
  - Shows word count badge, subject + topic breadcrumb
  - `<article aria-label={`${subject} prompt for ${topic}`}>`
  - Done when rendered HTML contains no `innerHTML` usage and passes `axe-core` scan

### Copy Engine

- [ ] T051 [P] [US1] Implement `CopyButton` client component — `src/components/CopyEngine/CopyButton.tsx`:
  - Uses `useReducer(copyReducer, { status: 'idle' })` from `CopyButton.reducer.ts`
  - On click: dispatch `COPY_STARTED` → call `copyToClipboard()` → dispatch `COPY_SUCCESS` or `COPY_MANUAL` or `COPY_ERROR`
  - Auto-reset to `idle` after 2s on success
  - On `manual-fallback`: render `<ManualCopySheet>` bottom sheet
  - `aria-live="polite"` on status label (screen reader announces "Copied!")
  - Done when E2E test: click → clipboard contains full prompt → "Copied!" is announced

- [ ] T052 [P] [US1] Implement `ManualCopySheet` component — `src/components/ManualCopySheet/ManualCopySheet.tsx`:
  - Bottom sheet modal with `role="dialog"`, `aria-modal="true"`, `aria-label="Copy prompt manually"`
  - Full prompt in `<pre>` with `user-select: all` CSS — user can triple-click to select all
  - `useFocusTrap` hook active when sheet is open
  - Close on Escape key
  - Done when WCAG focus trap test: Tab cycles within sheet, Escape closes and returns focus to trigger

- [ ] T053 [P] [US1] Implement `useFocusTrap` hook — `src/components/ManualCopySheet/useFocusTrap.ts`:
  - Saves previously focused element on activate
  - Moves focus to first focusable element inside container
  - Tab wraps at boundaries (first/last focusable)
  - Restores focus to saved element on deactivate
  - Done when unit test (with jsdom) confirms focus cycling and restoration

### Middleware & Edge Worker

- [ ] T054 [US1] Implement Edge middleware — `src/middleware.ts`:
  - Rate limit via `rateLimit(request, env)` — return 429 if hit
  - `X-Cache` header injection
  - Security headers via `securityHeaders(response)`
  - `config.matcher`: `['/((?!_next/static|favicon.ico).*)']`
  - Done when `curl -H "CF-Connecting-IP: 1.2.3.4"` returns security headers on every response

### Tests for User Story 1

- [x] T055 [P] [US1] Write unit tests for `injectTopic()` — `tests/unit/injector.test.ts`:
  - 8 tests: happy path, multiple placeholders, empty template, missing placeholder, topic too long, special chars, case-sensitive placeholder, `split().join()` vs `replace()` equivalence
  - Done when `pnpm test:unit injector` shows 8 passing

- [x] T056 [P] [US1] Write unit tests for `sanitizeTopic()` — `tests/unit/sanitizer.test.ts`:
  - 12 tests: empty, too long, each injection pattern (8), clean Arabic topic, clean English topic, accented chars
  - Done when all 12 pass

- [x] T057 [P] [US1] Write unit tests for `slugifyTopic()` — `tests/unit/slugifier.test.ts`:
  - 10 tests: standard, diacritics, long topic collision, empty-after-sanitize, already-slugified idempotence, mixed case, Arabic (empty result), numbers, punctuation-only
  - Done when all 10 pass

- [x] T058 [P] [US1] Write property tests for `slugifyTopic()` — `tests/property/slugifier.prop.test.ts`:
  - 4 fast-check invariants: url-safe chars only, idempotent, ≤74 chars, two long topics with different endings produce different slugs
  - Done when `pnpm test:property` runs 1000 random cases with 0 failures

- [ ] T059 [US1] Write integration tests for `PromptEngine` — `tests/integration/prompt-flow.test.ts`:
  - 5 tests: happy path, cache hit on second call, unknown subject → `SUBJECT_NOT_FOUND`, injection pattern → `TOPIC_INVALID`, malformed template → `TEMPLATE_MALFORMED`
  - Uses `createInMemoryCache()` + `FakeTemplateReader` — zero DB/network
  - Done when all 5 pass in < 100ms total

- [ ] T060 [US1] Write E2E test for 3-tap copy flow — `tests/e2e/copy-prompt.spec.ts`:
  - Mobile viewport 390×844, clipboard permission granted
  - Assert URL changes to `/pathology/myocardial-infarction` after generate
  - Assert clipboard contains "Myocardial Infarction" and "Pathogenesis"
  - Assert `aria-live` region announces "Copied!"
  - Assert subject card `aria-pressed: true` after selection
  - Done when test runs green on Playwright Chromium + WebKit

- [ ] T061 [US1] Write prompt quality eval tests — `tests/prompts/pathology.eval.ts`:
  - 5 tests: topic appears in output, ≥7 `##` sections present, `⚠️ Verify` disclaimer present, length < 5000 chars, no `<script>` injection possible
  - Done when all 5 pass for topics: MI, Pneumonia, Cirrhosis

**Phase 3 / User Story 1 Checkpoint**: The full 3-tap flow works end-to-end. Abbreviation normalizer expands "MI" silently. Prompt renders. Copy button works on iOS Safari + Android Chrome + Desktop. E2E suite is green.

---

## Phase 4: User Story 2 — Shareable Deep Links with Edge Caching (Priority: P2)

**Goal**: A user can share `/pathology/myocardial-infarction` to a friend on WhatsApp. The friend opens the link and sees the prompt instantly (from edge cache), with correct OG image/title for WhatsApp card preview.

**Independent Test**:
1. Navigate directly to `/pathology/myocardial-infarction` (cold cache)
2. Verify prompt renders with TTFB < 200ms
3. Verify `X-Cache: HIT` on second request
4. Verify `<title>` contains "Myocardial Infarction | Pathology — MedPrompts"
5. Verify `og:image` URL resolves to a valid PNG
6. Open in WhatsApp link preview simulator — card renders correctly

### Dynamic Prompt Route

- [ ] T062 [P] [US2] Implement dynamic prompt page — `src/app/[subject]/[topic]/page.tsx`:
  - `export const runtime = 'edge'`
  - Parse `params.subject` with `SubjectIdSchema`, `params.topic` with `Slug.parse()` — `notFound()` on failure
  - Call `PromptEngine.generate()` → render `<PromptDisplay>` with result
  - Set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
  - `generateMetadata()`: title = `${titleCaseTopic} | ${subject} — MedPrompts`
  - Done when `curl /pathology/myocardial-infarction` returns 200 with `Cache-Control` header set

- [ ] T063 [P] [US2] Implement OG image generation route — `src/app/api/og/route.tsx`:
  - Query params: `?subject=pathology&topic=myocardial-infarction`
  - Uses `@vercel/og` (Satori) — renders `<div>` to PNG at 1200×630
  - OG card design: MedPrompts logo, subject icon, topic name in large type, "medprompts.mostafayaser.earth" in footer
  - Returns `new ImageResponse(...)` with `max-age=86400`
  - Done when `curl "/api/og?subject=pathology&topic=myocardial-infarction"` returns `image/png` content-type

- [ ] T064 [US2] Implement `generateMetadata()` for dynamic route — inside `src/app/[subject]/[topic]/page.tsx`:
  ```typescript
  export async function generateMetadata({ params }): Promise<Metadata> {
    return {
      title: `${topic} | ${subject} — MedPrompts`,
      description: `Get a structured study prompt for ${topic} in ${subject} — optimized for medical boards.`,
      openGraph: { title, description, images: [{ url: `/api/og?subject=${subject}&topic=${topic}` }] },
      twitter: { card: 'summary_large_image', title, description },
    };
  }
  ```
  — Done when `<meta property="og:image">` is correct on the rendered page

- [ ] T065 [P] [US2] Implement `generateStaticParams()` for top 100 high-yield topics — `src/app/[subject]/[topic]/page.tsx`:
  - Queries `topics_seed WHERE is_high_yield = true LIMIT 100`
  - Returns `[{ subject: string, topic: string }]` array
  - These routes are pre-rendered at build time — zero Worker roundtrip on first load
  - Done when `pnpm build` output shows 100 static pages generated for prompt routes

- [ ] T066 [US2] Update URL history when prompt is generated from home flow — `src/app/page.tsx` + `TopicInput`:
  - After generate, call `router.push(`/${subjectId}/${slug}`)` — standard Next.js navigation
  - On back-navigation: URL remains `/`, state is cleared
  - Done when browser Back button works correctly after navigating to a prompt page

### Tests for User Story 2

- [ ] T067 [US2] Write E2E test for direct URL deep link — `tests/e2e/deep-link.spec.ts`:
  - Navigate directly to `/pathology/myocardial-infarction`
  - Assert prompt renders without selecting a subject
  - Assert `<title>` contains "Myocardial Infarction | Pathology"
  - Assert `og:image` meta tag resolves correctly
  - Assert copy button is visible and functional
  - Done when test runs green on Chromium + WebKit

- [ ] T068 [US2] Write E2E test for OG metadata — `tests/e2e/og-metadata.spec.ts`:
  - Assert `<title>` format for 3 different subject/topic combinations
  - Assert `og:title`, `og:description`, `og:image` all present and non-empty
  - Assert `twitter:card: summary_large_image`
  - Done when all meta tag assertions pass

**Phase 4 / User Story 2 Checkpoint**: Direct URL navigation renders the correct prompt. WhatsApp/Telegram link preview shows OG card. TTFB < 50ms on cache hit. 100 high-yield topics are pre-rendered at build time.

---

## Phase 5: Polish, Cross-Cutting Concerns & Launch Readiness

**Purpose**: Production hardening — accessibility, performance, monitoring, documentation, and the V1.0 Definition of Done checklist.

### Accessibility (WCAG 2.1 AA)

- [ ] T069 [P] Add `<SkipToContent>` link — `src/components/ui/SkipToContent.tsx`:
  - `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` in `layout.tsx`
  - Done when keyboard user can skip navigation with Tab

- [ ] T070 [P] Verify color contrast — `src/app/globals.css`:
  - All text ≥ 4.5:1 contrast against background (WCAG AA)
  - Focus indicators ≥ 3:1 contrast
  - Done when `axe-core` audit reports zero contrast violations

- [ ] T071 [P] Run automated accessibility audit in CI — `.github/workflows/ci.yml`:
  - Add `pnpm exec axe-core` step in `e2e` job
  - Zero critical violations = pass
  - Done when CI step runs and reports no critical violations

### Performance

- [ ] T072 [P] Add Lighthouse CI — `.github/workflows/ci.yml`:
  - `lhci autorun` in `build` job
  - Assertions: `performance ≥ 0.95`, `accessibility ≥ 0.95`, `best-practices ≥ 0.95`, `seo ≥ 1.0`
  - Done when CI Lighthouse job runs green on a fresh build

- [ ] T073 [P] Audit and minimize JS bundle — `next.config.ts`:
  - Add `@next/bundle-analyzer` with `ANALYZE=true` trigger
  - Add `optimizePackageImports: ['lucide-react']`
  - Verify lucide icons use deep imports, not barrel imports
  - Done when `pnpm bundle:check` reports JS gzip < 80KB

- [ ] T074 [P] Self-host Inter font with `font-display: swap` — `src/app/layout.tsx`:
  - Use `next/font/google` with `subsets: ['latin']` (downloads at build time)
  - No external Google Fonts DNS lookup at runtime
  - Done when network panel shows 0 requests to `fonts.googleapis.com`

### Monitoring & Operations

- [ ] T075 [P] Add Plausible analytics script to layout — `src/app/layout.tsx`:
  - `<Script src="https://plausible.io/js/script.js" data-domain="medprompts.mostafayaser.earth" />`
  - Verify custom events fire in Plausible dashboard
  - Done when "Prompt Generated" event appears in Plausible within 5min of a test generate

- [ ] T076 [P] Implement `/api/health` uptime check — `src/app/api/health/route.ts`:
  - Pings Turso DB with `SELECT 1`
  - Returns `{ status: 'ok', db: 'ok', ts: Date.now() }` on success
  - Returns `{ status: 'degraded', db: 'error' }` on DB failure, HTTP 503
  - Done when UptimeRobot monitors this endpoint every 5 minutes

- [ ] T077 [P] Configure Sentry error tracking — `src/lib/logger.ts` + `next.config.ts`:
  - `Sentry.init()` with DSN from `NEXT_PUBLIC_SENTRY_DSN` env var
  - Wrap `PromptEngine.generate()` errors with `Sentry.captureException()`
  - Done when a manually triggered error appears in the Sentry dashboard

### Documentation

- [ ] T078 [P] Write initial ADR documents:
  - `docs/adr/ADR-001-cloudflare-workers.md`
  - `docs/adr/ADR-002-turso-drizzle.md`
  - `docs/adr/ADR-003-no-llm-v1.md`
  - `docs/adr/ADR-004-result-type.md`
  - `docs/adr/ADR-005-branded-types.md`
  - Done when each ADR has: Status, Context, Decision, Consequences, Alternatives Considered

- [ ] T079 [P] Create `docs/clinical-review-checklist.md`:
  - 9 criteria from the Playbook §20 (sections present, keywords, constraints, disclaimer, etc.)
  - Reviewer qualification requirements
  - Done when a medical educator can use this doc to review a new prompt template

- [ ] T080 [P] Update `quickstart.md` with final onboarding instructions:
  - 5 steps: clone → pnpm install → env vars → db:push + seed → pnpm dev
  - New engineer productive in < 10 minutes
  - Done when a fresh clone + quickstart produces a working dev server

### Pre-Launch V1.0 Checklist

- [ ] T081 [US1] Seed remaining 5 subject templates (anatomy, physiology, pharmacology, microbiology, biochemistry) — all validated against `validateTemplate()` and clinical review checklist — `scripts/seed.ts`

- [ ] T082 Medical educator review of all 6 templates — `docs/clinical-review-checklist.md`:
  - Each template reviewed by a ≥4th-year medical student
  - Sign-off recorded in `changelog` column of `prompt_templates` table

- [ ] T083 Production deployment to Cloudflare Pages:
  - `wrangler pages deploy` via CI on merge to `main`
  - KV namespaces provisioned with real IDs
  - Turso database provisioned and seeded
  - Done when `https://medprompts.mostafayaser.earth` serves the home page

- [ ] T084 Post-deploy smoke tests:
  - Manually verify 3-tap flow on iPhone (iOS Safari) + Android (Chrome) + MacBook (Safari)
  - Verify OG card renders correctly when pasted into WhatsApp
  - Verify `X-Cache: HIT` on second load of the same prompt URL
  - Verify `/api/health` returns 200
  - Verify Plausible events appear in dashboard

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete — BLOCKS all user stories
- **Phase 3 (US1)**: Requires Phase 2 complete
- **Phase 4 (US2)**: Requires Phase 3 complete (US2 builds on US1's routing pattern)
- **Phase 5 (Polish)**: Can begin in parallel with Phase 4 for non-UI tasks

### Within-Phase Parallelism

**Phase 2 parallel groups** (all [P] tasks are independent — different files):
```
Group A (L1 types):    T015, T016, T017, T018, T019
Group B (L1 logic):    T020, T021, T022, T023, T024, T025, T026, T027
Group C (L2 I/O):      T028, T029, T030, T031, T032, T033, T034, T035, T036, T037
Sequential:            T038 (needs T024, T025, T026) → T039 (needs all L2)
```

**Phase 3 parallel groups**:
```
Group A (API):         T044
Group B (UI):          T045, T046, T048, T049, T050, T051, T052, T053
Group C (Tests):       T055, T056, T057, T058
Sequential:            T047 (needs T045, T046) → T054 → T059, T060, T061
```

---

## Parallel Execution Examples

### Phase 2 — Max Parallelism (8 agents)

```
Agent 1: T015 (Result type) + T016 (Branded types) + T019 (Zod schemas)
Agent 2: T020 (injector) + T021 (sanitizer) + T022 (slugifier)
Agent 3: T023 (evaluator) + T024 (abbreviationNormalizer) + T025 (identityNormalizer)
Agent 4: T026 (contract) + T027 (i18n)
Agent 5: T028 (DB schema) + T029 (DB client)
Agent 6: T030 (loader) + T031 (PromptCache) + T032 (NormalizerCache)
Agent 7: T033 (repository) + T034 (rateLimit) + T035 (securityHeaders)
Agent 8: T036 (analytics) + T037 (clipboard)
→ All done → Agent 1: T038 (NormalizerPipeline) → Agent 1: T039 (PromptEngine)
```

### Phase 3 — 4-Agent Split

```
Agent 1: T040, T041, T042, T043 (DB seed)
Agent 2: T045, T046, T047 (SubjectGrid + Home page)
Agent 3: T048, T049, T050, T051, T052, T053 (TopicInput + PromptDisplay + CopyEngine)
Agent 4: T055, T056, T057, T058 (unit + property tests)
→ All done → T044 (API route) → T054 (middleware) → T059, T060, T061 (integration + E2E)
```

---

## Implementation Strategy

### MVP First — Ship US1 Only

1. Complete Phase 1 (Setup) — 1 day
2. Complete Phase 2 (Foundation) — 2 days
3. Complete Phase 3 (User Story 1) — 2 days
4. **STOP AND VALIDATE**: Run E2E suite, manually test on mobile, verify Lighthouse 95+
5. Deploy to Cloudflare Pages preview
6. Share with 5 medical students for usability feedback

### Incremental Delivery

1. Phase 1 + 2 → Foundation complete → internal demo
2. + Phase 3 (US1) → "Find and copy a prompt" works → beta release
3. + Phase 4 (US2) → Shareable URLs → viral sharing mechanism live
4. + Phase 5 (Polish) → V1.0 Definition of Done complete → production launch

### Team Parallel Strategy (3 engineers)

```
Once Phase 2 is complete:
  Engineer A: Phase 3 (US1) — core UI
  Engineer B: Phase 4 (US2) — routing + OG
  Engineer C: Phase 5 (Polish) — accessibility, monitoring, docs
```

---

## Notes

- **[P] tasks** = different files, zero dependency on incomplete sibling tasks — safe to parallelize
- **[Story] labels** map each task to a specific user story for traceability and independent demo
- **Acceptance criteria** on each task — "Done When" is the test, not the code
- **All L1 tasks** (T015–T027) can be tested with zero infrastructure — fastest iteration cycle
- **Avoid** mutating any L1 pure function to add a side effect — write a new L2 wrapper instead
- **Commit after each task** or logical group — small commits make rollback trivial
- **Never merge** a task that makes `pnpm test` fail — CI gate is mandatory, not advisory
