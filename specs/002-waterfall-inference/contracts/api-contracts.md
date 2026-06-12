# API Endpoints Contract: Resilient Waterfall Inference Engine

This document defines the HTTP endpoints exposed by the Edge route handler.

---

## 1. POST `/api/generate`

Executes the sanitized medical prompt generation workflow using the 6-tier fallback waterfall.

### 1.1 Request Payload
- **Content-Type**: `application/json`
- **Body Schema**:
```json
{
  "topic": "string (1-200 chars, non-empty after sanitization)",
  "subject": "string (non-empty subject name)"
}
```

### 1.2 Response Headers (Success)
- **`X-Provider`**: The name of the provider that successfully resolved the prompt (e.g., `groq`).
- **`X-Provider-Tier`**: The tier index (1-6) of the successful provider.
- **`X-Latency-Ms`**: The total elapsed execution time for the successful request in milliseconds.
- **`Cache-Control`**: `no-store`

### 1.3 Response Schema (Success - HTTP 200)
```json
{
  "data": "string (generated markdown prompt text)"
}
```

### 1.4 Response Schema (Rate Limited / Exhausted - HTTP 429)
Returned when all 6 providers fail, are cooling, or are degraded.
```json
{
  "error": "Service temporarily overloaded. Please try again in 60 seconds.",
  "exhaustedProviders": ["groq", "cerebras", "deepinfra", "togetherai", "openrouter", "google"]
}
```

### 1.5 Response Schema (Validation Error - HTTP 400)
Returned when input is malformed, missing, or fails sanitization checks.
```json
{
  "error": "Request must include non-empty `topic` and `subject` fields."
}
```

---

## 2. GET `/api/generate`

Exposes the operational health status of the waterfall.

### 2.1 Request Headers
- **`x-health-secret`** (Optional): A shared secret string matching the environment configuration.

### 2.2 Response Schema (Public/Unauthorized - HTTP 200)
Returned when the `x-health-secret` header is missing or incorrect. Prevents scraping cooldown times.
```json
{
  "status": "operational | degraded",
  "timestamp": "ISO-8601 string"
}
```

### 2.3 Response Schema (Internal/Authorized - HTTP 200)
Returned when the `x-health-secret` header is present and valid. Provides full observability.
```json
{
  "status": "operational | degraded",
  "timestamp": "ISO-8601 string",
  "providers": {
    "groq": {
      "state": "READY | RATE_LIMITED | COOLING | DEGRADED | PENDING",
      "cooldownUntil": 0,
      "requestsThisMinute": 0,
      "lastResetAt": 1749735000000,
      "totalRequestsToday": 0,
      "totalFailures": 0
    },
    "...": {}
  }
}
```
