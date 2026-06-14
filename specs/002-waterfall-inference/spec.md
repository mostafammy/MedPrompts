# Feature Specification: Resilient Waterfall Inference Engine

**Feature Branch**: `002-waterfall-inference`  
**Created**: 2026-06-12  
**Status**: Draft  
**Input**: User description: "Medprompt 6tier waterfall architecture: a highly resilient prompt generation fallback engine operating across 6 AI providers on free tiers, with proactive budget-based skip, reactive 429 handling, latency anomaly detection, and prompt injection sanitization."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resilient Prompt Generation (Priority: P1)

A medical student requests a board-exam study prompt to be generated. Even if some underlying AI providers are offline or experiencing outages, the student receives their generated prompt seamlessly within seconds, without seeing any system error screens.

**Why this priority**: Resilient prompt generation is the core engine of the MedPrompt application. If generation fails, the clipboard utility becomes completely non-functional.

**Independent Test**: Can be tested by simulating service outages (5xx responses or connection timeouts) on primary AI providers. Verify that the request automatically cascades to the next available tier and successfully returns the generated prompt.

**Acceptance Scenarios**:

1. **Given** the primary provider is operational, **When** a generation request is made, **Then** the response is returned from the primary provider in under 500 milliseconds.
2. **Given** the primary provider returns a service failure (e.g., 50x server error), **When** a generation request is made, **Then** the system immediately routes the request to the second-tier provider and returns the result without presenting any failure notifications to the user.
3. **Given** all providers except the final fail-safe provider are down, **When** a generation request is made, **Then** the request successfully cascades through the tiers and returns a correctly structured response from the final fail-safe provider within 7 seconds.
4. **Given** all providers are exhausted and unable to process the request, **When** a generation request is made, **Then** the system returns a friendly rate-limit error instructing the user to try again in 60 seconds.

---

### User Story 2 - Proactive Rate-Limit Avoidance (Priority: P1)

During high-concurrency study sessions where many students are generating prompts, the system tracks each provider's usage. It skips overloaded providers *before* sending requests to them, protecting students from waiting on slow timeout or throttle error responses.

**Why this priority**: Free-tier API keys have extremely low rate limits. Without proactive tracking, concurrent requests would trigger constant throttle errors, causing cascade latency penalties and violating response time guarantees.

**Independent Test**: Run a high-concurrency simulation test. Verify that when a provider is within 10% of its minute-window limit, subsequent requests bypass it, maintaining low latency and avoiding HTTP 429 cascades.

**Acceptance Scenarios**:

1. **Given** a provider has used 90% or more of its current minute-window request budget, **When** a new generation request is received, **Then** the system skips that provider and routes the request to the next available provider.
2. **Given** a provider returns an explicit rate limit error containing a retry delay, **When** the error occurs, **Then** the provider is marked as rate-limited, the specified cooldown is enforced, and the request cascades immediately to the next provider.
3. **Given** a provider's rate-limit cooldown window has expired, **When** a new request is evaluated, **Then** that provider is restored to service and made available for requests.

---

### User Story 3 - Medical Input Sanitization (Priority: P2)

