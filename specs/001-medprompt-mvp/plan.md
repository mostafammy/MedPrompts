# Implementation Plan: MedPrompt MVP

**Branch**: `001-medprompt-mvp` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-medprompt-mvp/spec.md`

---

## Summary

Build MedPrompt — a mobile-first Next.js 15 (App Router) Progressive Web App deployed on Cloudflare Pages + Workers. The app presents a 6-subject medical grid, accepts a free-text topic, injects it into an engineered master prompt template, and copies the result to the clipboard in ≤ 3 taps. Prompt templates are hardcoded in source for V1.0 (no database reads required). Shareable URLs (`/<subject>/<topic-slug>`) render server-side with full OG metadata. Bot protection is provided by Cloudflare Turnstile (invisible). Analytics via Plausible.io (cookie-free). PWA install + offline cache (V1.1 scope, scaffolded in V1.0).

---

## Technical Context

**Language/Version**: TypeScript 5.x + React 19 / Next.js 16.x (App Router)  
**Primary Dependencies**: Tailwind CSS 4.x, @cloudflare/next-on-pages, @marsidev/react-turnstile, next/og (ImageResponse), Plausible.io script  
**Storage**: Hardcoded TypeScript module (`src/lib/prompt-templates.ts`) for V1.0; Turso (libSQL via @libsql/client/http) + Drizzle ORM scaffolded for V1.2  
**Testing**: Next.js built-in type checking; axe-core CLI for accessibility; manual cross-browser clipboard/copy testing  
**Target Platform**: Cloudflare Pages (static + edge SSR) + Cloudflare Workers (API routes, OG image); iOS Safari 16+, Android Chrome 108+, Desktop Chrome/Firefox/Safari  
**Project Type**: Mobile-first PWA / web application  
**Performance Goals**: Full workflow (select → copy) ≤ 3 interactions; perceived page load < 2s globally; copy action < 1s perceived  
**Constraints**: Zero LLM API calls; zero Node.js runtime APIs (Cloudflare Workers V8 isolate); offline capability for visited pages (V1.1); WCAG 2.1 AA accessibility  
**Scale/Scope**: 6 subjects; unlimited topics (client-side slug generation); global CDN edge delivery; no server-side session state

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: The project constitution (`constitution.md`) has not yet been filled in for this project — it contains only placeholder template content. The gates below are derived from the PRD's explicit constraints and product philosophy, which serve as the effective constitution for this build.

| Gate | Status | Notes |
|------|--------|-------|
| Zero LLM API calls in V1.0 | ✅ PASS | Templates hardcoded in `src/lib/prompt-templates.ts`; no external API calls for prompt generation |
| ≤ 3 taps end-to-end | ✅ PASS | Architecture supports: Tap 1 (subject tile) → Tap 2 (topic submit) → Tap 3 (copy). No intermediate loading screens |
| No Node.js-only APIs on edge | ✅ PASS | `node:fs`, `better-sqlite3`, `node:crypto`, `sharp` explicitly banned. Using Web Crypto, @libsql/client/http, Cloudflare Images |
| Edge-native deployment | ✅ PASS | @cloudflare/next-on-pages adapter; `export const runtime = 'edge'` on dynamic routes |
| Privacy-first analytics | ✅ PASS | Plausible.io — no cookies, no PII, no consent banner required |
| PWA installability | ✅ PASS | manifest.json + service worker scaffolded (V1.1 fully enabled) |
| Input sanitization | ✅ PASS | Topic sanitization removes injection patterns, special chars; 120-char hard cap |
| Medical content review | ✅ PASS (pre-launch gate) | All 6 prompts require educator sign-off before V1.0 deploy |

**No violations requiring justification.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-medprompt-mvp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── ui-contracts.md  # Component API contracts
│   ├── url-schema.md    # URL routing contract
│   └── api-routes.md    # Edge API route contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
medprompts.mostafayaser.earth/
├── .github/
│   └── workflows/
│       ├── deploy.yml              # Cloudflare Pages CI/CD
│       └── test.yml                # Lint + accessibility tests
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service Worker (V1.1)
│   ├── offline.html                # Offline fallback (V1.1)
│   ├── icons/                      # PWA icons (72–512px, maskable)
│   └── screenshots/                # PWA install screenshots
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — fonts, Plausible script, metadata
│   │   ├── page.tsx                # Home: Subject grid (/)
│   │   ├── [subject]/
│   │   │   ├── page.tsx            # Subject landing (/pathology) — pre-selects subject
│   │   │   └── [topic]/
│   │   │       └── page.tsx        # Generated prompt view (/pathology/myocardial-infarction)
│   │   ├── api/
│   │   │   ├── og/route.ts         # Dynamic OG image (edge runtime)
│   │   │   └── health/route.ts     # Health check
│   │   ├── offline/page.tsx        # Offline fallback page
│   │   └── sitemap.ts              # Dynamic sitemap from seed topics
│   ├── components/
│   │   ├── SubjectGrid.tsx         # 6-tile grid (server component)
│   │   ├── SubjectTile.tsx         # Individual tile (client: hover/active states)
│   │   ├── TopicInputSheet.tsx     # Slide-up modal with Turnstile (client)
│   │   ├── PromptView.tsx          # Prompt display container (server)
│   │   ├── CopyButton.tsx          # Clipboard CTA with state machine (client)
│   │   ├── DeepLinkButton.tsx      # "Open in ChatGPT" progressive enhancement (client)
│   │   └── Toast.tsx               # Non-blocking feedback toast (client)
│   ├── lib/
│   │   ├── prompt-templates.ts     # Hardcoded master prompt templates (V1.0)
│   │   ├── clipboard.ts            # 3-level clipboard engine
│   │   ├── prompts.ts              # injectTopic(), topicToSlug(), sanitizeTopic()
│   │   ├── analytics.ts            # Plausible event wrappers (typed)
│   │   ├── deep-links.ts           # Platform deep link construction
│   │   └── subjects.ts             # Subject registry (id, label, icon, slug)
│   ├── db/                         # V1.2 scaffolding only
│   │   ├── client.ts               # Turso/Drizzle edge client (inactive in V1.0)
│   │   └── schema.ts               # Drizzle schema definitions
│   ├── middleware.ts               # Rate limiting on /api/* routes
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── drizzle/
│   └── migrations/                 # Drizzle migration files (V1.2)
├── wrangler.toml                   # Cloudflare Workers/Pages config
├── next.config.ts                  # Next.js config with Cloudflare adapter
├── tailwind.config.ts              # Design tokens from PRD §4
├── tsconfig.json
└── package.json
```

**Structure Decision**: Single web application. Next.js 15 App Router handles both the static subject grid (Server Component) and dynamic prompt generation pages (edge runtime per-route). No separate frontend/backend split — edge API routes live within the same Next.js project and deploy as Cloudflare Workers. The `db/` directory is scaffolded now but inactive until V1.2 database migration.

---

## Complexity Tracking

*No constitution violations requiring justification.*
