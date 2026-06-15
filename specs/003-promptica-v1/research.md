# Phase 0: Outline & Research

## Architectural Decisions

All major decisions were defined in the `MedPrompt_Engineering_Playbook.md`. No further clarifications are needed for the core V1 application.

### Hosting & Edge Computing
- **Decision**: Cloudflare Workers + Pages
- **Rationale**: Provides a global edge network ensuring sub-50ms latency for users globally. V8 isolates allow 0ms cold starts which is critical for mobile usage on varying network speeds.
- **Alternatives considered**: Vercel Serverless (200-800ms cold starts), AWS Lambda@Edge.

### Database & ORM
- **Decision**: Turso (libSQL) + Drizzle ORM
- **Rationale**: Turso supports SQLite semantics over HTTP, making it fully compatible with Cloudflare Workers' V8 isolates. Drizzle ORM provides a lightweight, type-safe, SQL-first interface without heavy runtime dependencies.
- **Alternatives considered**: Prisma (rejected due to 5MB runtime bundle size), standard SQLite (no native fs access on CF Workers).

### Prompt Engine
- **Decision**: Deterministic string templates with placeholders. No LLM integration for V1.
- **Rationale**: String replacement is fast, perfectly cacheable, has zero API cost, and guarantees a deterministic output without content moderation liabilities or API rate limits. 
- **Alternatives considered**: LLM-based prompt refinement (deferred to V1.5/V2.0 due to cost and non-determinism).
