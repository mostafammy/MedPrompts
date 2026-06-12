# Implementation Plan: Resilient Waterfall Inference Engine

**Branch**: `002-waterfall-inference` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-waterfall-inference/spec.md`

---

## Summary

Implement the MedPrompt inference layer as a highly resilient, zero-cost, 6-tier fallback engine. The system cascades through multiple free-tier LLM providers (Groq, Cerebras, DeepInfra, Together AI, OpenRouter, Google Gemini) to deliver generated study prompts under 800ms (P50) and 99.7%+ availability. It uses proactive budget tracking to bypass providers close to their rate limit, reactive 429 cooling windows, 15-second error backoffs, and latency anomaly deprioritization. It is fully decoupled via dependency injection (DIP) and compliant with the Open-Closed Principle (OCP) for easy provider extension.

---

## Technical Context

**Language/Version**: TypeScript 5.x + React 19 / Next.js 15.x (App Router)  
**Primary Dependencies**: `ai` (Vercel AI SDK ^4.0.0), `@ai-sdk/groq`, `@ai-sdk/cerebras`, `@ai-sdk/deepinfra`, `@ai-sdk/togetherai`, `@openrouter/ai-sdk-provider`, `@ai-sdk/google`, `zod`, `next` (App Router)  
**Storage**: In-memory `Map` (best-effort state tracking per isolate; designed to easily swap to Upstash Redis for distributed state)  
**Testing**: Unit tests with mock registries and budget managers; type check validation; manual HTTP request validation  
**Target Platform**: Cloudflare Pages / Workers (Edge Runtime)  
**Project Type**: Edge Web Service / API Endpoint  
**Performance Goals**: P50 latency < 800ms; P95 < 3,500ms; P99 < 7,000ms; cascade overhead < 300ms per step  
**Constraints**: Edge environment compatibility (no Node.js-only APIs; Web standard APIs only); zero-cost operation; secure health endpoint; safety-critical input sanitization  
**Scale/Scope**: 6 provider integrations; 25-60 RPM budgets per provider; up to 1,500 daily requests capacity  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: The project constitution (`constitution.md`) has placeholder template content. The gates below are derived from the project's explicit architectural guidelines and requirements.

| Gate | Status | Notes |
|------|--------|-------|
| Edge-native compatibility | ✅ PASS | Implemented using the Next.js Edge runtime; only Web APIs (`AbortController`, `fetch`) and edge-compatible packages are used. |
| Zero-cost operation | ✅ PASS | Uses free-tier API keys with conservative RPM budgets and proactive usage limits. |
| SOLID Adherence (DIP) | ✅ PASS | All engine operations depend on `IBudgetManager` and `IProviderRegistry` interfaces instead of concrete classes/instances. |
| SOLID Adherence (OCP) | ✅ PASS | Provider configuration and model creation are co-located in the registry object; adding a provider requires no changes to the waterfall loop or routing code. |
| Input Sanitization | ✅ PASS | A specialized prompt injection sanitizer is used on the input topic before prompt generation. |
| Secure Health Snapshot | ✅ PASS | The health endpoint restricts full provider status outputs to callers presenting the `HEALTH_CHECK_SECRET`. |
| Structured Logging | ✅ PASS | Standard `console` calls are replaced by a machine-parseable JSON log event wrapper. |

**No violations requiring justification.**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-waterfall-inference/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-contracts.md # API routes and query schemas
│   └── di-contracts.md  # Dependency Injection interfaces
└── Medprompt 6tier waterfall architecture.md # Original design document
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── generate/
│           └── route.ts         # Main Edge Route Handler (POST / api/generate, GET /api/generate)
├── lib/
│   └── ai/
│       ├── providers.ts         # OCP-compliant provider registry & configs
│       ├── budget-manager.ts    # In-memory rate-limit state machine
│       ├── waterfall.ts         # Core waterfall executor with DI
│       ├── logger.ts            # Structured JSON logger
│       ├── sanitize.ts          # Prompt injection input sanitizer
│       └── types.ts             # Shared TS types and DI interfaces
```

**Structure Decision**: Single Next.js project layout. The inference engine files live in a dedicated `src/lib/ai/` module directory, and the API edge handler lives in `src/app/api/generate/route.ts` executing on the edge runtime.

---

## Complexity Tracking

*No constitution violations requiring justification.*
