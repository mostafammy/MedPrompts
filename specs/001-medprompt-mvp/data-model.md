# Data Model: MedPrompt MVP

**Phase**: Plan Phase 1  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## Overview

MedPrompt V1.0 is stateless from the server's perspective — all data is hardcoded in TypeScript source files and computed on demand. No persistent database writes occur in the core user flow. This document defines the logical data model, TypeScript type contracts, validation rules, and state transitions.

---

## Core Entities

### 1. Subject

Represents a medical discipline. Fixed set of 6 in V1.0.

```typescript
// src/types/index.ts

export interface Subject {
  id: SubjectId;           // Canonical URL key: 'pathology', 'anatomy', etc.
  label: string;           // Display name: 'Pathology', 'Anatomy', etc.
  icon: string;            // Icon identifier for SubjectIcon component
  sortOrder: number;       // Display order in grid (0-indexed)
  slug: string;            // Same as id — included for explicitness
}

export type SubjectId =
  | 'anatomy'
  | 'histology'
  | 'physiology'
  | 'microbiology'
  | 'pathology'
  | 'parasitology';
```

**Validation rules**:
- `id` must be one of the 6 valid SubjectId values — all others are invalid URL segments
- `sortOrder` determines left-to-right, top-to-bottom rendering order
- The set of subjects is immutable in V1.0; additions require a code change

**Registry** (`src/lib/subjects.ts`):
```typescript
export const SUBJECTS: Subject[] = [
  { id: 'anatomy',      label: 'Anatomy',      icon: 'bone',       sortOrder: 0, slug: 'anatomy' },
  { id: 'histology',    label: 'Histology',    icon: 'microscope', sortOrder: 1, slug: 'histology' },
  { id: 'physiology',   label: 'Physiology',   icon: 'heart-pulse',sortOrder: 2, slug: 'physiology' },
  { id: 'microbiology', label: 'Microbiology', icon: 'bacteria',   sortOrder: 3, slug: 'microbiology' },
  { id: 'pathology',    label: 'Pathology',    icon: 'flask',      sortOrder: 4, slug: 'pathology' },
  { id: 'parasitology', label: 'Parasitology', icon: 'bug',        sortOrder: 5, slug: 'parasitology' },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id);
}

export function isValidSubjectId(id: string): id is SubjectId {
  return SUBJECTS.some(s => s.id === id);
}
```

---

### 2. PromptTemplate

The engineered master prompt for a given subject. Contains the `{{TOPIC}}` placeholder. Hardcoded in V1.0; migrated to Turso in V1.2.

```typescript
export interface PromptTemplate {
  id: string;              // e.g. 'pathology-v1'
  subjectId: SubjectId;    // Foreign key to Subject
  version: number;         // Template version (monotonically increasing)
  template: string;        // Full prompt text with {{TOPIC}} placeholder
  isActive: boolean;       // Only one active template per subject
  validatedBy: string;     // Medical educator name/role (pre-launch requirement)
  validatedAt: string;     // ISO 8601 date of educator sign-off
}
```

**Validation rules**:
- `template` MUST contain exactly one or more `{{TOPIC}}` placeholders
- Exactly one `PromptTemplate` per `subjectId` where `isActive === true`
- `validatedBy` and `validatedAt` must be non-empty before production deployment

**Active template lookup** (`src/lib/prompt-templates.ts`):
```typescript
export function getActiveTemplate(subjectId: SubjectId): PromptTemplate {
  const template = PROMPT_TEMPLATES.find(t => t.subjectId === subjectId && t.isActive);
  if (!template) throw new Error(`No active template for subject: ${subjectId}`);
  return template;
}
```

---

### 3. Topic (Input Value Object)

A user-supplied medical concept. Not persisted in V1.0.

```typescript
export interface Topic {
  raw: string;         // Original user input (before sanitization)
  sanitized: string;   // After sanitization (≤120 chars, injection-free)
  slug: string;        // URL-safe lowercase: 'myocardial-infarction'
  label: string;       // Human-readable title-case: 'Myocardial Infarction'
}
```

**Transformation rules**:
```
raw → sanitized:
  1. Trim whitespace
  2. Reject if matches BANNED_PATTERNS (return null → invalid input)
  3. Strip: < > { } [ ] \ (bracket/injection chars)
  4. Flatten: \n \r \t → single space
  5. Collapse: multiple spaces → single space
  6. Slice: to maximum 120 characters

sanitized → slug:
  1. Lowercase all characters
  2. Remove all non-alphanumeric, non-space, non-hyphen characters
  3. Replace spaces with hyphens
  4. Collapse multiple hyphens
  5. Trim leading/trailing hyphens

sanitized → label:
  1. Split on spaces and hyphens
  2. Title-case each word
  3. Join with spaces
```

**Banned patterns** (prompt injection detection):
```typescript
const BANNED_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /disregard/i,
  /\bsystem\s*prompt\b/i,
  /act as(?! a .*(professor|doctor|medical|educator))/i,
];
```
> Note: The `act as` ban includes an exception for legitimate medical study phrases like "act as a professor".

**Validation rules**:
- `sanitized` length must be 1–120 characters (after sanitization)
- `slug` must match `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/` or be a single word
- Empty `sanitized` (after stripping) is invalid → prevent form submission

---

### 4. GeneratedPrompt (Computed Value)

The result of injecting a Topic into a PromptTemplate. Ephemeral — computed on each page load.

```typescript
export interface GeneratedPrompt {
  subjectId: SubjectId;
  topic: Topic;
  content: string;        // Full prompt text ready to copy
  characterCount: number; // For UI display
  wordCount: number;      // For UI display
}
```

