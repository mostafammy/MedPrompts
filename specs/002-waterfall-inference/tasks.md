# Tasks: Resilient Waterfall Inference Engine

**Input**: Design documents from `/specs/002-waterfall-inference/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Paths assume a single project structure as specified in plan.md: `src/` and `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Configure TypeScript and Vercel AI SDK dependencies in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create shared types and dependency injection interfaces in src/lib/ai/types.ts
- [X] T003 [P] Create structured JSON log event helper in src/lib/ai/logger.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Resilient Prompt Generation (Priority: P1) 🎯 MVP

**Goal**: Seamless fallback prompt generation across 6 AI providers with AbortController timeout.

**Independent Test**: Simulate provider downtime (e.g., mock failures) and verify success on fallback.

### Tests for User Story 1
- [X] T004 [P] [US1] Create unit tests for waterfall loop using mock registry and budget manager in tests/ai/waterfall.test.ts

### Implementation for User Story 1
- [X] T005 [P] [US1] Create OCP-compliant registry and model factories in src/lib/ai/providers.ts
- [X] T006 [US1] Implement core waterfall engine with AbortController timeout in src/lib/ai/waterfall.ts (depends on T002, T003, T005)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Proactive Rate-Limit Avoidance (Priority: P1)

**Goal**: Proactively skip rate-limited providers in memory before calls.

**Independent Test**: Concurrent calls trigger proactive cooldown bypass, shifting requests to subsequent tiers.

### Tests for User Story 2
- [X] T007 [P] [US2] Create unit tests for the budget manager and cooldown transitions in tests/ai/budget-manager.test.ts

### Implementation for User Story 2
- [X] T008 [US2] Implement budget manager and minute-roller in src/lib/ai/budget-manager.ts (depends on T002, T003, T005)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work and be testable.

---

## Phase 5: User Story 3 - Medical Input Sanitization (Priority: P2)

**Goal**: Prevent prompt hijacking via topic sanitization regex and length check.

**Independent Test**: Verify injection topics are sanitized or rejected.

### Tests for User Story 3
- [X] T009 [P] [US3] Write unit tests for sanitization regex checks and constraints in tests/ai/sanitize.test.ts

### Implementation for User Story 3
- [X] T010 [P] [US3] Implement prompt injection and character sanitization in src/lib/ai/sanitize.ts

**Checkpoint**: Sanitization features are fully functional.

---

## Phase 6: User Story 4 - Gated Provider Health Monitoring (Priority: P3)

**Goal**: Expose auth-gated API endpoints for inference and health checks.

**Independent Test**: POST endpoint returns result with X-Provider headers, GET endpoint gates full status output via health check secret.

### Tests for User Story 4
- [X] T011 [P] [US4] Write integration tests for API route authentication and generation headers in tests/api/generate.test.ts

### Implementation for User Story 4
- [X] T012 [US4] Implement edge endpoint POST and health GET handlers in src/app/api/generate/route.ts (depends on T006, T008, T010)

**Checkpoint**: All user stories are independently functional and fully integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T013 Configure environment secrets and compatibility in wrangler.toml
- [X] T014 Run type checking and check linting errors across all files
- [X] T015 Run quickstart validation steps to verify endpoint integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - US1 and US2 can run in parallel, though US1 is the target MVP.
  - US3 is independent of other stories but needs foundational modules.
  - US4 depends on US1, US2, and US3.
- **Polish (Final Phase)**: Depends on all stories being complete.

### Within Each User Story

- Tests must fail before implementation.
- Models and config registries must be completed before execution logic.
- Engine routes must bind elements together.

### Parallel Opportunities

- T003 and T004 can run in parallel.
- T007 and T009 can run in parallel.
- Integration tests can be structured concurrently.

---

## Parallel Example: User Story 1

```bash
# Implement the registry config and tests in parallel:
Task: "Create OCP-compliant registry and model factories in src/lib/ai/providers.ts"
Task: "Create unit tests for waterfall loop using mock registry and budget manager in tests/ai/waterfall.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify fallback works using simulated mock outages.

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test fallback loop (MVP)
3. Add User Story 2 -> Test rate limit avoidance
4. Add User Story 3 -> Test injection sanitization
5. Add User Story 4 -> Integrate endpoints and verify header metrics and auth gating
