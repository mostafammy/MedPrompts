# API Routes Contract: MedPrompt MVP

**Type**: Edge API Route Contracts  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## 1. Health Check Endpoint

**Endpoint**: `GET /api/health`  
**Runtime**: Edge (Cloudflare Workers Node.js compat)

### Purpose
Provides a lightweight endpoint for monitoring uptime and edge availability. It does not perform DB queries in V1.0.

### Request
- No headers or parameters required.

### Response
- **Status**: `200 OK`
- **Content-Type**: `application/json`

**Body**:
```json
{
  "status": "ok",
  "timestamp": "2026-06-11T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 2. Server Actions (Form Submission)

While not traditional API routes, Server Actions act as the RPC endpoints for the MedPrompt form submission.

### Generate Prompt Action

**Function**: `generatePromptAction(formData: FormData)`  
**File**: `src/app/actions.ts`

### Request Payload (`FormData`)
- `topic`: `string` (max 120 chars) - The user's input topic.
- `subject`: `string` - The subject ID (e.g., 'pathology').
- `cf-turnstile-response`: `string` - The Cloudflare Turnstile token from the widget.

### Behavior
1. Validates the Turnstile token against `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
2. Sanitizes the topic input (allowlist characters, length check, injection heuristic blocklist).
3. If successful, returns `success: true`.
4. If Turnstile fails or sanitization rejects the input, returns `success: false` and an error message.

### Response Type
```typescript
type ActionResult = 
  | { success: true; prompt: string }
  | { success: false; error: string };
```

---

## 3. OG Image Generation

**Endpoint**: `GET /api/og`  
*(Detailed in `url-schema.md`)*

### Behavior
Generates a dynamic Open Graph PNG image using `next/og` (Satori). Fonts are loaded via `fetch()` to bypass Cloudflare Workers filesystem limitations.

### Caching
Implements edge caching headers to reduce WASM CPU time on repeat requests:
```http
Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800
```
