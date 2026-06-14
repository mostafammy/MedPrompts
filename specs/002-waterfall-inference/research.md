# Research and Design Decisions: Resilient Waterfall Inference Engine

This document outlines the technical research, architectural decisions, and alternatives evaluated during the design of the MedPrompt inference layer.

---

## 1. Edge State Management (Isolate Memory vs. Distributed Redis)

### Decision
Use a best-effort in-memory `Map` inside the edge runtime execution isolate for request and budget tracking. Abstract all operations behind the `IBudgetManager` interface to allow a drop-in replacement with Upstash Redis or similar distributed store.

### Rationale
Operating at zero compute and storage cost is a core business requirement. Free-tier Redis services have rate limits and setup friction. Under typical usage, a single edge isolate handles sequential traffic from users, making in-memory tracking highly effective. If traffic spikes and multiple isolates are spun up, reactive 429 detection (Mechanism A) catches any overflow. 

### Alternatives Considered
- **Upstash Redis (Atomic Increments)**: Rejected for MVP due to external dependency setup, but the interface is designed to support this as a seamless upgrade when traffic volumes justify it.
- **Cloudflare Durable Objects**: Rejected because they require a paid Cloudflare Workers subscription, violating the zero-cost constraint.

---

## 2. Timeout and Request Cancellation

### Decision
Use `AbortController` to cancel slow requests, passing the abort signal directly to the Vercel AI SDK's `generateText` method.

### Rationale
A standard `Promise.race()` timeout wrapper only discards the promise resolution on the client side. The underlying HTTP connection to the LLM provider remains active, consuming token quotas and minute request budgets. Passing the `AbortSignal` ensures the connection is physically aborted at the TCP/HTTP layer, saving precious free-tier capacity.

### Alternatives Considered
- **`Promise.race()` wrapper**: Rejected due to orphaned background requests consuming rate limits.

---

## 3. Type-Safe Error Classification

### Decision
Use `zod` to define and validate the error response schema of the Vercel AI SDK, combined with a regular expression fallback for stringified messages.

### Rationale
Errors thrown by the AI SDK can have multiple shapes (e.g., JSON response with headers, plain string messages, HTTP status codes). Direct type assertions (unsafe `as` casts) are prone to runtime failures if the SDK version updates. Zod ensures type-safe validation before extracting headers like `Retry-After`.

### Alternatives Considered
- **Unsafe casting (`error as any`)**: Rejected due to vulnerability to runtime crashes on schema mismatch.

---

## 4. Prompt Injection Sanitization

### Decision
Implement regex-based sanitization that removes control characters (`<`, `>`, `{`, `}`, backticks) and rejects specific instructions (e.g., "ignore previous instructions", "system:"). Enforce a hard length limit of 200 characters.

### Rationale
In a medical education context, prompt injection could hijack the LLM to output wrong or harmful clinical data, creating a patient safety risk. Strip-and-reject regex sanitization runs locally in microseconds with zero overhead.

### Alternatives Considered
- **Guardrail LLM Model (e.g., Llama Guard)**: Rejected because it adds ~500ms of latency and consumes additional free-tier API quotas.
