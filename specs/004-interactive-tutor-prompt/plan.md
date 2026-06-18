# Implementation Plan: Socratic Interactive Tutor Prompts

**Branch**: `004-interactive-tutor-prompt` | **Date**: 2026-06-18 | **Spec**: [spec.md](file:///C:/Users/dell/Documents/MostafaYaser%20Website/medprompts.mostafayaser.earth/specs/004-interactive-tutor-prompt/spec.md)
**Input**: Feature specification from `/specs/004-interactive-tutor-prompt/spec.md`

## Summary

The current application generates prompts using a rigid, one-shot architecture built entirely around replacing a single `{{TOPIC}}` variable. To support the new **Socratic Interactive Tutor**, which utilizes a highly structured 4-phase pedagogical pipeline with language localization and analogy customization, we must upgrade the prompt generation engine into a multi-variable templating system.

**High-Level Architecture Changes:**
1. **Data Layer**: Modify the SQLite (`prompt_templates`) schema to persist `variables` (JSON array of required variables) and an `is_interactive` (boolean) flag.
2. **Core Logic**: Refactor `injector.ts` to execute a global Regex replacement over a dictionary of user-supplied variables instead of a static `replace('{{TOPIC}}')`. Update `evaluator.ts` to bypass strict markdown header requirements if `is_interactive` is true. Update `cache.ts` key generation to hash the additional variables.
3. **API & Transport**: Update the `/api/generate` contract to accept an arbitrary `Record<string, string>` map of variables.
4. **Frontend UI**: Update `GenerateContainer.tsx` to dynamically render input fields or dropdowns mapping to the template's required variables before executing the generation request.

## Technical Context

**Language/Version**: TypeScript / Next.js 16+
**Primary Dependencies**: React, Next.js App Router, Drizzle ORM, @libsql/client
**Storage**: `local.db` (SQLite for local dev) + Turso (production)
**Testing**: Vitest for unit testing core logic (`injector.ts`, `evaluator.ts`), Playwright for E2E.
**Target Platform**: Web & Cloudflare Workers (Edge execution via `opennextjs-cloudflare`)
**Performance Goals**: Core variable injection logic (`injector.ts`) must remain under < 50ms execution time, despite the switch to global Regex mapping.
**Constraints**: 
- **Backwards Compatibility**: Must not break existing single-variable `{{TOPIC}}` templates in the DB.
- **Cache Integrity**: Must prevent cross-variable cache collisions (e.g. Spanish vs German prompt on the same topic must result in different cache keys).
**Scale/Scope**: End-to-End slice spanning DB migration, backend core, edge API route, and frontend UI components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Test-First Principle**: Unit tests for `injector.ts` and `evaluator.ts` will need to be written before implementing the multi-variable regex logic. 
- **No violations detected.**

## Project Structure

### Documentation (this feature)

```text
specs/004-interactive-tutor-prompt/
├── plan.md              # Detailed implementation roadmap (this file)
├── research.md          # Explains regex and cache design decisions
├── data-model.md        # Outlines Drizzle ORM schema modifications
├── quickstart.md        # Dev-testing guide
├── contracts/
│   └── api.md           # API payload modifications
└── tasks.md             # Ordered task breakdown (generated in next phase)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/generate/route.ts        # Updates to payload parsing and engine args
│   ├── [subject]/[topic]/page.tsx   # Passes available template variables down to container
│   └── GenerateContainer.tsx        # UI updates: dynamic dropdowns/inputs for Language/Analogy
├── lib/
│   ├── db/schema.ts                 # Adds `variables` (json) and `is_interactive` (boolean)
│   └── prompts/
│       ├── engine.ts                # Updates caching keys to include variable hashes
│       ├── evaluator.ts             # Adds conditional bypass for strict format rules
│       └── injector.ts              # Upgraded to multi-variable Regex replacement
drizzle/                             # New migration files will be generated here
```

**Structure Decision**: Utilizing the existing standard Next.js App Router Monolith architecture. Logic stays decoupled in `/src/lib/prompts/` to ensure clean testing boundaries outside of Next.js contexts.

## Complexity Tracking

| Violation / Complexity | Why Needed | Simpler Alternative Rejected Because |
|------------------------|------------|--------------------------------------|
| **DB Schema Migration** | Need to inform the UI which dropdowns to render dynamically based on the selected prompt. | Hardcoding variables into the UI logic was rejected because it violates data-driven UI principles and makes future prompt expansions require code changes. |
| **Regex Parsing over `replace`** | Required to support $N$ arbitrary variables (e.g. `{{LANGUAGE}}`, `{{ANALOGY}}`) dynamically. | Hardcoding `.replace('{{LANGUAGE}}').replace('{{ANALOGY}}')` was rejected because it doesn't scale for future arbitrary prompt variables. |
