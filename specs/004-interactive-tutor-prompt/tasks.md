---
description: "Task list template for feature implementation"
---

# Tasks: Socratic Interactive Tutor Prompts

**Input**: Design documents from `/specs/004-interactive-tutor-prompt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Review `plan.md` and `spec.md` to establish context

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Implement Validation Strategy interfaces and classes in `src/lib/prompts/validation-strategy.ts`
- [ ] T003 Refactor Evaluator to use Validation Strategy pattern in `src/lib/prompts/evaluator.ts`
- [ ] T004 Define Template Variable Schema and resolution logic in `src/lib/prompts/variable-schema.ts`
- [ ] T005 [P] Add Medical Tutor Variables definitions in `src/lib/prompts/medical-tutor-variables.ts`
- [ ] T006 Update Database Schema for `promptTemplates` in `src/lib/db/schema.ts`
- [ ] T007 Define Generator interfaces in `src/lib/prompts/generator.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Interactive Socratic Support Engine (Priority: P1)

**Goal**: The prompt evaluation engine supports multi-variable templates without requiring rigid 3-header standard formats, so that interactive Agentic workflows can be deployed.

**Independent Test**: Can be tested directly via the `/api/generate` route by passing multi-variable JSON payloads to a non-standard template without throwing validation errors.

### Implementation for User Story 2

- [ ] T008 [P] [US2] Implement multi-variable injection `injectVariables` in `src/lib/prompts/injector.ts`
- [ ] T009 [P] [US2] Implement `CoreGenerator` in `src/lib/prompts/core-generator.ts`
- [ ] T010 [P] [US2] Implement `AnalyticsDecorator` in `src/lib/prompts/analytics-decorator.ts`
- [ ] T011 [US2] Refactor `PromptEngine` to use core generator and analytics decorator in `src/lib/prompts/engine.ts`

**Checkpoint**: Interactive Socratic Support Engine is fully functional.

---

## Phase 4: User Story 1 - Prompt Configuration (Priority: P1) 🎯 MVP

**Goal**: Allow users to select preferred Language and Analogy Domain before generating a prompt.

**Independent Test**: Can be fully tested by verifying that the frontend renders Language and Analogy Domain dropdowns and correctly maps selections to the generated output.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Update `GenerateContainer` UI to render variable controls in `src/app/GenerateContainer.tsx`
- [ ] T013 [P] [US1] Update Topic Page to be `force-dynamic` and pass variables in `src/app/[subject]/[topic]/page.tsx`
- [ ] T014 [P] [US1] Update `/api/generate` to accept variables in payload according to `contracts/api.md`

**Checkpoint**: Prompt Configuration is fully functional. At this point, MVP is met.

---

## Phase 5: User Story 3 - Distinct Caching by Variables (Priority: P2)

**Goal**: Prompt generation seamlessly caches varying combinations isolating varying parameters.

**Independent Test**: Can be tested by generating identical topics with varying languages, ensuring cache misses and hits match the full permutation of inputs.

### Implementation for User Story 3

- [ ] T015 [P] [US3] Implement variable hashing cache key builder in `src/lib/prompts/cache-key.ts`
- [ ] T016 [US3] Implement `CachingDecorator` using the variable hash in `src/lib/prompts/caching-decorator.ts`
- [ ] T017 [US3] Update `PromptEngine` decorator chain to include `CachingDecorator` in `src/lib/prompts/engine.ts`

**Checkpoint**: Distinct Caching by Variables is fully functional. All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T018 Run database migrations via Drizzle Kit for changes made in T006
- [ ] T019 Verify feature end-to-end according to `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US2 -> US1 -> US3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Integrates with US2 but can be developed independently
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US2 but can be developed independently

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel
- Decorators and the UI can be developed in parallel

---

## Parallel Example: User Story 2

```bash
# Launch implementation for US2 together:
Task: "Implement multi-variable injection `injectVariables` in src/lib/prompts/injector.ts"
Task: "Implement CoreGenerator in src/lib/prompts/core-generator.ts"
Task: "Implement AnalyticsDecorator in src/lib/prompts/analytics-decorator.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 2
4. Complete Phase 4: User Story 1
5. **STOP and VALIDATE**: Test User Stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 2 → Backend engine is ready
3. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
