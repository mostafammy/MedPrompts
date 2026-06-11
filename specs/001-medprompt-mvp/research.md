# Technical Research: MedPrompt MVP

**Phase**: Plan Phase 0  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## 1. Next.js Cloudflare Adapter

### Decision: Migrate from `@cloudflare/next-on-pages` to `@opennextjs/cloudflare`
### Rationale:
`@cloudflare/next-on-pages` is considered a legacy adapter for Next.js 15+ and forces the edge runtime for all routes with `output: 'export'`. `@opennextjs/cloudflare` provides full App Router support, uses the Workers Node.js compatibility layer (`nodejs_compat`), and supports Server Actions and standard Next.js building patterns without strict edge limitations.
### Alternatives Considered:
- Keep `@cloudflare/next-on-pages`: Lacks ISR, Node built-ins, and full App router features.
- Vercel Deployment: Ruled out due to PRD constraint for Cloudflare edge deployment.
### Key Findings:
- Requires `wrangler.jsonc` with `nodejs_compat`.
- Removes the need for `export const runtime = 'edge'` in every route.
- Removes `output: 'export'` in `next.config.ts`.
- Build command becomes `npx @opennextjs/cloudflare build`.

---

## 2. Cloudflare Turnstile with React

### Decision: Use `@marsidev/react-turnstile` Client Component with Server Action Verification
### Rationale:
Provides the most robust verification. The widget requires the DOM (Client Component), but the verification must happen server-side using the `siteverify` endpoint so the secret key isn't exposed.
### Alternatives Considered:
- Client-side verification: Insecure.
- API Route: Works identically, but Server Actions are cleaner for App Router forms.
### Key Findings:
- Tokens are single-use and expire in 5 minutes.
- Must call `turnstileRef.current?.reset()` after failed/successful submissions or expiration.

---

## 3. Service Worker & Next.js

### Decision: Use `@serwist/next`
### Rationale:
Provides automated cache generation based on the Next.js build hashes, solving cache-busting issues on deploy. Manually managing `sw.js` is error-prone. `next-pwa` is unmaintained and broken with Turbopack.
### Alternatives Considered:
- Manual `sw.js`: Hard to manage cache versioning.
- `next-pwa`: Outdated.
### Key Findings:
- Intercepts network requests and implements Stale-While-Revalidate for navigations, CacheFirst for static assets.
- Must exclude RSC payloads (`_rsc` params/headers) from the service worker cache.

---

## 4. `next/og` ImageResponse on Cloudflare Workers

### Decision: Use `next/og` with `fetch()` for fonts
### Rationale:
`next/og` works in Cloudflare Workers with `@opennextjs/cloudflare` + `nodejs_compat`, but system fonts aren't available, and `fs.readFileSync` will crash the worker.
### Alternatives Considered:
- `workers-og`: Unofficial alternative, slightly less supported.
- Pre-generate OG images: Not dynamic enough for arbitrary topics.
### Key Findings:
- Must load the font via `fetch()` (e.g., from `public/fonts/` served over CDN) and pass it to the `fonts` array in `ImageResponse`.
- Add `Cache-Control` headers to the route to cache the generated image at the Edge for 24+ hours.

---

## 5. Dynamic OG Metadata in Next.js 15

### Decision: Use `generateMetadata()` with `opengraph-image.tsx` and `og:type = 'article'`
### Rationale:
Official pattern for dynamic metadata in the App Router. `opengraph-image.tsx` automatically registers the `<meta>` tags.
### Alternatives Considered:
- `GET /api/og`: Requires manually setting the OG image URL in `generateMetadata()`.
### Key Findings:
- Next.js 15 makes `params` a **Promise** — it must be awaited in `generateMetadata()`.
- Must configure `metadataBase` in the root layout to avoid relative URL errors in OpenGraph tags.

---

## 6. Deep Linking to ChatGPT/Gemini

### Decision: Copy-first, then attempt deep link with 1000ms timeout and silent fallback
### Rationale:
Official URI schemes are undocumented and unstable. A try/catch doesn't work for intent schemes. Relying on `document.hidden` after a timeout is the most reliable heuristic.
### Alternatives Considered:
- Universal Links / App Links: Requires domain ownership.
### Key Findings:
- iOS ChatGPT: `chatgpt://` or `com.openai.chat://`
- Android ChatGPT: `intent://chatgpt.com#Intent;scheme=https;package=com.openai.chat;end`
- iOS Gemini: `googlegemini://`
- Android Gemini: `intent://gemini.google.com#Intent;scheme=https;package=com.google.android.apps.bard;end`

---

## 7. Analytics

### Decision: Use `next-plausible` package
### Rationale:
Community standard for Plausible in Next.js. Handles typing and script injection properly in App Router.
### Alternatives Considered:
- Raw `window.plausible` calls: Lacks type safety.
### Key Findings:
- Requires `<PlausibleProvider>` in the root layout.
- Use `usePlausible()` in Client Components.

---

## 8. Topic Input Sanitization

### Decision: Client & Server layered sanitization (allowlist + heuristic blocklist)
### Rationale:
MedPrompt V1.0 uses static templates, so there's no live LLM call on the server. Sanitization is meant to protect the rendered UI and the template structure.
### Alternatives Considered:
- LLM-as-judge: Unnecessary overhead for V1.0 since the LLM call happens on the user's end.
### Key Findings:
- Use an allowlist for characters (letters, numbers, hyphens, spaces).
- Strip out curly braces, HTML tags, and common injection patterns (e.g., "ignore all previous").

---

## 9. Turso / Drizzle on Cloudflare Workers

### Decision: Use `@libsql/client/http`
### Rationale:
Cloudflare Workers requires HTTP or WebSocket clients for DB connections, standard TCP connections are not supported natively without special tunneling.
### Alternatives Considered:
- Standard `@libsql/client` (SQLite native): Doesn't work in V8 Isolates.
### Key Findings:
- Provide `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` via Wrangler bindings.

---

## 10. Clipboard API Fallback

### Decision: `navigator.clipboard` → `document.execCommand` → Manual selection textarea
### Rationale:
Ensures copying works across standard browsers, in-app browsers (like Instagram/WeChat), and non-secure contexts.
### Alternatives Considered:
- Just `navigator.clipboard`: Will fail in many in-app browsers.
### Key Findings:
- Secure context is required for `navigator.clipboard`.

---

## 11. Topic Slug Generation

### Decision: Standardize to lowercase and hyphens
### Rationale:
URL safety and SEO best practices.
### Key Findings:
- `topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')` handles standard edge cases.

---

## 12. PWA Manifest

### Decision: Implement `manifest.json` with maskable icons
### Rationale:
Provides "Add to Home Screen" support with native feel.
### Key Findings:
- Set `purpose: "any maskable"` for icons to ensure they fit correctly inside Android adaptive icons.
