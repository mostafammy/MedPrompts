# Quickstart: Resilient Waterfall Inference Engine

This document provides instructions on setting up, configuring, and verifying the waterfall inference engine.

---

## 1. Environment Setup

To run the inference layer, configure the following environment keys. Create or update your `env.local` or environment registry:

```bash
# Tier 1 — Groq
GROQ_API_KEY=gsk_...

# Tier 2 — Cerebras
CEREBRAS_API_KEY=csk_...

# Tier 3 — DeepInfra
DEEPINFRA_TOKEN=...

# Tier 4 — Together AI
TOGETHER_AI_API_KEY=...

# Tier 5 — OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Tier 6 — Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Health Endpoint Security
HEALTH_CHECK_SECRET=your_32_character_hex_secret
```

---

## 2. Configuration for Edge Deployment

If deploying to Cloudflare Workers or Pages, bind the API keys as secrets. Do **not** store them as plain environment variables:

```bash
# Set secrets inside the Cloudflare context
wrangler secret put GROQ_API_KEY
wrangler secret put CEREBRAS_API_KEY
wrangler secret put DEEPINFRA_TOKEN
wrangler secret put TOGETHER_AI_API_KEY
wrangler secret put OPENROUTER_API_KEY
wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
wrangler secret put HEALTH_CHECK_SECRET
```

Ensure `nodejs_compat` is enabled in your `wrangler.toml` or dashboard settings.

---

## 3. Integration Testing & Verification

### 3.1 Verify Prompt Generation Endpoint
Submit a `POST` request to `/api/generate`:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Hypertension","subject":"Cardiology"}'
```

#### Success Verification
- Response status code is `200 OK`.
- Header `X-Provider` exists (e.g., `groq`).
- Header `X-Provider-Tier` is present (e.g., `1`).
- JSON payload contains a non-empty `data` field with generated markdown content.

#### Rate-Limit Cascade Verification
Disable or break API keys for Tiers 1-5, and verify that the response still returns successfully from Tier 6 (Gemini), with headers indicating `X-Provider: google` and `X-Provider-Tier: 6`.

### 3.2 Verify Health Check Endpoint
Submit a `GET` request to `/api/generate`:

#### Public Health Request (No Secret Key)
```bash
curl http://localhost:3000/api/generate
```
- Returns status `200 OK`.
- Returns JSON body `{ "status": "operational", "timestamp": "..." }`.
- Does not expose the `providers` key.

#### Authorized Health Request (With Secret Key)
```bash
curl http://localhost:3000/api/generate \
  -H "x-health-secret: your_32_character_hex_secret"
```
- Returns status `200 OK`.
- JSON body contains `providers` object with complete status snapshot (state, cooldowns, request counts).
