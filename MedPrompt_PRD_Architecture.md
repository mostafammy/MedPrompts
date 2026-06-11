# MedPrompt — Complete Product & Architecture Reference
> **Version:** 1.0 — Revised & Hardened  
> **Stage:** Zero-to-One MVP  
> **Deployment Target:** Cloudflare Pages + Workers (Edge-Native)  
> **Last Updated:** June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Philosophy & Constraints](#2-product-philosophy--constraints)
3. [User Flow & Core Features](#3-user-flow--core-features)
4. [Design System](#4-design-system)
5. [Architecture Overview](#5-architecture-overview)
6. [Tech Stack — Rationale & Decisions](#6-tech-stack--rationale--decisions)
7. [Cloudflare Deployment Strategy](#7-cloudflare-deployment-strategy)
8. [Database Layer — Turso (libSQL)](#8-database-layer--turso-libsql)
9. [Master Prompt Specifications](#9-master-prompt-specifications)
10. [Clipboard Engine](#10-clipboard-engine)
11. [PWA Specification](#11-pwa-specification)
12. [SEO & Shareable URL Strategy](#12-seo--shareable-url-strategy)
13. [Security & Abuse Prevention](#13-security--abuse-prevention)
14. [Analytics](#14-analytics)
15. [Accessibility Baseline](#15-accessibility-baseline)
16. [Content Validation Pipeline](#16-content-validation-pipeline)
17. [File & Folder Structure](#17-file--folder-structure)
18. [Environment Variables](#18-environment-variables)
19. [Release Milestones](#19-release-milestones)
20. [Risk Register](#20-risk-register)

---

## 1. Executive Summary

### The Problem

Medical students face immense cognitive load managing high-volume academic disciplines — Anatomy, Histology, Physiology, Microbiology, Pathology, and Parasitology. While Large Language Models are now powerful study aids, students lack the prompt-engineering expertise to extract structured, clinically relevant, non-hallucinated, exam-ready content from them.

A student who types `"explain myocardial infarction"` into ChatGPT gets a generic Wikipedia-level response. A student who injects a precisely engineered master prompt gets a board-exam-ready breakdown with morphology tables, high-yield buzzwords, and pathogenesis steps — every time.

### The Solution

**MedPrompt** is a frictionless, mobile-first Progressive Web App that functions as a **prompt clipboard utility**. It houses a library of highly engineered "Master Prompts" — one per medical discipline — and injects a user-supplied topic into the correct template in under 3 taps.

The user copies the result and pastes it into ChatGPT, Gemini, or any LLM of their choice. MedPrompt never calls an LLM itself.

### Why This Works

| Insight | Implication |
|---|---|
| Students already have ChatGPT open | No user behavior change required |
| Prompt quality is the bottleneck | A one-time investment in master prompts yields compounding value |
| Shareable URLs create viral loops | Study groups share links — zero-cost acquisition |
| PWA sits on the home screen | Adjacent to native LLM apps — zero switching cost |
| Zero LLM API calls | Zero compute cost — infinite margin at scale |

---

## 2. Product Philosophy & Constraints

### Core Constraint: ≤ 3 Taps

The entire workflow — from opening the app to having a formatted prompt on the clipboard — must complete in **three interactions or fewer**:

```
Tap 1 → Select Subject tile
Tap 2 → Type topic, submit
Tap 3 → Copy prompt (optionally launches LLM app)
```

Every design decision must be evaluated against this constraint. Features that add a tap without substantial value are rejected.

### Zero-Cost Compute

The MVP **does not execute API calls to any LLM**. It is a string-transformation and clipboard-injection tool. This eliminates:
- Server costs
- Token costs
- Rate limit management
- LLM provider dependency risk

The architecture must preserve this property through all MVP milestones.

### Edge-Native Performance

The app must feel instantaneous globally. Hosting on Cloudflare Pages + Workers provides zero cold starts and sub-50ms response times from edge nodes worldwide — critical for a tool used by students in Egypt, India, Southeast Asia, and beyond.

### Progressive Web App

Must be installable on iOS and Android home screens, sitting adjacent to native LLM apps. Offline capability for the prompt library is mandatory.

---

## 3. User Flow & Core Features

### 3.1 Full User Flow

```
[Home Screen Icon]
       │
       ▼
[Subject Grid — full screen]
  Anatomy | Histology | Physiology
  Micro   | Pathology | Parasitology
       │
       ▼ (tap any subject)
[Topic Input Sheet — slide-up modal]
  ┌─────────────────────────────┐
  │  Enter topic (e.g. "MI")    │
  │  [                        ] │
  │         [Generate ↗]        │
  └─────────────────────────────┘
       │
       ▼
[Generated Prompt View]
  ┌─────────────────────────────┐
  │  Preview (truncated)        │
  │  ─────────────────────────  │
  │  [📋 Copy & Open ChatGPT]   │
  │  [📋 Copy Prompt Only]      │
  └─────────────────────────────┘
       │
       ▼
  Clipboard populated.
  ChatGPT / Gemini launches (if deep link available).
```

### 3.2 Feature Specifications

#### Feature 1 — Subject Selection Grid

- Full-screen, touch-optimized tile grid
- Initial subjects: **Anatomy, Histology, Physiology, Microbiology, Pathology, Parasitology**
- Each tile displays: subject name + a subtle relevant icon
- Tap advances state instantly — no page load, no navigation
- On desktop: 3-column grid; on mobile: 2-column grid
- Tile tap triggers a URL state update (`/pathology`) for shareability

#### Feature 2 — Topic Input Sheet

- A slide-up sheet (mobile) or centered modal (desktop) overlaying the grid
- Single focused `<input>` field auto-focused on open
- Placeholder: `"Enter a topic (e.g. Myocardial Infarction)"`
- Optional: topic autocomplete from a curated seed list (V1.2)
- On submit: inject topic into master prompt → navigate to `/[subject]/[slug]`
- Topic is slugified for the URL: `"Myocardial Infarction"` → `myocardial-infarction`

#### Feature 3 — Copy & Launch Engine

The primary CTA. Handles three scenarios in priority order:

```
1. navigator.clipboard.writeText()   → Modern Clipboard API (preferred)
2. document.execCommand('copy')       → Legacy fallback via hidden textarea
3. Manual selection prompt            → Last resort: select-all textarea visible
```

Deep-link behavior (progressive enhancement, not required path):

```typescript
// Platform detection
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

// Deep link schemes (unstable — always fall back)
const deepLinks = {
  chatgpt: isIOS ? 'chatgpt://' : 'intent://openai.com/chatgpt#Intent;scheme=https;end',
  gemini:  isIOS ? 'gemini://' : 'intent://gemini.google.com#Intent;scheme=https;end',
};

// Always copy first, then attempt launch
await copyToClipboard(prompt);
tryDeepLink(deepLinks.chatgpt); // Silently fails if app not installed
```

**Critical:** The copy action is the success state. The deep link is a bonus. Never block copy on deep-link success.

#### Feature 4 — Shareable State URLs

URL structure reflects full application state:

```
/                                 → Subject selection grid
/[subject]                        → Subject grid, subject pre-selected
/[subject]/[topic-slug]           → Full state: generated prompt visible
```

Examples:
```
/pathology/myocardial-infarction
/anatomy/brachial-plexus
/physiology/cardiac-action-potential
```

These URLs render a complete page server-side with full OG metadata for rich link previews in WhatsApp, Telegram, and iMessage.

---

## 4. Design System

### 4.1 Color Palette

| Token | Hex (Light) | Usage |
|---|---|---|
| `--color-primary` | `#1A6B4A` | Primary CTAs, active states |
| `--color-primary-dark` | `#134E37` | Hover states on primary |
| `--color-primary-light` | `#E8F5EE` | Tile backgrounds, success tints |
| `--color-surface` | `#FFFFFF` | Cards, modals, sheet backgrounds |
| `--color-bg` | `#F4F6F5` | Page background |
| `--color-text-primary` | `#0F1F17` | Headings, body copy |
| `--color-text-secondary` | `#4A6358` | Subtitles, captions |
| `--color-text-muted` | `#8AA396` | Placeholders, hints |
| `--color-border` | `#D4E2DC` | Card borders, input borders |
| `--color-accent` | `#2A9D8F` | Interactive accents, links |
| `--color-danger` | `#C0392B` | Errors, warnings |

**Dark Mode Overrides:**

| Token | Hex (Dark) |
|---|---|
| `--color-bg` | `#0D1A14` |
| `--color-surface` | `#152117` |
| `--color-text-primary` | `#E8F2EE` |
| `--color-text-secondary` | `#8FBB9E` |
| `--color-border` | `#243D2E` |
| `--color-primary-light` | `#1A3D2B` |

### 4.2 Typography

```css
/* Scale */
--font-display: 'Fraunces', Georgia, serif;     /* Subject tile labels — editorial weight */
--font-sans:    'DM Sans', system-ui, sans-serif; /* UI, body, inputs */
--font-mono:    'JetBrains Mono', monospace;     /* Prompt preview */

/* Sizes */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   17px;
--text-xl:   20px;
--text-2xl:  24px;
--text-3xl:  30px;
```

Load via Google Fonts (self-hosted in production to avoid GDPR issues):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

### 4.3 Spacing Scale

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 4.4 Border Radius

```css
--radius-sm: 6px;   /* Badges, small pills */
--radius-md: 10px;  /* Inputs, buttons */
--radius-lg: 16px;  /* Cards, modals */
--radius-xl: 24px;  /* Subject tiles */
--radius-full: 9999px; /* Circular elements */
```

### 4.5 Motion

```css
/* All transitions use these easing curves */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);

/* Standard durations */
--duration-fast:   120ms;  /* Micro-interactions */
--duration-base:   200ms;  /* Standard state changes */
--duration-slow:   350ms;  /* Sheet/modal entrance */
```

Always respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.6 Component Specifications

#### Subject Tile
```
Size:         Responsive — fills grid column (min 140px, max 200px)
Aspect ratio: 1:1 (square)
Background:   var(--color-primary-light) with 1px border var(--color-border)
Border radius:var(--radius-xl)
Icon:         32px, centered, var(--color-primary)
Label:        font-display, 15px, 600 weight, var(--color-text-primary)
Active state: scale(0.96), background var(--color-primary-light) darkened 5%
Hover (desktop): box-shadow 0 4px 16px rgba(26,107,74,0.12), scale(1.02)
```

#### Copy Button (Primary CTA)
```
Height:        52px
Width:         100% (full-width on mobile)
Background:    var(--color-primary)
Color:         #FFFFFF
Border radius: var(--radius-md)
Font:          DM Sans, 16px, 600
Icon:          Clipboard icon, 18px, left of label
Active:        scale(0.98), background var(--color-primary-dark)
```

#### Input Field
```
Height:        48px
Background:    var(--color-surface)
Border:        1.5px solid var(--color-border)
Border radius: var(--radius-md)
Font:          DM Sans, 15px, 400
Focus border:  var(--color-primary)
Padding:       0 16px
```

#### Prompt Preview Box
```
Background:    var(--color-bg)
Border:        1px solid var(--color-border)
Border radius: var(--radius-lg)
Font:          JetBrains Mono, 13px
Max height:    200px (overflow: auto)
Padding:       16px
Color:         var(--color-text-primary)
```

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                   │
│  ┌──────────────────────┐   ┌──────────────────────────────┐│
│  │   Cloudflare Pages   │   │     Cloudflare Workers       ││
│  │   (Next.js Static +  │   │   (Edge API Routes)          ││
│  │    RSC rendering)    │   │   /api/prompts               ││
│  └──────────┬───────────┘   └──────────────┬───────────────┘│
│             │                              │                  │
└─────────────┼──────────────────────────────┼─────────────────┘
              │                              │
              ▼                              ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │   Next.js App    │          │   Turso (libSQL)     │
    │   App Router     │          │   Edge-compatible    │
    │   Server Comps   │◄────────►│   Master Prompts DB  │
    │   generateMeta() │          │   Topics seed list   │
    └──────────────────┘          └──────────────────────┘
              │
              ▼
    ┌──────────────────┐
    │   Plausible.io   │
    │   Analytics      │
    │   (privacy-first)│
    └──────────────────┘
```

### Data Flow — Prompt Generation

```
User enters topic "Myocardial Infarction" in /pathology
          │
          ▼
Client slugifies: "myocardial-infarction"
          │
          ▼
Next.js router navigates to /pathology/myocardial-infarction
          │
          ▼
Server Component fetches master prompt template for "pathology" from Turso
          │
          ▼
Template string injection:
  "Explain [TOPIC] using the following..." 
   → "Explain Myocardial Infarction using the following..."
          │
          ▼
Page renders with:
  - Full prompt in a <pre> block
  - generateMetadata() produces OG tags
  - Copy button activates clipboard engine
```

---

## 6. Tech Stack — Rationale & Decisions

### Frontend

| Technology | Version | Decision | Rationale |
|---|---|---|---|
| **Next.js** | 15.x | ✅ Confirmed | App Router, RSC, `generateMetadata()`, Cloudflare adapter |
| **Tailwind CSS** | 4.x | ✅ Confirmed | Mobile-first, utility-first, zero runtime CSS |
| **TypeScript** | 5.x | ✅ Required | Type safety on prompt templates prevents injection bugs |
| **React** | 19.x | ✅ Confirmed | Ships with Next.js 15 |

### Backend / Data

| Technology | Version | Decision | Rationale |
|---|---|---|---|
| **Turso (libSQL)** | Latest | ✅ Replaces SQLite | Edge-compatible HTTP driver; SQLite file system does not exist on Workers runtime |
| **Drizzle ORM** | 0.x | ✅ Confirmed | Works with Turso's libSQL driver; type-safe schema; zero overhead |
| **@libsql/client** | Latest | ✅ Required | Turso's official HTTP client for edge environments |

> **Critical Note on SQLite:** The original PRD specified SQLite + Drizzle. This is **incompatible** with Cloudflare Workers. Workers run in a V8 isolate — there is no filesystem, no native bindings, and no `better-sqlite3`. Turso provides libSQL over HTTPS, which works identically from an edge Worker. The Drizzle schema and query syntax remain unchanged; only the driver changes.

### Infrastructure

| Service | Decision | Rationale |
|---|---|---|
| **Cloudflare Pages** | ✅ Primary | Serves Next.js static assets and ISR pages |
| **Cloudflare Workers** | ✅ Primary | Runs Next.js API routes and server-side logic at edge |
| **Cloudflare Turnstile** | ✅ Required (V1.0) | CAPTCHA-free bot protection on prompt generation endpoint |
| **Cloudflare KV** | 🔵 Optional (V1.2) | Cache frequently-accessed prompt templates |
| **Plausible Analytics** | ✅ Required (V1.0) | Privacy-first analytics; no cookies, no GDPR banner needed |

### Dependencies to Avoid

| Package | Reason to Avoid |
|---|---|
| `better-sqlite3` | Native bindings — incompatible with edge runtime |
| `node:fs` | No filesystem on Cloudflare Workers |
| `node:crypto` | Use Web Crypto API (`crypto.subtle`) instead |
| `sharp` | Native bindings — use Cloudflare Images or edge-compatible alternatives |

---

## 7. Cloudflare Deployment Strategy

### Why Cloudflare Over Vercel

| Criteria | Cloudflare | Vercel |
|---|---|---|
| Cold starts | **Zero** — V8 isolates are always warm | ~200–800ms on free/hobby tier |
| Global latency | **<50ms** from 300+ edge locations | ~100–300ms serverless |
| Edge Workers | First-class, native | Edge Functions (limited) |
| KV caching | Built-in, free tier generous | Requires external Redis |
| Cost at scale | Workers: $0.30 per million requests | Serverless: usage-based, can spike |
| Free tier | 100k requests/day Workers free | 100GB bandwidth, serverless limited |

For a prompt-generation app with spiky usage around exam seasons, Cloudflare's pricing model is significantly more predictable.

### Setup Steps

**1. Install the Cloudflare adapter for Next.js:**
```bash
npm install @cloudflare/next-on-pages
npm install --save-dev wrangler
```

**2. `wrangler.toml` — project configuration:**
```toml
name = "medprompt"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

pages_build_output_dir = ".vercel/output/static"

[vars]
TURSO_DATABASE_URL = ""  # Set in Cloudflare dashboard, not here

[[kv_namespaces]]
binding = "PROMPT_CACHE"
id = "your-kv-namespace-id"       # from: wrangler kv:namespace create PROMPT_CACHE
preview_id = "your-preview-id"

[build]
command = "npx @cloudflare/next-on-pages"
```

**3. `next.config.ts`:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages
  output: 'export',  // OR use edge runtime per-route (preferred)
};

export default nextConfig;
```

**4. Per-route edge runtime declaration (preferred over full static export):**
```typescript
// app/[subject]/[topic]/page.tsx
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
```

**5. Build & deploy command:**
```bash
npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static
```

**6. CI/CD via GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx @cloudflare/next-on-pages
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .vercel/output/static --project-name=medprompt
```

### Preview Deployments

Every pull request automatically gets a preview URL from Cloudflare Pages:
```
https://[branch-name].medprompt.pages.dev
```

This is enabled by default — no configuration needed.

---

## 8. Database Layer — Turso (libSQL)

### Why Turso

Turso provides SQLite semantics over HTTP/WebSocket, making it natively compatible with edge runtimes. The free tier (500 databases, 9GB storage, 1B row reads/month) is more than sufficient for an MVP.

### Schema

```sql
-- Master prompt templates (one per subject)
CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,          -- e.g. 'pathology'
  label       TEXT NOT NULL,             -- e.g. 'Pathology'
  icon        TEXT NOT NULL,             -- e.g. 'microscope' (icon name)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- The master prompt template per subject
CREATE TABLE prompt_templates (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  version     INTEGER NOT NULL DEFAULT 1,
  template    TEXT NOT NULL,             -- Contains {{TOPIC}} placeholder
  is_active   INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT DEFAULT (datetime('now')),
  updated_by  TEXT                       -- email of editor
);

-- Curated topic seed list (for autocomplete)
CREATE TABLE topics_seed (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  TEXT NOT NULL REFERENCES subjects(id),
  topic       TEXT NOT NULL,
  slug        TEXT NOT NULL,
  UNIQUE(subject_id, slug)
);

-- Prompt usage events (for analytics enrichment)
CREATE TABLE prompt_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  TEXT NOT NULL,
  topic_slug  TEXT NOT NULL,
  copied_at   TEXT DEFAULT (datetime('now')),
  ua_hint     TEXT                        -- Truncated UA for device type only
);
```

### Drizzle Schema

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const subjects = sqliteTable('subjects', {
  id:        text('id').primaryKey(),
  label:     text('label').notNull(),
  icon:      text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const promptTemplates = sqliteTable('prompt_templates', {
  id:        text('id').primaryKey(),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  version:   integer('version').notNull().default(1),
  template:  text('template').notNull(),
  isActive:  integer('is_active').notNull().default(1),
  updatedAt: text('updated_at'),
  updatedBy: text('updated_by'),
});

export const topicsSeed = sqliteTable('topics_seed', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  topic:     text('topic').notNull(),
  slug:      text('slug').notNull(),
});
```

### Drizzle Client (Edge-compatible)

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/http';

export function getDb(env: { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string }) {
  const client = createClient({
    url:       env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client);
}
```

> Note: Use `@libsql/client/http` (not `/web`). The `/http` variant is fully edge-compatible and does not require WebSocket upgrades.

### Prompt Injection Function

```typescript
// src/lib/prompts.ts

export function injectTopic(template: string, topic: string): string {
  // Sanitize topic — strip any prompt injection attempts
  const sanitized = topic
    .replace(/[<>{}[\]]/g, '')      // Strip brackets and braces
    .replace(/\n|\r/g, ' ')         // Flatten newlines
    .trim()
    .slice(0, 120);                 // Hard length cap
  
  return template.replace(/\{\{TOPIC\}\}/g, sanitized);
}

export function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function slugToTopic(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

---

## 9. Master Prompt Specifications

### Design Principles

The master prompts are the **intellectual property and competitive moat** of MedPrompt. They must:

1. Enforce Markdown formatting that renders correctly in ChatGPT and Gemini
2. Request clinically relevant, board-exam-oriented content exclusively
3. Explicitly instruct the LLM to avoid hallucination and flag uncertainty
4. Use the `{{TOPIC}}` placeholder exactly — no variations
5. Be reviewed and signed off by a qualified medical educator before V1.0 launch

### Template Format

```
Act as a world-class [DISCIPLINE] professor and medical educator. 
I am a medical student preparing for board examinations (USMLE/equivalent).
Explain {{TOPIC}} using the following strict format. 
Do not deviate from the structure. If you are uncertain about any fact, 
explicitly state "⚠️ Verify this point" rather than guessing.

[DISCIPLINE-SPECIFIC STRUCTURE BELOW]
```

### Pathology Master Prompt

```
Act as a world-class pathology professor and medical educator.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.
Do not deviate from the structure. If uncertain, flag with "⚠️ Verify."

## 1. Definition & Etiology
Brief definition (2–3 sentences). List primary etiological factors as a bulleted list.

## 2. Pathogenesis
Step-by-step molecular and cellular mechanism. Use numbered steps. Include key mediators in **bold**.

## 3. Morphology
Gross and microscopic changes. Present as a Markdown table:

| Timeframe | Gross Changes | Microscopic Changes |
|-----------|--------------|---------------------|
| 0–4 hours | | |
| 4–24 hours | | |
| 1–3 days | | |
| 3–14 days | | |
| 2 weeks+ | | |

## 4. Clinical Features & Complications
- Symptoms (onset, character, radiation)
- Signs on examination
- Complications (use sub-bullets)

## 5. Investigations
| Investigation | Expected Finding |
|---|---|
| | |

## 6. Management Principles
Numbered list: immediate → short-term → long-term.

## 7. High-Yield Board Keywords
Bold exactly **5 keywords** that are high-yield for MCQ exams. 
Briefly explain why each keyword is important (one line each).
```

### Anatomy Master Prompt

```
Act as a world-class anatomy professor and clinician.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.

## 1. Overview & Classification
Type, location, and clinical significance in 2–3 sentences.

## 2. Osteology / Bones Involved (if applicable)
Key bony landmarks relevant to this structure.

## 3. Muscular Anatomy
| Muscle | Origin | Insertion | Nerve Supply | Action |
|--------|--------|-----------|--------------|--------|
| | | | | |

## 4. Neurovascular Supply
- **Arterial supply:** 
- **Venous drainage:**
- **Lymphatic drainage:**
- **Nerve supply:** (with root values)

## 5. Relations
Anterior, posterior, medial, lateral, superior, inferior — one line each.

## 6. Applied Anatomy & Clinical Correlations
- Common injuries or pathologies
- Surgical approaches
- Clinical tests (name, technique, positive finding)

## 7. High-Yield Board Keywords
Bold exactly **5 keywords**. One-line explanation of MCQ relevance each.
```

### Physiology Master Prompt

```
Act as a world-class physiology professor.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.

## 1. Definition & Overview
What is this? Where does it occur? What is its physiological significance?

## 2. Key Players
List the primary molecules, ions, cells, or organs involved with their roles.

## 3. Mechanism — Step by Step
Numbered sequence of events. Include feedback loops explicitly.
Use: ↑ (increase), ↓ (decrease), → (leads to)

## 4. Regulation
| Factor | Effect | Mechanism |
|--------|--------|-----------|
| | | |

## 5. Physiological Values (Normal Ranges)
Provide a table of key measurable parameters with normal ranges and units.

## 6. Clinical Relevance
- What happens when this process fails or is dysregulated?
- Drug targets in this pathway
- Common exam scenarios (hyper/hypo states)

## 7. High-Yield Board Keywords
Bold exactly **5 keywords**. One-line MCQ relevance each.
```

### Microbiology Master Prompt

```
Act as a world-class microbiology professor.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.

## 1. Classification
Kingdom → Phylum → Class (or viral family → genus). 
Gram stain (if applicable), morphology, special staining.

## 2. Virulence Factors
| Factor | Function | Clinical Significance |
|--------|----------|-----------------------|
| | | |

## 3. Pathogenesis
Route of entry → colonisation → invasion → tissue damage → disease.
Step-by-step numbered sequence.

## 4. Clinical Presentation
- Incubation period
- Prodrome
- Main clinical features (organ-by-organ if systemic)
- Complications

## 5. Diagnosis
| Method | Sample | Finding |
|--------|--------|---------|
| | | |

## 6. Treatment
- First-line agent (with mechanism of action in parentheses)
- Alternatives
- Drug resistance considerations

## 7. Prevention & Public Health
Vaccination, isolation, notifiable disease status.

## 8. High-Yield Board Keywords
Bold exactly **5 keywords**. One-line MCQ relevance each.
```

### Histology Master Prompt

```
Act as a world-class histology and cell biology professor.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.

## 1. Overview
Tissue type, location in the body, primary function.

## 2. Light Microscopy (H&E)
Describe what you would see: cell shapes, nuclear features, cytoplasm, 
intercellular material. Reference standard staining colours.

## 3. Special Stains (if applicable)
| Stain | What It Highlights | Colour Result |
|-------|--------------------|---------------|
| | | |

## 4. Electron Microscopy Features
Ultrastructural features visible on TEM/SEM. Key organelles, 
junctions, specialisations.

## 5. Cell Biology — Molecular Markers
Key immunohistochemical markers (CD markers, structural proteins).

## 6. Function & Physiology
How does the structure relate to function? Cell signalling involved.

## 7. Pathological Correlations
Common diseases affecting this tissue. What histological changes occur?

## 8. High-Yield Board Keywords
Bold exactly **5 keywords**. One-line MCQ relevance each.
```

### Parasitology Master Prompt

```
Act as a world-class parasitology and infectious disease professor.
I am a medical student preparing for board examinations.
Explain {{TOPIC}} using the following strict format.

## 1. Classification & Taxonomy
Phylum, class, species. Protozoa / Helminth / Ectoparasite.

## 2. Life Cycle
Stage-by-stage numbered sequence. Include:
- Definitive host
- Intermediate host(s)
- Mode of transmission
- Infective stage to humans
- Diagnostic stage

## 3. Pathogenesis & Pathology
Mechanism of tissue invasion and damage. Target organs.

## 4. Clinical Features
- Incubation
- Acute features
- Chronic features
- Complications

## 5. Diagnosis
| Method | Stage Detected | Notes |
|--------|----------------|-------|
| | | |

## 6. Treatment
First-line drug(s) with mechanism. Duration. Side effects.

## 7. Prevention & Epidemiology
Endemic regions, vector control, prophylaxis.

## 8. High-Yield Board Keywords
Bold exactly **5 keywords**. One-line MCQ relevance each.
```

---

## 10. Clipboard Engine

The clipboard engine must handle three levels of browser support gracefully. **Never show an error to the user** — always degrade to the next level.

```typescript
// src/lib/clipboard.ts

export type CopyResult = 
  | { success: true;  method: 'clipboard-api' | 'exec-command' | 'manual' }
  | { success: false; error: string };

export async function copyPrompt(text: string): Promise<CopyResult> {
  // Level 1: Modern Clipboard API
  // Requires: HTTPS + user gesture (button click satisfies this)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard-api' };
    } catch {
      // Falls through to Level 2
    }
  }

  // Level 2: execCommand fallback (works in most in-app browsers)
  // Instagram, Gmail, Facebook Messenger all support this
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (success) return { success: true, method: 'exec-command' };
  } catch {
    // Falls through to Level 3
  }

  // Level 3: Manual fallback — show a selectable textarea
  // This never "fails" from the user's perspective — they just need to tap-hold copy
  return { success: true, method: 'manual' };
}
```

### UI Feedback on Copy

```typescript
// Copy button state machine
type ButtonState = 'idle' | 'copying' | 'success' | 'manual';

// After successful copy:
// 1. Button text changes to "✓ Copied!" for 2000ms
// 2. Returns to "Copy Prompt"
// 3. On 'manual': a textarea appears with the full prompt selected

// Toast notification (non-blocking):
// "Prompt copied — paste into ChatGPT"
```

---

## 11. PWA Specification

### `public/manifest.json`

```json
{
  "name": "MedPrompt",
  "short_name": "MedPrompt",
  "description": "Board-exam prompt generator for medical students",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0F1F17",
  "theme_color": "#1A6B4A",
  "categories": ["education", "medical"],
  "icons": [
    { "src": "/icons/icon-72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128.png",  "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png",  "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png",  "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png",  "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192m.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png",  "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512m.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Pathology",   "url": "/pathology",   "icons": [{ "src": "/icons/shortcut-path.png", "sizes": "96x96" }] },
    { "name": "Anatomy",     "url": "/anatomy",     "icons": [{ "src": "/icons/shortcut-anat.png", "sizes": "96x96" }] },
    { "name": "Physiology",  "url": "/physiology",  "icons": [{ "src": "/icons/shortcut-phys.png", "sizes": "96x96" }] }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png",   "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/prompt.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

### Service Worker Strategy

```typescript
// public/sw.js  (or use next-pwa for generation)

const CACHE_NAME = 'medprompt-v1';

// Cache-first strategy for prompt templates (they rarely change)
// Network-first strategy for dynamic routes

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Subject/topic pages: cache-then-network (stale-while-revalidate)
  if (url.pathname.match(/^\/(anatomy|histology|physiology|microbiology|pathology|parasitology)/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});
```

---

## 12. SEO & Shareable URL Strategy

### `generateMetadata()` Implementation

```typescript
// app/[subject]/[topic]/page.tsx

import type { Metadata } from 'next';

export async function generateMetadata({ 
  params 
}: { 
  params: { subject: string; topic: string } 
}): Promise<Metadata> {
  const topicLabel = slugToTopic(params.topic);
  const subjectLabel = capitalize(params.subject);

  const title       = `${topicLabel} — ${subjectLabel} Board Prompt | MedPrompt`;
  const description = `High-yield ${subjectLabel} board exam prompt for ${topicLabel}. Copy & paste into ChatGPT or Gemini for a structured, exam-ready explanation.`;
  const canonical   = `https://medprompt.app/${params.subject}/${params.topic}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url:       canonical,
      siteName:  'MedPrompt',
      type:      'article',
      images: [{
        url:    `https://medprompt.app/api/og?subject=${params.subject}&topic=${params.topic}`,
        width:  1200,
        height: 630,
        alt:    `${topicLabel} ${subjectLabel} prompt`,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [`https://medprompt.app/api/og?subject=${params.subject}&topic=${params.topic}`],
    },
  };
}
```

### Dynamic OG Image (Cloudflare Worker)

```typescript
// app/api/og/route.ts
// Generates a branded OG image on the edge using @vercel/og (compatible with Workers)

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') ?? 'pathology';
  const topic   = searchParams.get('topic')   ?? 'topic';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'flex-end',
        padding: '60px',
        backgroundColor: '#0F1F17',
        fontFamily: 'DM Sans',
      }}>
        <div style={{ color: '#4CAF7D', fontSize: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {subject}
        </div>
        <div style={{ color: '#E8F2EE', fontSize: 52, fontWeight: 600, lineHeight: 1.1, marginBottom: 24 }}>
          {slugToTopic(topic)}
        </div>
        <div style={{ color: '#8AA396', fontSize: 18 }}>
          Board-exam prompt · Copy into ChatGPT or Gemini
        </div>
        <div style={{ position: 'absolute', bottom: 60, right: 60, color: '#1A6B4A', fontSize: 22, fontWeight: 600 }}>
          MedPrompt
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## 13. Security & Abuse Prevention

### Threat Model

| Threat | Impact | Mitigation |
|---|---|---|
| Crawler enumerates all prompts | IP theft | Cloudflare Turnstile on generation |
| Prompt injection via topic input | Corrupted output | Input sanitization (see §8) |
| Spam submissions flood analytics | Noise in data | Rate limit + honeypot field |
| Deep-link abuse | N/A (no server action) | None required |
| XSS via topic in URL | Low (no innerHTML) | Use `textContent`, never `innerHTML` |

### Cloudflare Turnstile Integration

```typescript
// Component: TurnstileGate
// Invisible challenge — user never sees it unless suspicion score is high

'use client';
import { Turnstile } from '@marsidev/react-turnstile';

export function TopicInputSheet({ subject }: { subject: string }) {
  const [token, setToken] = useState<string | null>(null);

  return (
    <form onSubmit={handleSubmit}>
      <input name="topic" placeholder="Enter topic..." required maxLength={120} />
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={setToken}
        options={{ appearance: 'interaction-only' }} // Only shows if flagged
      />
      <button type="submit" disabled={!token}>Generate →</button>
    </form>
  );
}
```

### Input Sanitization Rules

```typescript
// All topic inputs are sanitized before:
// 1. URL slug generation
// 2. Template injection
// 3. Database storage

const BANNED_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /disregard/i,
  /\bsystem\s*prompt\b/i,
];

export function sanitizeTopic(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 120);
  
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(trimmed)) return null; // Reject silently
  }

  return trimmed
    .replace(/[<>{}[\]\\]/g, '')
    .replace(/\n|\r|\t/g, ' ')
    .replace(/\s{2,}/g, ' ');
}
```

### Rate Limiting (Cloudflare Worker Middleware)

```typescript
// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT = 30;        // requests per window
const WINDOW_MS  = 60_000;    // 1 minute

export async function middleware(request: NextRequest) {
  // Only rate-limit the generation endpoint
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const ip  = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = `ratelimit:${ip}`;

  // Use Cloudflare KV for distributed rate limiting
  // Implementation uses KV atomic increment with TTL
  // (Full implementation in src/middleware/ratelimit.ts)
  
  return NextResponse.next();
}
```

---

## 14. Analytics

### Plausible.io Setup

**Why Plausible over Google Analytics:**
- No cookies → no consent banner needed → cleaner UI
- GDPR/CCPA compliant out of the box
- Lightweight script (~1KB vs ~40KB for GA)
- Self-hostable if needed
- Free for up to 10k pageviews/month; $9/mo for 100k

**Integration:**
```html
<!-- app/layout.tsx <head> -->
<script
  defer
  data-domain="medprompt.app"
  src="https://plausible.io/js/script.tagged-events.js"
/>
```

**Custom Events to Track:**
```typescript
// src/lib/analytics.ts

declare global {
  interface Window {
    plausible: (event: string, options?: { props: Record<string, string> }) => void;
  }
}

export function trackCopy(subject: string, topic: string, method: string) {
  window.plausible?.('Prompt Copied', {
    props: { subject, topic, method }
  });
}

export function trackDeepLink(target: 'chatgpt' | 'gemini', success: boolean) {
  window.plausible?.('Deep Link Attempted', {
    props: { target, outcome: success ? 'launched' : 'fallback' }
  });
}

export function trackShareVisit(subject: string, topic: string) {
  window.plausible?.('Shared URL Visited', {
    props: { subject, topic }
  });
}
```

**Key Metrics Dashboard (Plausible Goals):**

| Goal | Event | Why It Matters |
|---|---|---|
| Prompt Copied | `Prompt Copied` | Primary success metric |
| Deep Link | `Deep Link Attempted` | App launch reliability |
| Share Visit | `Shared URL Visited` | Viral loop effectiveness |
| Subject Distribution | pageview path | Which subjects drive usage |
| Most-Searched Topics | `Prompt Copied` → topic prop | Prompt library prioritisation |

---

## 15. Accessibility Baseline

All components must meet **WCAG 2.1 Level AA**.

### Subject Grid
```tsx
<button
  role="button"
  aria-label={`Generate prompt for ${subject.label}`}
  aria-pressed={selectedSubject === subject.id}
  className="subject-tile"
  onClick={() => selectSubject(subject.id)}
>
  <SubjectIcon aria-hidden="true" />
  <span>{subject.label}</span>
</button>
```

### Topic Input Modal
```tsx
// Focus trap on open — use focus-trap-react or a custom hook
// Dismiss on Escape key
// aria-modal="true" on the dialog element
// aria-labelledby pointing to the dialog heading
// Auto-focus the input on mount

<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="topic-dialog-heading"
  open={isOpen}
>
  <h2 id="topic-dialog-heading">Enter a topic for {subjectLabel}</h2>
  <input
    ref={inputRef}
    type="text"
    name="topic"
    aria-label="Topic name"
    placeholder="e.g. Myocardial Infarction"
    autoFocus
  />
</dialog>
```

### Keyboard Navigation

| Key | Action |
|---|---|
| `Tab` | Navigate between tiles / controls |
| `Enter` / `Space` | Activate tile / button |
| `Escape` | Close modal / sheet |
| `Enter` in input | Submit topic form |

### Color Contrast

All text/background pairs must meet:
- Normal text (< 18pt): minimum **4.5:1**
- Large text (≥ 18pt or 14pt bold): minimum **3:1**
- Interactive components and focus indicators: minimum **3:1**

Run automated checks with `axe-core` in CI:
```bash
npx axe-cli https://medprompt.app --tags wcag2aa
```

---

## 16. Content Validation Pipeline

**The prompts are the product. Shipping unvalidated prompts is the highest risk in this project.**

### Validation Workflow

```
Author drafts prompt template
          │
          ▼
Self-review against checklist (below)
          │
          ▼
Submit to Medical Educator for clinical review
          │
          ▼
Educator tests prompt on GPT-4 with 3 real topics
          │
          ▼
Review output for: accuracy, hallucinations, completeness
          │
          ▼
Approval sign-off (documented in Notion/Linear)
          │
          ▼
Merge to main via PR — prompt goes live
```

### Clinical Review Checklist

For each master prompt, the reviewing educator must confirm:

- [ ] All required anatomical / physiological / pathological sections are present
- [ ] The "High-Yield Keywords" instruction targets actual board exam concepts
- [ ] The morphology / investigation tables request the correct columns
- [ ] No section could lead to dangerous clinical misinformation if hallucinated
- [ ] The disclaimer "⚠️ Verify this point" instruction is present
- [ ] Tested on ≥ 3 real topics; output reviewed for accuracy

### Reviewer Qualifications

Minimum: Final-year medical student (4th year+) or junior doctor.  
Preferred: Senior registrar or faculty member in the relevant specialty.

---

## 17. File & Folder Structure

```
medprompt/
├── .github/
│   └── workflows/
│       ├── deploy.yml              # Cloudflare Pages CI/CD
│       └── test.yml                # Unit + accessibility tests
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service Worker
│   ├── offline.html                # Offline fallback page
│   ├── icons/                      # All icon sizes (72–512, maskable)
│   └── screenshots/                # PWA install screenshots
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — fonts, metadata, analytics
│   │   ├── page.tsx                # Subject selection grid (/)
│   │   ├── [subject]/
│   │   │   ├── page.tsx            # Subject page (/pathology)
│   │   │   └── [topic]/
│   │   │       └── page.tsx        # Generated prompt page (/pathology/mi)
│   │   ├── api/
│   │   │   ├── og/route.ts         # Dynamic OG image generation
│   │   │   └── health/route.ts     # Health check endpoint
│   │   ├── offline/page.tsx        # Offline fallback
│   │   └── sitemap.ts              # Dynamic sitemap generation
│   ├── components/
│   │   ├── SubjectGrid.tsx         # 6-tile subject selection grid
│   │   ├── TopicInputSheet.tsx     # Slide-up modal with Turnstile
│   │   ├── PromptView.tsx          # Generated prompt display + copy button
│   │   ├── CopyButton.tsx          # Copy CTA with state machine
│   │   ├── Toast.tsx               # Non-blocking feedback notification
│   │   └── DeepLinkButton.tsx      # "Open in ChatGPT" (progressive enhancement)
│   ├── db/
│   │   ├── client.ts               # Turso/Drizzle edge client
│   │   ├── schema.ts               # Drizzle schema definitions
│   │   └── seed.ts                 # Initial data seed script
│   ├── lib/
│   │   ├── clipboard.ts            # 3-level clipboard engine
│   │   ├── prompts.ts              # injectTopic(), topicToSlug(), sanitizeTopic()
│   │   ├── analytics.ts            # Plausible event wrappers
│   │   └── deep-links.ts           # Platform-specific deep link construction
│   ├── middleware.ts               # Rate limiting middleware
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── drizzle/
│   └── migrations/                 # Auto-generated Drizzle migration files
├── wrangler.toml                   # Cloudflare Workers/Pages config
├── next.config.ts                  # Next.js config with Cloudflare adapter
├── tailwind.config.ts              # Tailwind with custom design tokens
├── tsconfig.json
└── package.json
```

---

## 18. Environment Variables

### Required Variables

```bash
# .env.local (development)
# Set in Cloudflare dashboard for production (never in wrangler.toml)

# Turso Database
TURSO_DATABASE_URL=libsql://[your-db].turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x000...   # Public — safe in client
TURNSTILE_SECRET_KEY=0x000...              # Server-side only

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=medprompt.app

# App
NEXT_PUBLIC_APP_URL=https://medprompt.app
```

### Setting Variables in Cloudflare

```bash
# Via Wrangler CLI (secrets are encrypted at rest)
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put TURNSTILE_SECRET_KEY

# Public vars via dashboard:
# Cloudflare Pages → Settings → Environment Variables
```

---

## 19. Release Milestones

### V1.0 — Core MVP (Target: 2 Weeks)

**Scope:**
- [ ] Subject grid UI (all 6 subjects)
- [ ] Topic input sheet with Turnstile
- [ ] All 6 master prompts — validated by medical educator
- [ ] 3-level clipboard engine with toast feedback
- [ ] Shareable URLs (`/[subject]/[topic-slug]`)
- [ ] `generateMetadata()` on all dynamic routes
- [ ] OG image generation endpoint
- [ ] Plausible analytics with copy/share events
- [ ] Deployed to Cloudflare Pages

**Not in V1.0:**
- PWA manifest / Service Worker
- Deep links (LLM app launch)
- Database (prompts hardcoded in `src/lib/prompt-templates.ts`)
- Admin panel

**Definition of Done:**
- Copy flow works on iOS Safari, Android Chrome, Desktop Chrome
- Plausible shows real events
- At least one shared URL renders correct OG image in WhatsApp
- Medical educator has reviewed all 6 prompts

---

### V1.1 — PWA & Shareability (Target: +2 Weeks)

**Scope:**
- [ ] `manifest.json` with all icon sizes (maskable + regular)
- [ ] Service Worker with offline cache for prompt pages
- [ ] Offline fallback page
- [ ] Deep link implementation (progressive enhancement)
- [ ] Keyboard accessibility audit + fixes
- [ ] `axe-core` automated accessibility test in CI
- [ ] `sitemap.ts` with seeded topic URLs

**Definition of Done:**
- "Add to Home Screen" works on iOS and Android
- Previously-visited prompt pages load offline
- Zero critical or serious `axe-core` violations

---

### V1.2 — Database & Topic Intelligence (Target: +3 Weeks)

**Scope:**
- [ ] Migrate from hardcoded templates to Turso + Drizzle
- [ ] Password-protected `/admin` route for prompt editing
- [ ] Topic autocomplete from `topics_seed` table
- [ ] Prompt version history (non-destructive updates)
- [ ] Cloudflare KV caching for prompt templates (TTL: 1 hour)
- [ ] `prompt_events` table logging for usage enrichment

**Definition of Done:**
- A non-developer can update a master prompt without touching code
- Autocomplete returns results on the first 2 typed characters
- Cached prompts serve in < 5ms from edge

---

### V2.0 — In-App LLM (Roadmap, Not MVP)

**Scope:**
- User supplies their own API key (stored in `localStorage` / `IndexedDB`)
- Prompt executes in-app — no clipboard step required
- Response rendered with markdown formatting
- Optional: premium tier where Anthropic/OpenAI key is provided by the platform

**Strategic note:** V2.0 fundamentally changes the product from a clipboard utility to a full LLM interface. Evaluate user demand (via Plausible data) before committing.

---

## 20. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Deep-link schemes break on LLM app update | High | Medium | Deep links are progressive enhancement; copy is always primary |
| Prompts produce hallucinated clinical content | Medium | High | Medical educator review before V1.0; disclaimer in every prompt |
| SQLite on edge (if reverted from Turso) | High | High | Turso is mandatory; no exceptions |
| OpenAI/Gemini restrict free-tier access | Medium | Medium | App-agnostic; users paste anywhere; not a dependency |
| Cloudflare Turnstile breaks on niche browsers | Low | Low | Challenge is invisible unless flagged; graceful degradation |
| Prompt library is cloned by competitors | High | Medium | Library is the moat; UI + trust + educator partnerships are the true moat |
| Service Worker serves stale prompts after update | Medium | Medium | Bust cache on each deploy using build hash in cache key |
| GDPR compliance (EU students) | Low | High | Plausible (no cookies, no PII); Turso stores no user data; Turnstile is privacy-compliant |

---

*This document is the single source of truth for the MedPrompt V1.0 MVP. All architecture decisions, design tokens, prompt specifications, and deployment configurations are defined here. Update this document before merging any change that deviates from the specifications above.*

---

**Document Owner:** Engineering Lead  
**Medical Content Reviewer:** [To be assigned]  
**Last Technical Review:** June 2026
