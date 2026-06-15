# Implementation Plan: Promptica V1 Core

**Branch**: `003-promptica-v1` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

> **Authored at Principal SWE level.** Every decision is justified. Alternatives are documented. No YAGNI violations. Read before touching any code.

---

## Table of Contents

1. [Summary & Strategic Non-Negotiables](#summary)
2. [Technical Context & Decision Matrix](#technical-context)
3. [Architecture: 4-Layer Module Hierarchy](#architecture)
4. [Full Project Source Tree](#project-structure)
5. [Database Schema & Data Layer](#database-schema)
6. [SOLID Principles — Concrete Mapping](#solid-principles)
7. [Type Safety Stack — End-to-End](#type-safety-stack)
8. [Core Engine Reference Implementations](#core-engine)
9. [Caching Architecture (Two-Tier)](#caching-architecture)
10. [Performance Budget & Optimization Tactics](#performance-budget)
11. [Security Architecture (9 Layers)](#security-architecture)
12. [Analytics & Observability](#analytics)
13. [Testing Strategy & Pyramid](#testing-strategy)
14. [CI/CD Pipeline & Database Migration Safety](#cicd-pipeline)
15. [Operations: Monitoring, Alerting, Rollback](#operations)
16. [Scalability Roadmap](#scalability-roadmap)
17. [Constitution Check](#constitution-check)
18. [Complexity Tracking](#complexity-tracking)
19. [Anti-Patterns Catalogue](#anti-patterns)
20. [Decision Records (ADRs)](#adrs)

---

## Summary

Build the V1 core of Promptica — a **zero-latency, zero-LLM, string-transformation-based** medical prompt generator. The system is a pure function of `(subjectId, topicSlug)`, served from the Cloudflare edge with aggressive two-tier caching, a 4-layer SOLID-compliant engine, and end-to-end TypeScript type safety enforced by Zod schemas and Branded domain primitives.

### Strategic Non-Negotiables

| Decision | Rationale |
|---|---|
| **MedPrompt never calls an LLM in V1** | Zero API cost, no vendor lock-in, deterministic output, infinite cacheability, no content moderation liability |
| **Templates with `{{TOPIC}}` placeholder only** | Deterministic, snapshot-testable, Git-auditable, zero non-deterministic failure modes |
| **Cloudflare Edge over Vercel/AWS** | 0ms cold start (V8 isolates), 300+ edge nodes, $0 at 100k users, built-in KV, atomic Rate Limiter |
| **No in-memory Map as cache** | Worker isolates are stateless; a `new Map()` is destroyed after every request — 0% cross-request hit rate |
| **No exceptions from pure functions** | `Result<T, E>` discriminated union makes error paths first-class typed citizens; no invisible throw contracts |

---

## Technical Context

| Dimension | Decision | Justification | Alternative Rejected |
|---|---|---|---|
| **Language** | TypeScript 5.5+ `strict: true`, `exactOptionalPropertyTypes: true` | Compile-time catch for injection/state bugs | `any`-heavy JS — unacceptable in medical domain |
| **Framework** | Next.js 15 (App Router + Edge Runtime via OpenNext) | RSC for zero-JS prompt pages; edge-native functions | Remix (less mature edge story), SvelteKit (smaller ecosystem) |
| **Hosting** | Cloudflare Pages + Workers (deployed with OpenNext) | 0ms cold start, 300+ locations, $0/100k users | Vercel ($40+/1M req, cold starts), AWS Lambda@Edge (complex) |
| **Database** | Turso (libSQL over HTTP) + Drizzle ORM | SQLite semantics, HTTP transport (CF Workers compatible), pure JS driver | Prisma (5MB runtime, no edge), `better-sqlite3` (native bindings, CF incompatible) |
| **Schema Validation** | Zod 3 | Schema → TypeScript type inference; composable validators; 12KB bundle | `io-ts` (verbose), `yup` (no inference quality), `class-validator` (OOP-heavy) |
| **Template Engine** | Custom `split().join()` (see §Core Engine) | Pure function, no regex `$$` bugs, snapshot-testable, zero dependency | Mustache (5KB dep, not needed for single-variable templates) |
| **KV Cache** | Cloudflare KV (`PROMPT_CACHE_KV` namespace) | Globally distributed, TTL-native, 7-day max TTL | `caches.default` only (no programmatic invalidation), Upstash Redis (extra latency) |
| **Rate Limiting** | Cloudflare `RateLimit` binding (atomic) | No TOCTOU race; enforced in CF network, not JS isolate | KV read-modify-write (race condition — two isolates both read count=59, both pass) |
| **Analytics** | Plausible (cookieless, script + custom events) | No consent banner; GDPR/CCPA/Egyptian DPL compliant; no fingerprinting | Google Analytics (cookies, consent required), Mixpanel (PII risk) |
| **Testing** | Vitest + Playwright + fast-check | Vitest: ESM-native, fast; Playwright: real browser; fast-check: property invariants | Jest (slow ESM story), Cypress (heavy), manual testing (unscalable) |
| **Package Manager** | pnpm (strict + frozen lockfile in CI) | Phantom-dep prevention; disk-efficient; strict mode | npm (phantom deps), Yarn (slower) |
| **CI/CD** | GitHub Actions (matrix: lint → db-safety → test → build → e2e → deploy) | Free for public repos; integrates with Cloudflare Wrangler action | CircleCI (paid), Jenkins (self-hosted complexity) |

---

## Architecture: 4-Layer Module Hierarchy

The codebase enforces a **strict, one-directional dependency graph**. ESLint `import/no-restricted-paths` violations are CI-breaking errors — not warnings.

```
┌──────────────────────────────────────────────────────────┐
│  Layer 4: HTTP / Routes (app/*, middleware.ts)           │
│  Next.js App Router pages, API routes, CF Worker entry   │
│  — May import from any layer.                            │
│  — Is the only layer that knows about HTTP verbs.        │
└─────────────────────┬────────────────────────────────────┘
                      │ depends on
┌─────────────────────▼────────────────────────────────────┐
│  Layer 3: Orchestration (lib/prompts/service.ts,         │
│           lib/prompts/normalizer/pipeline.ts)            │
│  PromptEngine + NormalizerPipeline — DIP via interfaces  │
│  — May import from L1 and L2.                            │
│  — Never from L4.                                        │
└─────────────────────┬────────────────────────────────────┘
                      │ depends on
┌─────────────────────▼────────────────────────────────────┐
│  Layer 2: I/O Wrappers (lib/db/, lib/prompts/loader.ts,  │
│           lib/prompts/cache.ts, lib/clipboard.ts,        │
│           lib/analytics.ts, lib/security/)               │
│  DB client, KV cache, analytics — all stateless          │
│  — May import from L1 only.                              │
│  — Never from L3 or L4.                                  │
└─────────────────────┬────────────────────────────────────┘
                      │ depends on
┌─────────────────────▼────────────────────────────────────┐
│  Layer 1: Pure (lib/types/, lib/prompts/injector.ts,     │
│           sanitizer.ts, slugifier.ts, schema.ts,         │
│           evaluator.ts, logger.ts, normalizer/contract.ts│
│           normalizer/identity.ts, abbreviation.ts)       │
│  Zero I/O dependencies — pure functions only             │
│  — MUST NOT import from any other application layer.     │
│  — External libraries (Zod, fast-check) allowed.         │
└──────────────────────────────────────────────────────────┘
```

**ESLint enforcement (`.eslintrc.js`):**
```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/lib/prompts/injector.ts',  from: './src/lib/db' },
    { target: './src/lib/prompts/sanitizer.ts', from: './src/lib/db' },
    { target: './src/lib/prompts/slugifier.ts', from: './src/lib/db' },
    { target: './src/lib/prompts/service.ts',   from: './src/app'    },
  ]
}]
```

---

## Project Structure

### Documentation

```text
specs/003-promptica-v1/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Architectural decisions + rationale
├── data-model.md        ← Entity definitions
├── quickstart.md        ← Developer setup guide
├── contracts/
│   └── prompt-engine.md ← Interface contracts
└── tasks.md             ← Execution tasks (speckit-tasks output)
```

### Source Tree (Annotated by Layer)

```text
src/
├── app/                                        # [L4] Next.js App Router
│   ├── layout.tsx                              # Root layout: <html lang="en">, Meta, CSP nonce injection
│   ├── page.tsx                                # / — Subject grid (RSC, fetches subjects from DB)
│   ├── [subject]/
│   │   ├── page.tsx                            # /[subject] — Topic list landing page (ISR, 1h revalidate)
│   │   └── [topic]/
│   │       └── page.tsx                        # /[subject]/[topic] — Prompt render (Edge Runtime, cached)
│   ├── api/
│   │   ├── generate/route.ts                   # POST /api/generate — topic inject + KV write (edge)
│   │   ├── og/route.tsx                        # GET /api/og?subject=&topic= — OG image (Satori)
│   │   └── health/route.ts                     # GET /api/health — uptime check (returns 200 + DB ping)
│   ├── error.tsx                               # Global error boundary (RSC)
│   ├── not-found.tsx                           # 404 page
│   └── globals.css                             # Critical CSS only — typography, color tokens
│
├── components/                                 # [L4] React components (Server + Client)
│   ├── SubjectGrid/
│   │   ├── SubjectGrid.tsx                     # RSC — subject cards from DB, no client JS
│   │   ├── SubjectCard.tsx                     # 'use client' — hover state, keyboard focus
│   │   └── SubjectGrid.types.ts                # Props interfaces
│   ├── TopicInput/
│   │   ├── TopicInput.tsx                      # 'use client' — debounced input, abbreviation hints
│   │   ├── TopicInput.reducer.ts               # inputReducer: idle | typing | validating | error
│   │   └── TopicInput.types.ts                 # TopicInputState discriminated union
│   ├── PromptDisplay/
│   │   ├── PromptDisplay.tsx                   # RSC — renders prompt as <pre><code> (textContent)
│   │   └── PromptDisplay.types.ts
│   ├── CopyEngine/
│   │   ├── CopyButton.tsx                      # 'use client' — 3-level fallback (Clipboard API → execCommand → manual)
│   │   ├── CopyButton.reducer.ts               # copyReducer: idle | copying | success | manual-fallback | error
│   │   └── CopyButton.types.ts                 # CopyState + CopyAction discriminated unions
│   ├── ManualCopySheet/
│   │   ├── ManualCopySheet.tsx                 # 'use client' — bottom sheet modal for manual copy fallback
│   │   └── useFocusTrap.ts                     # Focus trap hook (WCAG 2.1 AA modal management)
│   └── ui/                                     # Primitive design system components (no domain logic)
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Sheet.tsx                            # Bottom sheet component
│       └── SkipToContent.tsx                   # WCAG skip-link
│
├── lib/                                        # [L1–L3] Core domain engine
│   │
│   ├── types/                                  # [L1] — zero application deps
│   │   ├── result.ts                           # Result<T,E>, ok(), err(), map(), flatMap(), unwrapOr()
│   │   ├── branded.ts                          # Topic, SubjectId, Slug, SanitizedTopic + smart constructors
│   │   └── env.d.ts                            # Cloudflare Worker Env interface (KV, RateLimit, DB vars)
│   │
│   ├── prompts/                                # [L1–L3] Prompt engine
│   │   ├── injector.ts                         # [L1] injectTopic(template, topic) → Result<InjectionSuccess, InjectionError>
│   │   ├── sanitizer.ts                        # [L1] sanitizeTopic(raw) — INJECTION_PATTERNS + length + unicode allowlist
│   │   ├── slugifier.ts                        # [L1] slugifyTopic(topic) → Slug — FNV-1a hash suffix for long topics (≤74 chars)
│   │   ├── schema.ts                           # [L1] Zod: SubjectIdSchema, TopicSchema, PromptTemplateSchema
│   │   ├── evaluator.ts                        # [L1] validateTemplate() — quality gate (min sections, disclaimer, length bounds)
│   │   ├── loader.ts                           # [L2] getActiveTemplate(db, subjectId) → Promise<Template | null>
│   │   ├── cache.ts                            # [L2] KV-backed PromptCache (FNV-1a key, TTL 1h, null on corrupt entry)
│   │   ├── repository.ts                       # [L2] activateTemplate() — atomic DB transaction, busts KV cache
│   │   ├── service.ts                          # [L3] PromptEngine class — DIP via PromptEngineDeps interface
│   │   └── normalizer/
│   │       ├── contract.ts                     # [L1] TopicNormalizer interface (OCP) — name, requiresNetwork, normalize(), isEnabled()
│   │       ├── identity.ts                     # [L1] identityNormalizer — trim only, confidence 1.0
│   │       ├── abbreviation.ts                 # [L1] abbreviationNormalizer — ABBREVIATION_MAP + TYPO_MAP, sub-ms
│   │       ├── cache.ts                        # [L2] NormalizerCache — KV-backed (NORMALIZER_CACHE_KV), FNV-1a key, 7-day TTL
│   │       └── pipeline.ts                     # [L3] NormalizerPipeline — timeout per stage, short-circuit on high confidence
│   │
│   ├── db/
│   │   ├── schema.ts                           # [L2] Drizzle: subjects, prompt_templates, topics_seed, prompt_events
│   │   └── client.ts                           # [L2] createDb(env) — factory fn, NO global state, NO module-level instance
│   │
│   ├── clipboard.ts                            # [L2] copyToClipboard(text) — Clipboard API → execCommand → manual fallback
│   ├── analytics.ts                            # [L2] Plausible events: Prompt Generated, Prompt Copied, Shared URL Visited
│   ├── logger.ts                               # [L1] Logger interface + cloudflareLogger (JSON stdout) + noopLogger + TestLogger
│   ├── i18n/
│   │   └── messages.ts                         # [L1] MessageKey union, en + ar Messages, t() helper
│   └── security/
│       ├── headers.ts                          # [L2] securityHeaders() — CSP (no unsafe-inline), HSTS, X-Frame-Options: DENY
│       └── rateLimit.ts                        # [L2] rateLimit(request, env) — atomic CF RateLimit binding (60 req/60s/IP)
│
├── middleware.ts                               # [L4] Edge middleware — rate limit → cache check → security headers
├── next.config.ts                              # Next.js config: edge runtime, optimizePackageImports, bundle analyzer
├── wrangler.toml                               # CF Workers config: KV namespaces, RateLimit binding, env vars
├── drizzle.config.ts                           # Drizzle Kit config: migrations dir, Turso connection
└── tsconfig.json                               # strict: true, exactOptionalPropertyTypes: true, paths aliases

tests/
├── unit/
│   ├── injector.test.ts                        # Result<T,E> assertions, placeholder replacement, defense-in-depth
│   ├── sanitizer.test.ts                       # Injection patterns, length, unicode, empty input
│   ├── slugifier.test.ts                       # FNV-1a hash, long topic collision, diacritics, idempotent
│   ├── result.test.ts                          # ok(), err(), map(), flatMap(), unwrapOr()
│   └── abbreviation.test.ts                    # ABBREVIATION_MAP + TYPO_MAP lookup coverage
├── property/
│   └── slugifier.prop.test.ts                  # fast-check: url-safe, idempotent, ≤74 chars, collision resistance
├── integration/
│   ├── prompt-flow.test.ts                     # PromptEngine full flow with in-memory fakes (DIP enables this)
│   └── normalizer-pipeline.test.ts             # Pipeline timeout, short-circuit, stage failure graceful degradation
├── prompts/                                    # Prompt quality evaluation (structural, not LLM output)
│   ├── pathology.eval.ts                       # Section count ≥7, disclaimer present, length bounded
│   ├── anatomy.eval.ts
│   └── pharmacology.eval.ts
└── e2e/
    ├── copy-prompt.spec.ts                     # Playwright: 3-tap flow, clipboard assertion, mobile 390×844
    ├── deep-link.spec.ts                       # Direct URL → prompt rendered, TTFB <100ms assertion
    └── og-metadata.spec.ts                     # OG title/description/image correctness per route

docs/
├── adr/
│   ├── ADR-001-cloudflare-workers.md           # Hosting decision record
│   ├── ADR-002-turso-drizzle.md                # Database decision record
│   └── ADR-003-no-llm-v1.md                   # Zero-LLM decision record
├── clinical-review-checklist.md                # Medical educator sign-off criteria
└── migration-safety.md                         # Expand-contract pattern documentation
```

---

## Database Schema

All four tables defined in Drizzle + annotated with index strategy:

```typescript
// src/lib/db/schema.ts

// subjects — top-level menu items, drives the subject grid UI
export const subjects = sqliteTable('subjects', {
  id:        text('id').primaryKey(),              // 'pathology' — kebab-case, SubjectId branded type
  label:     text('label').notNull(),              // 'Pathology' — display label
  icon:      text('icon').notNull(),               // 'microscope' — lucide-react icon name
  sortOrder: integer('sort_order').notNull().default(0),
  isActive:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (t) => ({
  sortIdx: index('subjects_sort_idx').on(t.sortOrder),    // ORDER BY sort_order scan
}));

// prompt_templates — append-only versioned rows; one is_active=true per subject
export const promptTemplates = sqliteTable('prompt_templates', {
  id:        text('id').primaryKey(),              // 'pathology_v3' — format: {subjectId}_v{version}
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  version:   integer('version').notNull(),
  template:  text('template').notNull(),           // Contains {{TOPIC}} — validated by PromptTemplateSchema (100–8000 chars)
  changelog: text('changelog'),                    // Why this version exists (required for reviewer approval)
  isActive:  integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by'),                   // Editor email (accountability, not PII)
}, (t) => ({
  activeSubjectIdx: index('templates_active_subject_idx').on(t.subjectId, t.isActive), // Hot path index
}));

// topics_seed — enables autocomplete + pre-generates SEO landing pages for high-yield topics
export const topicsSeed = sqliteTable('topics_seed', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  subjectId:   text('subject_id').notNull().references(() => subjects.id),
  topic:       text('topic').notNull(),             // 'Myocardial Infarction' — display form
  slug:        text('slug').notNull(),              // 'myocardial-infarction' — URL form
  isHighYield: integer('is_high_yield', { mode: 'boolean' }).notNull().default(false),
}, (t) => ({
  uniqueSubjectSlug: uniqueIndex('topics_seed_unique').on(t.subjectId, t.slug),   // Dedup constraint
  subjectIdx:        index('topics_seed_subject_idx').on(t.subjectId),             // Autocomplete scan
  highYieldIdx:      index('topics_seed_high_yield_idx').on(t.isHighYield),        // High-yield filter
}));

// prompt_events — anonymous usage analytics (no PII)
export const promptEvents = sqliteTable('prompt_events', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  subjectId:  text('subject_id').notNull(),
  topicSlug:  text('topic_slug').notNull(),
  copyMethod: text('copy_method'),                  // 'clipboard-api' | 'exec-command' | 'manual'
  uaClass:    text('ua_class'),                     // 'mobile' | 'desktop' | 'tablet'
  copiedAt:   text('copied_at').default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  copiedAtIdx:  index('events_copied_at_idx').on(t.copiedAt),
  subjectIdx:   index('events_subject_idx').on(t.subjectId),
}));
```

**DB Client Factory (never use a global instance):**
```typescript
// src/lib/db/client.ts
export type Database = ReturnType<typeof createDb>;

export function createDb(env: { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string }) {
  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema, logger: false });
}
// ✅ Correct: called per-request in the Worker, receives env from context
// ❌ Wrong:   export const db = createDb(process.env) — global state, Worker-incompatible
```

---

## SOLID Principles — Concrete Mapping

### Single Responsibility Principle

| Module | File | One Reason to Change |
|---|---|---|
| Injector | `lib/prompts/injector.ts` | Placeholder syntax changes (`{{TOPIC}}` → `${topic}`) |
| Sanitizer | `lib/prompts/sanitizer.ts` | New injection patterns emerge |
| Slugifier | `lib/prompts/slugifier.ts` | URL conventions or i18n requirements change |
| Loader | `lib/prompts/loader.ts` | Storage backend changes (DB → KV → file) |
| Repository | `lib/prompts/repository.ts` | DB write or activation logic changes |
| Cache | `lib/prompts/cache.ts` | Cache invalidation strategy changes |
| Analytics | `lib/analytics.ts` | Analytics provider changes (Plausible → Posthog) |

### Open/Closed Principle

```typescript
// [L1] contract.ts — the abstraction. NEVER CHANGES.
export interface TopicNormalizer {
  readonly name: string;
  readonly requiresNetwork: boolean;
  normalize(raw: string, ctx: NormalizerContext): Promise<NormalizationResult>;
  isEnabled(env: NormalizerEnv): boolean;
}

// V1.0: identityNormalizer (no-op) + abbreviationNormalizer (free, deterministic)
// V1.5: groqNormalizer (LLM, opt-in) — ADDED with zero changes to pipeline.ts
// V2.0: cerebrasNormalizer (BYOK) — ADDED with zero changes to pipeline.ts
```

### Liskov Substitution Principle

All consumers of `TemplateReader`, `PromptCache`, `Logger`, `Analytics` hold only interface references. In tests, `FakeTemplateReader`, `InMemoryPromptCache`, `noopLogger` substitute without breaking any contract.

### Interface Segregation Principle

```typescript
// ❌ FAT interface — forces page route to depend on publish/archive/search
interface TemplateRepository { getById(); getActive(); getAllVersions(); create(); update(); delete(); publish(); archive(); search(); }

// ✅ ROLE interfaces — each consumer gets exactly what it needs
interface TemplateReader    { getById(); getActiveBySubject(); }     // Used by: PromptEngine, RSC pages
interface TemplateWriter    { create(); update(); }                   // Used by: admin API routes (V1.5)
interface TemplatePublisher { publish(); archive(); }                 // Used by: content pipeline script
interface TemplateSearcher  { search(); }                            // Used by: admin UI (V1.5)
```

### Dependency Inversion Principle

```typescript
// [L3] service.ts — depends on ALL abstractions, ZERO concretions
export interface PromptEngineDeps {
  readonly templateReader: TemplateReader;   // interface
  readonly cache:          PromptCache;       // interface
  readonly sanitizer:      TopicSanitizer;   // interface
  readonly slugifier:      Slugifier;         // interface
  readonly analytics:      Analytics;         // interface
  readonly logger:         Logger;            // interface
}

export class PromptEngine {
  constructor(private readonly deps: PromptEngineDeps) {}
  // Full implementation — 0 imports from lib/db/, lib/clipboard.ts, or app/
}
```

---

## Type Safety Stack — End-to-End

```
[Browser] User types "MI" in TopicInput
    ↓ sanitizeTopic("MI") → Result<SanitizedTopic, ValidationError>
    ↓ on error: show user-facing error, stop here
SanitizedTopic (Branded<string, 'SanitizedTopic'>)
    ↓ abbreviationNormalizer.normalize("MI") → { cleaned: "Myocardial Infarction", strategy: 'abbreviation' }
    ↓ slugifyTopic("Myocardial Infarction") → "myocardial-infarction" (Slug branded type)
    ↓ router.push(`/${subjectId}/${slug}`)

[Edge Worker] GET /pathology/myocardial-infarction
    ↓ SubjectIdSchema.parse("pathology") → SubjectId branded type
    ↓ Slug.parse("myocardial-infarction") → Slug branded type
    ↓ PromptEngine.generate({ subjectId, topic }) → Result<PromptEngineOutput, PromptEngineError>
    ↓ on error.code === 'SUBJECT_NOT_FOUND' → return 404
    ↓ on error.code === 'TEMPLATE_MALFORMED' → return 500 + alert team
PromptEngineOutput { prompt: string, slug: Slug, metadata: { wordCount, fromCache } }
    ↓ RSC render: <pre>{output.prompt}</pre>  ← textContent, NEVER dangerouslySetInnerHTML
HTML served to browser
```

**The `Result<T, E>` type (src/lib/types/result.ts):**
```typescript
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
export const isOk  = <T, E>(r: Result<T, E>): r is { ok: true;  value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;
export const map     = <T, U, E>(r: Result<T, E>, fn: (t: T) => U): Result<U, E> => r.ok ? ok(fn(r.value)) : r;
export const flatMap = <T, U, E>(r: Result<T, E>, fn: (t: T) => Result<U, E>): Result<U, E> => r.ok ? fn(r.value) : r;
export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T => r.ok ? r.value : fallback;
```

**Branded Types with smart constructors:**
```typescript
// src/lib/types/branded.ts
declare const brand: unique symbol;
export type Branded<T, B> = T & { readonly [brand]: B };

export type Topic         = Branded<string, 'Topic'>;
export type SubjectId     = Branded<string, 'SubjectId'>;
export type Slug          = Branded<string, 'Slug'>;
export type SanitizedTopic = Branded<string, 'SanitizedTopic'>;

// Smart constructors — never expose raw casting at call sites
export const Topic = {
  parse(s: string): Result<Topic, ValidationError> { /* trim, length, injection check */ },
  unsafeParse(s: string): Topic { /* throws — test fixtures only */ },
};
```

---

## Core Engine Reference Implementations

### injectTopic — Pure, Total, No-Throw

```typescript
// src/lib/prompts/injector.ts — [L1]
export function injectTopic(template: string, topic: Topic): Result<InjectionSuccess, InjectionError> {
  if (template.trim().length === 0)
    return err({ code: 'TEMPLATE_EMPTY', message: 'Template is empty' });

  const PLACEHOLDER = '{{TOPIC}}';
  if (!template.includes(PLACEHOLDER))
    return err({ code: 'MISSING_PLACEHOLDER', message: `Template missing ${PLACEHOLDER}`, placeholder: PLACEHOLDER });

  if (topic.length > 120)  // Defense in depth — SanitizedTopic already checked, but be explicit
    return err({ code: 'TOPIC_TOO_LONG', message: 'Topic exceeds 120 chars', length: topic.length, max: 120 });

  // split().join() — NOT .replace(/regex/, topic) — avoids $$ escape bug in String.replace
  const output = template.split(PLACEHOLDER).join(topic);
  return ok({
    output,
    placeholderCount: (template.match(/\{\{TOPIC\}\}/g) ?? []).length,
    wordCount: output.split(/\s+/).length,
    characterCount: output.length,
  });
}
```

### slugifyTopic — FNV-1a Collision Safety

```typescript
// src/lib/prompts/slugifier.ts — [L1]
// Budget: 67 (body) + 1 (hyphen) + 6 (hash) = 74 chars ≤ 80 URL limit
const MAX_SLUG_BODY = 67;

function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).padStart(6, '0').slice(-6);
}

export function slugifyTopic(topic: Topic): Slug {
  const body = topic
    .toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')     // Remove non-alphanumeric
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (body.length <= MAX_SLUG_BODY) return body as Slug;  // Common case: no hash needed

  const truncated = body.slice(0, MAX_SLUG_BODY).replace(/-[^-]*$/, '');
  return `${truncated}-${fnv1a(body)}` as Slug;  // hash of FULL body — collision-resistant
}
// Invariants: idempotent, url-safe, ≤74 chars, deterministic per topic
```

### sanitizeTopic — Prompt Injection Defense

```typescript
// src/lib/prompts/sanitizer.ts — [L1]
const INJECTION_PATTERNS = [
  /ignore (?:previous|above|all|prior) instructions/i,
  /you are now/i,
  /pretend (?:you are|to be)/i,
  /\bsystem\s*prompt\b/i,
  /reveal (?:your|the) (?:instructions|prompt)/i,
  /disregard (?:previous|all|above)/i,
  /\bDAN\b/, // "Do Anything Now" jailbreak
  /jailbreak/i,
];
const ALLOWED_PATTERN = /^[\p{L}\p{N}\s\-,.'!?&()]+$/u;
const MAX_TOPIC_LENGTH = 120;

export function sanitizeTopic(raw: string): { ok: true; value: Topic } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'Topic cannot be empty' };
  if (trimmed.length > MAX_TOPIC_LENGTH) return { ok: false, reason: `Topic too long (max ${MAX_TOPIC_LENGTH} chars)` };
  for (const pattern of INJECTION_PATTERNS)
    if (pattern.test(trimmed)) return { ok: false, reason: 'Topic contains disallowed content' };
  if (!ALLOWED_PATTERN.test(trimmed)) return { ok: false, reason: 'Topic contains invalid characters' };
  return { ok: true, value: trimmed as Topic };
}
```

### copyToClipboard — 3-Level Fallback

```typescript
// src/lib/clipboard.ts — [L2]
export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (!window.isSecureContext) return tryExecCommand(text) ?? triggerManualFallback(text);

  try {
    await withTimeout(navigator.clipboard.writeText(text), 3000, 'Clipboard API timeout');
    return { ok: true, method: 'clipboard-api', bytes: text.length };
  } catch {
    return tryExecCommand(text) ?? triggerManualFallback(text);
  }
}

function tryExecCommand(text: string): CopyResult | null {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    const success = document.execCommand('copy');
    document.body.removeChild(ta);
    return success ? { ok: true, method: 'exec-command', bytes: text.length } : null;
  } catch { return null; }
}

function triggerManualFallback(text: string): CopyResult {
  return { ok: true, method: 'manual', bytes: text.length };
  // Caller displays ManualCopySheet with <pre> selected for user to Ctrl+C
}
```

### CopyButton State Machine (Discriminated Union)

```typescript
// src/components/CopyEngine/CopyButton.types.ts
export type CopyState =
  | { status: 'idle' }
  | { status: 'copying' }
  | { status: 'success'; method: 'clipboard-api' | 'exec-command' }
  | { status: 'manual-fallback'; promptText: string }
  | { status: 'error'; code: 'permission-denied' | 'insecure-context' | 'unknown'; retryable: boolean };

export type CopyAction =
  | { type: 'COPY_STARTED' }
  | { type: 'COPY_SUCCESS'; method: 'clipboard-api' | 'exec-command' }
  | { type: 'COPY_MANUAL'; promptText: string }
  | { type: 'COPY_ERROR'; code: 'permission-denied' | 'insecure-context' | 'unknown' }
  | { type: 'RESET' };

export function copyReducer(state: CopyState, action: CopyAction): CopyState {
  switch (action.type) {
    case 'COPY_STARTED':  return { status: 'copying' };
    case 'COPY_SUCCESS':  return { status: 'success', method: action.method };
    case 'COPY_MANUAL':   return { status: 'manual-fallback', promptText: action.promptText };
    case 'COPY_ERROR':    return { status: 'error', code: action.code, retryable: action.code !== 'permission-denied' };
    case 'RESET':         return { status: 'idle' };
  }
}
// TypeScript exhaustive switch — new CopyAction variants cause compile error if not handled
```

---

## Caching Architecture (Two-Tier)

```
Request: GET /pathology/myocardial-infarction

┌─── Tier 1: Cloudflare CDN Cache (caches.default) ──────────────┐
│  Cache-Control: public, max-age=3600, stale-while-revalidate=86400 │
│  X-Cache: HIT header                                               │
│  HIT: ~5ms response  MISS: falls through ↓                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─── Tier 2: Cloudflare KV (PROMPT_CACHE_KV) ────────────────────┐
│  Key: prompt:{subjectId}:{slug}                                    │
│  TTL: 3600s (1h)                                                   │
│  HIT: ~15ms response, reconstruct HTML  MISS: falls through ↓     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─── Turso DB (cold path) ────────────────────────────────────────┐
│  SELECT template FROM prompt_templates                             │
│  WHERE subject_id = ? AND is_active = 1                           │
│  (activeSubjectIdx composite index — O(log n) scan)               │
│  → injectTopic() → write to KV → write to L1 → return            │
│  Typical: 20–50ms total (Turso primary + inject + KV write)       │
└─────────────────────────────────────────────────────────────────┘

Cache Invalidation:
  On template activation via activateTemplate(db, templateId):
    1. Atomic DB transaction: deactivate old, activate new
    2. invalidateSubjectCache(subjectId, env) → delete all KV keys prefix `prompt:{subjectId}:`
    3. Cloudflare CDN purge via cache.delete() for all affected URLs
```

**wrangler.toml configuration:**
```toml
[[kv_namespaces]]
binding = "PROMPT_CACHE_KV"
id      = "<kv-namespace-id>"

[[kv_namespaces]]
binding = "NORMALIZER_CACHE_KV"
id      = "<normalizer-kv-namespace-id>"

[[unsafe.bindings]]
name         = "RATE_LIMITER"
type         = "ratelimit"
namespace_id = "1001"
simple       = { limit = 60, period = 60 }
```

---

## Performance Budget & Optimization Tactics

| Metric | Target | Critical Threshold | Alert | Measurement |
|---|---|---|---|---|
| **TTFB (CDN HIT)** | <5ms | <50ms | >50ms for 5min | Cloudflare Analytics |
| **TTFB (KV HIT)** | <50ms | <100ms | >100ms for 5min | Cloudflare Analytics |
| **TTFB (cold path)** | <200ms | <500ms | >500ms for 5min | Cloudflare Analytics |
| **LCP** | <1.5s | <2.5s | >2.5s P75 | Web Vitals |
| **INP** | <100ms | <200ms | >200ms P75 | Web Vitals |
| **CLS** | <0.05 | <0.10 | >0.10 | Web Vitals |
| **TBT** | <100ms | <200ms | >200ms | Lighthouse |
| **JS Bundle (gzip)** | <80KB | <150KB | CI gate (hard fail) | Bundle analyzer |
| **CSS Bundle (gzip)** | <20KB | <40KB | CI gate (hard fail) | Bundle analyzer |
| **Edge Worker CPU** | <10ms | <50ms | >50ms for 5min | Cloudflare logs |
| **Lighthouse Score** | 100/100 | 95/100 | CI gate (hard fail) | Lighthouse CI |

**Optimization tactics specific to Promptica:**
1. Pre-render the 100 highest-yield topics (`topics_seed.isHighYield = true`) at build time — zero Worker roundtrip
2. Use React Suspense streaming — TopicInput sheet doesn't block the prompt render
3. `<link rel="preconnect" href="https://*.turso.io">` — DNS warmup for cold path
4. Lazy-load OG image generator — it's a Worker route, not in the client bundle
5. Inline critical CSS (subject grid layout) — eliminates render-blocking CSS request
6. Self-host Inter font with `font-display: swap` — no FOIT, no external DNS lookup
7. `optimizePackageImports: ['lucide-react']` in next.config.ts — tree-shake icon imports
8. Forbidden dependencies: `moment` (290KB), `lodash` (530KB), `axios` (80KB), `uuid` (12KB — use `crypto.randomUUID()`)

---

## Security Architecture (9 Layers)

```
Layer 1: Cloudflare DDoS + WAF (free, always-on, no code)
Layer 2: CF RateLimit binding — atomic, 60 req/60s/IP (no TOCTOU race)
Layer 3: Zod schema validation — rejects malformed subjectId and topic at the edge
Layer 4: sanitizeTopic() — INJECTION_PATTERNS + max 120 chars + Unicode allowlist
Layer 5: injectTopic() — split().join() (no regex, no $$ escape bugs)
Layer 6: RSC renders <pre> via textContent — NEVER dangerouslySetInnerHTML
Layer 7: CSP headers — no 'unsafe-inline' (Tailwind is build-time, no runtime style injection)
Layer 8: HSTS + X-Frame-Options: DENY + Referrer-Policy + Permissions-Policy
Layer 9: SRI on any third-party scripts (none in V1 — Plausible self-hosted or proxied)
```

**Security headers (src/lib/security/headers.ts):**
```typescript
export function securityHeaders(response: Response): Response {
  const h = new Headers(response.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  h.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval' https://plausible.io",
    "style-src 'self'",                     // ✅ No unsafe-inline — Tailwind JIT is build-time only
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://plausible.io https://*.turso.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}
```

---

## Analytics & Observability

**Privacy model (GDPR + CCPA + Egyptian DPL — 70% of users are non-EU non-US med students):**
- No cookies → no consent banner required
- No PII: no IP persisted, no user IDs (no auth in V1), no raw topic strings stored
- `prompt_events` table stores only: `(subjectId, topicSlug, copyMethod, uaClass, copiedAt)`
- Plausible: cookieless, self-hostable, GDPR-compliant by design

**Custom Plausible events:**
```typescript
// src/lib/analytics.ts
export function trackPromptGenerated(subject: SubjectId, slug: Slug, latencyMs: number): void {
  window.plausible?.('Prompt Generated', { props: { subject, latency_bucket: bucketize(latencyMs) } });
}
export function trackPromptCopied(subject: SubjectId, method: CopyMethod): void {
  window.plausible?.('Prompt Copied', { props: { subject, method } });
}
export function trackSharedUrlVisited(subject: SubjectId, source: 'direct' | 'social' | 'search'): void {
  window.plausible?.('Shared URL Visited', { props: { subject, source } });
}
```

**Key operational metrics + alert thresholds:**

| Metric | Alert Threshold | Severity | Channel |
|---|---|---|---|
| Cache hit rate (L1+L2) | < 40% for 15min | P3 | Slack |
| P95 page latency | > 1s for 10min | P2 | Slack |
| 5xx error rate | > 1% for 5min | P2 | PagerDuty |
| 404 on /[subject]/[topic] | > 1% of requests | P3 | Slack |
| Clipboard API success | < 95% over 1h | P3 | Slack |
| D1/Turso errors | > 5 in 1min | P1 | PagerDuty |
| Site health check fails | 3 consecutive | P1 | PagerDuty |
| CF Workers quota | > 80% free tier | P3 | Slack |

**Structured logging — NEVER raw `console.log` in production code:**
```typescript
// Correct: injected logger (testable, structured)
this.deps.logger.info('prompt.generated', { subject, slug, wordCount, fromCache });

// Wrong: raw console (no context, no filtering, no test control)
console.log('Generated prompt for', slug);
```

---

## Testing Strategy

### Testing Pyramid

| Layer | Tool | Target Count | What It Tests |
|---|---|---|---|
| **Property tests** | Vitest + fast-check | ~20 invariants | Slugifier: idempotent, url-safe, ≤74 chars, collision-resistant |
| **Unit tests** | Vitest | ~200 tests | All L1 pure functions; Result<T,E> ok+err branches; discriminated union exhaustiveness |
| **Integration tests** | Vitest + in-memory fakes | ~50 tests | PromptEngine full flow; KV cache hit/miss; injection pattern rejection |
| **Prompt eval tests** | Vitest | ~30 tests | Structural quality: section count, disclaimer, length bounds per subject template |
| **E2E tests** | Playwright | ~10 tests | 3-tap copy flow; direct URL; OG metadata; mobile viewport; clipboard assertion |

### Key Test Patterns

**Pure function test (zero infrastructure):**
```typescript
it('replaces {{TOPIC}} using split().join() — no regex $$ bug', () => {
  const result = injectTopic('Learn {{TOPIC}} for boards.', 'Myocardial Infarction' as Topic);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.output).toBe('Learn Myocardial Infarction for boards.');
});
```

**Property test (fast-check invariants):**
```typescript
test.prop([fc.string({ minLength: 1, maxLength: 200 })])(
  'slugify is idempotent: slugify(slugify(x)) === slugify(x)',
  (input) => {
    const s1 = slugifyTopic(input as Topic);
    const s2 = slugifyTopic(s1 as Topic);
    expect(s1).toBe(s2);
  }
);
```

**Integration test (DIP enables this with zero infrastructure):**
```typescript
const engine = new PromptEngine({
  templateReader: createFakeTemplateReader([{ subjectId: 'pathology', template: 'Explain {{TOPIC}}.' }]),
  cache:          createInMemoryCache(),
  sanitizer:      { sanitize: sanitizeTopic },
  slugifier:      { slugify: slugifyTopic },
  analytics:      noopAnalytics,
  logger:         noopLogger,
});
const result = await engine.generate({ subjectId: 'pathology' as SubjectId, topic: 'Myocardial Infarction' as Topic });
expect(result.ok).toBe(true);
```

**E2E test (real browser, Playwright):**
```typescript
test('3-tap copy flow on mobile viewport', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /pathology/i }).click();
  await page.getByLabel(/topic/i).fill('Myocardial Infarction');
  await page.getByRole('button', { name: /generate/i }).click();
  await expect(page).toHaveURL(/\/pathology\/myocardial-infarction/);
  await page.getByRole('button', { name: /copy/i }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('Myocardial Infarction');
  expect(clipboard).toContain('Pathogenesis');
  await expect(page.getByText(/copied/i)).toBeVisible();
});
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

```
PR opened
  │
  ├─ job: lint (pnpm lint + pnpm typecheck)
  │
  ├─ job: db-safety (needs: lint)
  │   ├── pnpm drizzle-kit check — schema ↔ migration consistency
  │   └── grep for ADD COLUMN NOT NULL / DROP COLUMN / RENAME COLUMN (CI-breaking)
  │
  ├─ job: test (needs: [lint, db-safety])
  │   ├── pnpm test:unit
  │   ├── pnpm test:property
  │   └── pnpm test:integration
  │
  ├─ job: build (needs: test)
  │   ├── pnpm build (Next.js + OpenNext for CF Pages)
  │   └── pnpm bundle:check — fail if JS gzip > 80KB
  │
  └─ job: e2e (needs: build)
      └── Playwright against preview deployment

main branch push:
  └─ job: deploy (needs: [build, e2e])
      └── wrangler pages deploy → Cloudflare Pages
```

### Database Migration Safety

SQLite (Turso) has strict constraints on live schema changes. All migrations **MUST** follow the expand-contract pattern. The CI `db-safety` job blocks any PR containing:
- `ADD COLUMN ... NOT NULL` without a default value
- `DROP COLUMN`
- `RENAME COLUMN`

**Safe pattern for adding a NOT NULL column:**
1. Migration 1 (expand): `ADD COLUMN display_order INTEGER DEFAULT 0`
2. Backfill script (not a migration): `UPDATE topics_seed SET display_order = id WHERE display_order = 0`
3. Migration 2 (contract): Drizzle Kit generates the safe CREATE/INSERT/DROP sequence

**Safe pattern for renaming a column:** 5 deploy steps — add new → write to both → backfill → read new only → drop old. Never skip steps.

---

## Operations: Monitoring, Alerting, Rollback

**Monitoring stack (all free or near-free for V1.0):**
- Cloudflare Analytics — request volume, error rate, cache hit rate, Worker CPU time
- Plausible — page popularity, user behavior, custom events
- Sentry (free tier) — client-side errors, JS exceptions, performance traces
- UptimeRobot — 5-minute health check polling on `/api/health`

**One-command rollback:**
```bash
wrangler pages deployments list --project-name=promptica
wrangler pages deployments rollback <deployment-id> --project-name=promptica
```

**Incident response runbook:**
1. Acknowledge in #incidents within 5min
2. Assess: what's broken, user impact, escalating?
3. Mitigate: rollback if recent deploy; hotfix if DB migration issue
4. Communicate: status page update (Instatus)
5. Resolve: confirm metrics return to baseline
6. Post-mortem: blameless writeup within 48h, action items with owners

---

## Scalability Roadmap

| Version | Users | What Changes | Cost/mo | New Dependencies |
|---|---|---|---|---|
| **V1.0** | 0 → 10k | Single Turso DB, CF Pages, KV, Plausible free | **$0** | None |
| **V1.5** | 10k → 100k | Abbreviation normalizer, autocomplete from `topics_seed`, PWA install | **~$10** | Plausible paid |
| **V2.0** | 100k → 1M | Opt-in Groq LLM normalizer (BYOK), Turso read replicas 3 regions | **~$106** | Groq API (optional) |
| **V3.0** | 1M+ | Community marketplace, ClickHouse for analytics, institution licensing | Custom | ClickHouse |

**Unit economics (V1.0):**
100k users × 5 prompts/user/mo = 500k requests → **$0.15/mo** (Cloudflare Workers pricing).
Every new user costs $0.000003 in infrastructure. The cost moat is the entire competitive advantage.

---

## Constitution Check

| Gate | Status | Concrete Evidence |
|---|---|---|
| SRP: each module has one reason to change | ✅ | `injector.ts`, `sanitizer.ts`, `slugifier.ts`, `loader.ts`, `repository.ts` — each owns exactly one concern |
| OCP: extend without modifying | ✅ | `TopicNormalizer` interface — Groq normalizer adds behavior, zero changes to `pipeline.ts` |
| LSP: subtypes substitutable | ✅ | `TemplateReader`, `PromptCache`, `Logger` — in-memory fakes substitute in all tests |
| ISP: client-specific interfaces | ✅ | `TemplateReader` / `TemplateWriter` / `TemplatePublisher` — no fat repo interface |
| DIP: depend on abstractions | ✅ | `PromptEngine(deps: PromptEngineDeps)` — zero concrete deps in constructor |
| End-to-end type safety | ✅ | Zod → Branded types → Result<T,E> → textContent encoding — no raw string passes through |
| Zero LLM in V1 | ✅ | `injectTopic()` is `split().join()` — no network calls, no API keys |
| No in-memory cache (Worker stateless) | ✅ | KV-backed PromptCache + NormalizerCache — `new Map()` banned in module scope |
| Atomic rate limiting (no TOCTOU) | ✅ | CF `RateLimit` binding — counter lives in CF network, not JS isolate memory |
| No PII collected | ✅ | `prompt_events` schema has no user identifiers, no IP, no raw topic strings |
| CI-enforced performance budget | ✅ | Bundle size gate + Lighthouse CI — hard fail on PR |
| Migration safety enforced in CI | ✅ | `db-safety` job blocks destructive migration patterns |
| Accessibility WCAG 2.1 AA | ✅ | `useFocusTrap` hook, skip-link, semantic HTML, axe-core in CI |
| i18n-ready at launch | ✅ | `MessageKey` union + `t()` helper — Arabic `ar` messages defined at day 1 |

---

## Complexity Tracking

Every pattern in this codebase is present because a simpler alternative was considered and explicitly rejected:

| Pattern | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `Result<T, E>` discriminated union | Typed error paths | `throw` — invisible at the type level; non-deterministic latency on Workers |
| Branded types (`Topic`, `SubjectId`, `Slug`) | Compile-time domain safety | Plain `string` — allows passing `subjectId` where `topic` expected; entire bug class |
| 4-layer dependency graph | Prevent circular deps + testability | Flat structure — pure functions import DB client → untestable without infrastructure |
| `NormalizerPipeline` OCP abstraction | V1.5 Groq normalizer with zero pipeline changes | Single `if/else` — each new normalizer requires pipeline modification |
| KV-backed cache (`PROMPT_CACHE_KV`) | Cross-request persistence | `new Map()` — Worker isolates are stateless; Map destroyed per request = 0% hit rate |
| CF `RateLimit` binding | Race-free rate limiting | KV read-modify-write — TOCTOU: two isolates both read count=59, both pass |
| `split().join()` for injection | No regex `$$` escape bug | `String.replace(/pattern/, topic)` — `$$` in topic string maps to literal `$` |
| FNV-1a hash suffix on long slugs | Collision-resistant URLs | `.slice(0, 80)` — two topics sharing first 80 chars produce same slug (URL collision) |
| Factory `createDb(env)` | No global state, DIP-compliant | `export const db = createDb(process.env)` — Worker-incompatible, untestable |

---

## Anti-Patterns Catalogue

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| `class PromptService { loadFromDB(); sanitize(); slugify(); inject(); render(); track(); }` | God class — 6 reasons to change, merge conflicts, untestable | Split into 6 single-responsibility modules |
| `throw new Error('Missing placeholder')` in `injectTopic()` | Invisible at type level; callers don't know to catch | Return `err({ code: 'MISSING_PLACEHOLDER', ... })` |
| `const db = createDb(process.env)` at module scope | Module-level state; CF Workers incompatible; untestable | `createDb(env)` factory called per-request from the Worker context |
| `const cache = new Map<string, string>()` in Worker | Destroyed after each request — 0% cross-request hit rate | CF KV namespace binding |
| `import Microscope from 'lucide-react'` (barrel import) | 500KB+ bundle if unoptimized | Use `optimizePackageImports` or direct path imports |
| `<div dangerouslySetInnerHTML={{ __html: prompt }}>` | XSS if prompt contains `<script>` | `<pre>{prompt}</pre>` via textContent |
| KV `get()` then `put()` for rate limiting | TOCTOU race — two isolates pass simultaneously | CF `RateLimit` binding (atomic at network layer) |
| `ADD COLUMN field TEXT NOT NULL` in a single migration | Blocks table; existing rows have no value | Expand-contract: nullable first → backfill → enforce constraint |

---

## Decision Records (ADRs)

All ADRs live in `docs/adr/`. Template:

```markdown
# ADR-00N: [Decision Title]
## Status: Accepted (YYYY-MM-DD) | Superseded by ADR-XXX
## Context: [Why was this decision needed?]
## Decision: [What was decided?]
## Consequences: Positive: [...] Negative: [...]
## Alternatives Considered: [What else was evaluated and why rejected?]
```

Initial ADRs to create:
- `ADR-001-cloudflare-workers.md` — hosting choice (Cloudflare vs. Vercel vs. AWS)
- `ADR-002-turso-drizzle.md` — database choice (Turso vs. Prisma vs. D1 directly)
- `ADR-003-no-llm-v1.md` — strategic decision to be a string transformer, not an AI
- `ADR-004-result-type.md` — `Result<T,E>` over exceptions
- `ADR-005-branded-types.md` — Branded primitives over plain `string`

---

## Development Workflow

**Branch strategy:** `main` (always deployable, protected) · `feat/*` · `fix/*` · `chore/*` · `release/v1.x`

**Commit convention (Conventional Commits — enables auto-changelog):**
```
feat(prompts): add abbreviation normalizer for medical terms
fix(clipboard): handle execCommand failure on iOS Safari 16
test(slugifier): add FNV-1a collision-resistance property test
chore(deps): upgrade drizzle-orm to 0.45.3
docs(adr): add ADR-003 no-llm-v1 decision record
refactor(prompts): extract TopicNormalizer interface from pipeline
perf(cache): switch from KV read-modify-write to CF RateLimit binding
```

**Code review gate (Appendix A checklist — both reviewers must confirm):**
- [ ] No `any` types without justification comment
- [ ] Branded types used for domain primitives
- [ ] Errors returned as `Result<T,E>`, never thrown from pure functions
- [ ] No `innerHTML` with user-controlled data
- [ ] No new dependency > 10KB without bundle budget approval
- [ ] Module layer boundaries respected (ESLint enforces, but human checks intent)
- [ ] TSDoc on all exported public functions
- [ ] Property test added for any new sanitizer/slugifier logic
- [ ] Accessibility: semantic HTML, keyboard navigable, ARIA labels correct

**V1.0 Definition of Done:**
- [ ] All 6 master prompts validated by a medical educator (clinical review checklist signed off)
- [ ] 3-tap UX verified on iOS Safari, Android Chrome, Desktop Chrome, Firefox
- [ ] Shareable URLs render OG images correctly in WhatsApp, Telegram, Twitter
- [ ] Edge cache hit rate > 50% (measured after 24h of traffic)
- [ ] JS bundle size < 80KB gzipped (CI gate)
- [ ] Lighthouse ≥ 95 all categories (CI gate)
- [ ] Zero `axe-core` critical violations
- [ ] Plausible tracking live with all 3 custom events verified
- [ ] Deployed to Cloudflare Pages production
- [ ] `docs/adr/` contains all 5 initial ADRs
