# Quickstart: MedPrompt MVP

**Phase**: Plan Phase 1  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## Environment Setup

### Prerequisites
- Node.js 20+
- `pnpm` (latest)
- Wrangler CLI installed globally (`pnpm add -g wrangler`)
- Cloudflare account for Turnstile and Pages/Workers deployment

### Installation
1. Clone the repository and checkout the `001-medprompt-mvp` branch.
2. Run `pnpm install`.
3. Rename `.env.example` to `.env.local` and add your Turnstile keys:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
   ```
   *(Note: The `1x...` keys are Cloudflare's official dummy keys that always pass verification, useful for local dev without a real domain.)*

### Local Development
MedPrompt uses `@opennextjs/cloudflare` to run the Next.js app on the Cloudflare Workers runtime locally.

```bash
pnpm run dev
```

*(This command uses `npx @opennextjs/cloudflare dev` under the hood to simulate the edge environment).*

---

## Testing

- **Linting**: `pnpm run lint`
- **Accessibility**: Run axe-core CLI or Chrome Lighthouse against `http://localhost:3000`.
- **Clipboard**: Test on both HTTP (fails to manual fallback) and HTTPS (uses `navigator.clipboard`).

---

## Deployment

Deploying to Cloudflare Workers requires the OpenNext build process.

1. Build the application:
   ```bash
   pnpm run build
   ```
2. Deploy via Wrangler:
   ```bash
   wrangler deploy
   ```

Make sure the production Turnstile keys are set in the Cloudflare dashboard under the project's Settings > Variables and Secrets.
