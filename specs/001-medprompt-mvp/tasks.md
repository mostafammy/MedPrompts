# Tasks: MedPrompt MVP

**Input**: Design documents from `/specs/001-medprompt-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification. (Not requested in spec).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/app/`, `src/components/`, `src/lib/`, `public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Next.js 15 project with Tailwind CSS 4 and TypeScript
- [X] T002 Configure `@opennextjs/cloudflare` adapter and Wrangler in `wrangler.jsonc`
- [X] T003 Set up root layout and generic metadata in `src/app/layout.tsx`
- [X] T004 [P] Update `tsconfig.json` for webworker lib support (for Serwist later)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `src/lib/subjects.ts` with the 6 subjects and types
- [X] T006 [P] Create `src/lib/prompt-templates.ts` with master prompt templates
- [X] T007 [P] Create `src/lib/prompts.ts` with `sanitizeTopic` and `topicToSlug` logic
- [X] T008 Configure `next-plausible` analytics provider in `src/app/layout.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate & Copy a Board-Exam Prompt (Priority: P1) 🎯 MVP

**Goal**: A medical student selects a subject, types a topic, generates a prompt, and copies it to the clipboard.

**Independent Test**: Complete the 3-tap flow on the app, verify clipboard contents match the expected master prompt with the topic injected.

### Implementation for User Story 1

- [X] T009 [US1] Implement server action `generatePromptAction` with Turnstile verification in `src/app/actions.ts`
- [X] T010 [P] [US1] Create `src/components/TurnstileWidget.tsx` wrapper
- [X] T011 [US1] Create `src/components/TopicInputSheet.tsx` (form logic, action wiring)
- [X] T012 [P] [US1] Create `src/lib/clipboard.ts` with 3-level clipboard engine
- [X] T013 [P] [US1] Create `src/components/Toast.tsx` notification component
- [X] T014 [US1] Create `src/components/CopyButton.tsx` (uses clipboard engine and Plausible events)
- [X] T015 [US1] Create `src/components/PromptView.tsx` container for the prompt and copy button

**Checkpoint**: At this point, User Story 1 components are built and can be manually tested in isolation.

---

## Phase 4: User Story 2 - Subject Selection Grid (Priority: P1)

**Goal**: A student sees a full-screen grid of 6 medical subjects and can tap one to begin.

**Independent Test**: Load the home page, verify 6 tiles are displayed, confirm tapping a tile opens the input sheet and updates URL to `/<subject>`.

### Implementation for User Story 2

- [X] T016 [P] [US2] Create `src/components/SubjectTile.tsx`
- [X] T017 [US2] Create `src/components/SubjectGrid.tsx`
- [X] T018 [US2] Implement home page in `src/app/page.tsx`
- [X] T019 [US2] Implement subject landing page in `src/app/[subject]/page.tsx` (connects grid and TopicInputSheet)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. The app now has a functional home page and flow.

---

## Phase 5: User Story 3 - Shareable URL Opens Pre-Filled Prompt (Priority: P2)

**Goal**: A shareable URL `/subject/topic-slug` renders the prompt server-side with OG metadata.

**Independent Test**: Visit a URL directly, verify the prompt is shown, and check OG tags in HTML source.

### Implementation for User Story 3

- [X] T020 [US3] Implement generated prompt page in `src/app/[subject]/[topic]/page.tsx`
- [X] T021 [US3] Add `generateMetadata` function to `src/app/[subject]/[topic]/page.tsx` for dynamic OG tags
- [X] T022 [US3] Implement dynamic OG image generator in `src/app/api/og/route.tsx`
- [X] T023 [P] [US3] Add `src/app/sitemap.ts` to expose static seed routes

**Checkpoint**: All shareable routing and SEO features are now functional.

---

## Phase 6: User Story 4 - PWA Install & Offline Access (Priority: P2)

**Goal**: App can be installed to home screen and accessed offline.

**Independent Test**: Install on mobile browser, go offline, and visit a previously loaded page.

### Implementation for User Story 4

- [X] T024 [P] [US4] Add `manifest.json` and icons to `public/` directory
- [X] T025 [US4] Configure `@serwist/next` in `next.config.ts`
- [X] T026 [US4] Create Service Worker logic in `src/sw.ts`
- [X] T027 [US4] Create offline fallback page in `src/app/offline/page.tsx`

**Checkpoint**: PWA is installable and works offline.

---

## Phase 7: User Story 5 - Deep Link to LLM App (Priority: P3)

**Goal**: Allow users to copy and launch ChatGPT/Gemini native apps directly.

**Independent Test**: Tap "Copy & Open ChatGPT", verify copy succeeds, and app launches (or falls back silently if not installed).

### Implementation for User Story 5

- [X] T028 [P] [US5] Create `src/lib/deep-links.ts` utility for URL scheme detection
- [X] T029 [US5] Create `src/components/DeepLinkButton.tsx` (using clipboard API and Plausible events)
- [X] T030 [US5] Add `DeepLinkButton` to `src/components/PromptView.tsx`

**Checkpoint**: Progressive enhancement for LLM deep links is active.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T031 [P] Create health check endpoint in `src/app/api/health/route.ts`
- [X] T032 Design token updates in `src/app/globals.css`
- [X] T033 Run accessibility audit (axe-core) on all interactive components
- [X] T034 Verify all Edge runtime and Cloudflare Worker constraints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Integrates US1 components into the visual layout
- **User Story 3 (P2)**: Extends US1 logic to a server-side route
- **User Story 4 (P2)**: PWA shell
- **User Story 5 (P3)**: Progressive enhancement on US1

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Independent components in US1 (Clipboard logic, Toast, TurnstileWidget) can be built in parallel.
- PWA static assets and Deep Link utility can be drafted in parallel with UI work.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Core logic)
4. Complete Phase 4: User Story 2 (Core UI)
5. **STOP and VALIDATE**: Test User Story 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Stories 1 & 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Add User Story 5 → Test independently → Deploy/Demo
