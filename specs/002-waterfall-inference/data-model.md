# Data Model: Resilient Waterfall Inference Engine

This document defines the key entities, states, validation rules, and state transitions of the waterfall inference engine.

---

## 1. Data Structures

### 1.1 ProviderConfig
The static definition of a text-generation provider's limits and metadata.

| Field | Type | Description |
|---|---|---|
| `name` | `ProviderName` | Unique identifier (e.g., `groq`, `cerebras`). |
| `displayName` | `string` | Human-readable label (e.g., `Groq (LPU)`). |
| `rpm` | `number` | Requests Per Minute limit on the free tier. |
| `tpd` | `number` | Tokens Per Day limit (0 if unknown/unlimited). |
| `p50LatencyMs` | `number` | Expected median response latency. |
| `defaultCooldownMs` | `number` | Default wait time (ms) after hitting a rate limit. |
| `createModel` | `function` | Factory function returning the Vercel AI SDK `LanguageModel`. |

---

### 1.2 ProviderStatus
The dynamic in-memory status of a provider.

| Field | Type | Description |
|---|---|---|
| `state` | `ProviderState` | Current availability state. |
| `cooldownUntil` | `number` | Unix timestamp (ms) indicating when cooldown ends. |
| `requestsThisMinute` | `number` | Rolling counter of requests sent in the current minute window. |
| `lastResetAt` | `number` | Unix timestamp (ms) of the start of the current minute window. |
| `totalRequestsToday` | `number` | Accumulated count of requests sent today. |
| `totalFailures` | `number` | Accumulated count of failures recorded today. |

---

### 1.3 InferenceResult / InferenceError (Tagged Union)
The discriminated output of a waterfall execution attempt.

#### Success Case
- `success`: `true`
- `provider`: `ProviderName`
- `text`: `string` (the generated prompt output)
- `latencyMs`: `number`
- `tier`: `number` (1-6)

#### Error Case
- `success`: `false`
- `error`: `string` (user-friendly message)
- `exhaustedProviders`: `ProviderName[]` (list of providers attempted)

---

## 2. State Machine: ProviderState Transitions

A provider exists in one of five states: `READY`, `PENDING`, `RATE_LIMITED`, `COOLING`, or `DEGRADED`.

```
┌──────────┐   Request Sent    ┌───────────┐   Response Received   ┌──────────┐
│  READY   ├──────────────────►│  PENDING  ├──────────────────────►│  READY   │
└────▲─────┘                   └─────┬─────┘                       └──────────┘
     │                               │
     │ Cooldown Expired              ├────────────────► 429 Throttle / Quota
     │                               │                  ▼
     │                         ┌─────▼──────┐   Apply Cool-down TTL
     │                         │RATE_LIMITED│
     │                         └─────┬──────┘
     │                               │
     │                               ▼ (End of Cooldown TTL)
     │                          ┌─────────┐
     └──────────────────────────┤ COOLING │ (Silently bypassed until next minute window)
                                └─────────┘
     │                               ▲
     │ Cooldown Expired              │ 5xx / Network Error
     └───────────────────────────────┴── [DEGRADED] (Apply 15s Cooldown TTL)
```

### Transition Matrix

| Initial State | Event / Input | Next State | Action / Side-Effect |
|---|---|---|---|
| `READY` | Pre-flight request check | `PENDING` | Bypasses if in memory limits exceed RPM thresholds. |
| `PENDING` | Request success | `READY` | Increments `requestsThisMinute`, reset state to `READY`. |
| `PENDING` | HTTP 429 response | `RATE_LIMITED` | Cooldown set to `Retry-After` header or configuration default. |
| `PENDING` | HTTP 5xx / Timeout / Network Error | `DEGRADED` | Enforces a `15-second` cooldown window before resetting to `READY`. |
| `RATE_LIMITED` | Cooldown expired | `COOLING` | Provider transitions to `COOLING` until the current minute window resets. |
| `COOLING` / `DEGRADED` | Minute window resets / TTL ends | `READY` | Resets `requestsThisMinute` and `state` to `READY`. |