A student inputs a topic name that contains malicious formatting or prompt injection keywords (e.g., instructions designed to override the AI's persona). The system sanitizes the input, preventing prompt hijacking and ensuring the output remains clinically safe and relevant.

**Why this priority**: In a medical education context, a compromised prompt could generate incorrect or harmful clinical advice. Preventing prompt injection is critical for safety and compliance.

**Independent Test**: Submit inputs containing standard prompt injection keywords and control characters. Verify they are either stripped or rejected, and the system prompt templates are never bypassed.

**Acceptance Scenarios**:

1. **Given** a user inputs a topic with special characters (e.g., HTML tags, backticks, braces), **When** the generation is requested, **Then** those characters are stripped, and the cleaned topic is injected safely.
2. **Given** a user inputs a topic containing prompt override commands (e.g., "ignore previous instructions"), **When** the request is processed, **Then** the system rejects the input and displays a clear message stating the topic is invalid.
3. **Given** a topic input exceeds 200 characters, **When** submitted, **Then** the input is truncated to 200 characters before sanitization.

---

### User Story 4 - Gated Provider Health Monitoring (Priority: P3)

An administrator needs to monitor the operational status of all prompt-generation providers (e.g., seeing which ones are ready, cooling, or degraded). This status endpoint must be secured so it cannot be abused or exposed to the public.

**Why this priority**: Necessary for operational monitoring, troubleshooting, and audit logging, but does not block the primary user flow.

**Independent Test**: Request the health endpoint with and without the required security key. Verify that unauthorized requests are rejected and authorized requests return a complete breakdown.

**Acceptance Scenarios**:

1. **Given** a request is made to the health status endpoint without the security key, **When** requested, **Then** the system denies access with an unauthorized error response.
2. **Given** a request is made with the correct security key, **When** requested, **Then** the system returns a status report detailing the current state, active cooldowns, and today's failure counts for all providers in the waterfall order.

---

### Edge Cases

- **Empty Topic Input**: If a request is received with an empty topic, the system rejects it immediately with a validation error, preventing empty calls to backend LLMs.
- **Provider Latency Anomaly**: If a provider is technically responsive but takes more than three times its baseline P50 response time, the system flags it as degraded and deprioritizes it for subsequent requests during the session.
- **Simultaneous Rate Limit Hits**: If multiple isolates hit rate limits simultaneously, reactive 429 detection must capture the error and transition the state immediately to prevent successive errors on that isolate.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain a 6-tier fallback chain of independent text-generation providers.
- **FR-002**: The fallback chain MUST be prioritized based on a combined score of inference speed, token capacity, and concurrency limits.
- **FR-003**: The system MUST detect rate-limit errors (HTTP 429) reactively, parse retry headers (if present), and put the provider in a rate-limited state with a cooling period.
- **FR-004**: The system MUST track requests per minute in memory to proactively skip a provider if it is within 10% of its rate limit.
- **FR-005**: The system MUST detect hard failures (5xx errors or network timeouts) and put the provider in a degraded state with a 15-second backoff.
- **FR-006**: The system MUST track provider latencies and flag a provider as degraded if its actual latency exceeds 3 times its baseline P50 latency.
- **FR-007**: The system MUST sanitize user topic inputs to prevent prompt injection by stripping control characters and rejecting override keywords.
- **FR-008**: The system MUST enforce a maximum topic length of 200 characters.
- **FR-009**: The system MUST log all inference lifecycle events (success, skip, degradation, rate limit, exhaustion) in a machine-readable JSON structure.
- **FR-010**: The system MUST expose a health endpoint showing the state, remaining cooldown, request counts, and failures of all providers.
- **FR-011**: The health endpoint MUST validate a pre-configured security key and reject unauthorized requests.

### Key Entities

- **Inference Request**: Represents the incoming request containing the subject, user topic, and request metadata.
- **Provider Registry**: The structured configuration containing metadata for all 6 tiers, including their baselines, quotas, and model references.
- **Provider Status**: The current runtime state of a provider (`READY`, `RATE_LIMITED`, `COOLING`, `DEGRADED`, `PENDING`) and its metrics.
- **Inference Result**: The successful output of a generation, indicating the text, latency, provider used, and tier number.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System median response latency (P50) is under 800ms under standard operational conditions.
- **SC-002**: System availability (successful generation output delivery) is 99.7% or higher.
- **SC-003**: False waterfall cascades (making calls to rate-limited providers) constitute less than 2% of total requests.
- **SC-004**: 100% of detected prompt injection payloads are blocked or sanitized.
- **SC-005**: 100% of requests to the health status endpoint without the correct key are rejected.

---

## Assumptions

- **Isolate-Level Tracking**: In-memory status tracking operates on an execution isolate basis. Cross-isolate rate-limiting is handled reactively by Mechanism A (reactive 429 detection) if proactive tracking diverges.
- **Free-Tier Limits**: The free-tier configurations, baseline latencies, and fallback priorities are defined at deploy-time and remain stable.
- **Secure Key Storage**: The security key for the health status endpoint is securely stored in the deployment environment and is not accessible to client-side code.