**Computation**:
```typescript
export function generatePrompt(subjectId: SubjectId, topic: Topic): GeneratedPrompt {
  const template = getActiveTemplate(subjectId);
  const content = template.template.replace(/\{\{TOPIC\}\}/g, topic.sanitized);
  return {
    subjectId,
    topic,
    content,
    characterCount: content.length,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}
```

---

### 5. ShareableURL (URL State)

Encodes the full application state in the URL path.

```typescript
export interface ShareableURL {
  subject: SubjectId;     // URL segment 1
  topicSlug: string;      // URL segment 2 (URL-safe)
  canonical: string;      // Full URL: https://medprompts.mostafayaser.earth/<subject>/<slug>
}
```

**URL structure**:
```
/                                     → Home (subject grid)
/<subjectId>                          → Subject pre-selected (topic input open)
/<subjectId>/<topic-slug>             → Full state: generated prompt visible
```

---

### 6. AnalyticsEvent (Fire-and-Forget)

Privacy-first event emitted to Plausible. Not stored on MedPrompt servers.

```typescript
export type PromptCopiedEvent = {
  name: 'Prompt Copied';
  props: { subject: SubjectId; topic: string; method: CopyMethod };
};

export type DeepLinkAttemptedEvent = {
  name: 'Deep Link Attempted';
  props: { target: 'chatgpt' | 'gemini'; outcome: 'launched' | 'fallback' };
};

export type SharedURLVisitedEvent = {
  name: 'Shared URL Visited';
  props: { subject: SubjectId; topic: string };
};

export type AnalyticsEvent =
  | PromptCopiedEvent
  | DeepLinkAttemptedEvent
  | SharedURLVisitedEvent;

export type CopyMethod = 'clipboard-api' | 'exec-command' | 'manual';
```

---

## State Transitions

### Application State Machine

```
INITIAL (home, no subject selected)
  │
  ├─[tap subject tile]──────────────────────────→ SUBJECT_SELECTED
  │                                               URL: /<subject>
  └─[navigate to /<subject>]──────────────────→  SUBJECT_SELECTED
                                                  (TopicInputSheet auto-opens)
SUBJECT_SELECTED
  │
  ├─[type topic + submit]──────────────────────→ GENERATING (URL push)
  │                                               URL: /<subject>/<topic-slug>
  └─[close modal / press Escape]───────────────→ INITIAL

GENERATING (server renders prompt page)
  │
  └─[page load complete]───────────────────────→ PROMPT_READY
                                                  URL: /<subject>/<topic-slug>
PROMPT_READY
  │
  ├─[tap Copy Prompt]──────────────────────────→ COPYING
  ├─[tap Copy & Open ChatGPT]──────────────────→ COPYING_WITH_DEEPLINK
  └─[tap different subject tile]───────────────→ SUBJECT_SELECTED (new subject)

COPYING
  │
  ├─[clipboard-api success]────────────────────→ COPY_SUCCESS (2s) → PROMPT_READY
  ├─[exec-command success]─────────────────────→ COPY_SUCCESS (2s) → PROMPT_READY
  └─[all methods fail]─────────────────────────→ MANUAL_SELECT (textarea shown)

COPYING_WITH_DEEPLINK
  │
  ├─[copy success + app launch]────────────────→ COPY_SUCCESS + app launched
  └─[copy success + app not found]─────────────→ COPY_SUCCESS (silent deeplink fail)
```

### CopyButton State Machine

```
IDLE → [click] → COPYING → [success] → SUCCESS (2000ms) → IDLE
                          → [manual]  → MANUAL (textarea visible, stays until dismissed)
```

---

## V1.2 Database Schema (Scaffolded, Inactive in V1.0)

```typescript
// src/db/schema.ts — Drizzle ORM definitions for Turso/libSQL

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const subjects = sqliteTable('subjects', {
  id:        text('id').primaryKey(),
  label:     text('label').notNull(),
  icon:      text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const promptTemplates = sqliteTable('prompt_templates', {
  id:          text('id').primaryKey(),
  subjectId:   text('subject_id').notNull().references(() => subjects.id),
  version:     integer('version').notNull().default(1),
  template:    text('template').notNull(),
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  updatedAt:   text('updated_at'),
  updatedBy:   text('updated_by'),
  validatedBy: text('validated_by'),
  validatedAt: text('validated_at'),
});

export const topicsSeed = sqliteTable('topics_seed', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  topic:     text('topic').notNull(),
  slug:      text('slug').notNull(),
});

export const promptEvents = sqliteTable('prompt_events', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  subjectId: text('subject_id').notNull(),
  topicSlug: text('topic_slug').notNull(),
  copiedAt:  text('copied_at'),
  uaHint:    text('ua_hint'),
});
```

---

## Key Relationships

```
Subject (1) ──────────── (1+) PromptTemplate
                               (1 active at a time)

Subject (1) ──────────── (*) Topic (ephemeral, URL-derived)

Topic + PromptTemplate ──────→ GeneratedPrompt (computed, not stored)

GeneratedPrompt ──────────── (*) AnalyticsEvent (fire-and-forget)
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Prompt templates hardcoded in TypeScript (V1.0) | Eliminates database dependency at launch; templates are developer-authored content, not user data |
| Topic is a value object (not stored) | Privacy-first — no user topic data is persisted in V1.0; analytics fire prop `topic` as plain string without PII association |
| `sanitized` vs `slug` separation | Sanitized form is injected into the prompt (preserves title case); slug is URL-safe (lowercase). Different purposes need different transforms |
| `GeneratedPrompt` computed per-request | Stateless edge rendering — each page load recomputes from template + slug. No cache invalidation needed for content (cache for CDN performance) |
| SubjectId as union type | TypeScript exhaustive checking prevents invalid subject routing at compile time |
