# URL Schema Contract: MedPrompt MVP

**Type**: URL Routing Contract  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## Route Definitions

All routes are defined in the Next.js App Router convention under `src/app/`.

### Route Table

| Pattern | Handler File | Runtime | Description |
|---------|-------------|---------|-------------|
| `/` | `src/app/page.tsx` | Node (static) | Home — subject selection grid |
| `/[subject]` | `src/app/[subject]/page.tsx` | Edge | Subject landing — grid with topic input open |
| `/[subject]/[topic]` | `src/app/[subject]/[topic]/page.tsx` | Edge | Generated prompt view |
| `/api/og` | `src/app/api/og/route.ts` | Edge | Dynamic OG image generation |
| `/api/health` | `src/app/api/health/route.ts` | Edge | Health check endpoint |
| `/offline` | `src/app/offline/page.tsx` | Static | PWA offline fallback |
| `/sitemap.xml` | `src/app/sitemap.ts` | Static | Dynamic sitemap |

---

## URL Parameter Contracts

### `[subject]` segment

- **Type**: `SubjectId` union — one of: `anatomy`, `histology`, `physiology`, `microbiology`, `pathology`, `parasitology`
- **Validation**: Server-side via `isValidSubjectId(params.subject)` on entry
- **Invalid value**: Returns Next.js `notFound()` → 404 page
- **Case sensitivity**: All lowercase; uppercase values redirect to lowercase (or 404)

### `[topic]` segment

- **Type**: URL slug — pattern `/^[a-z0-9][a-z0-9-]*$/`
- **Generation**: `topicToSlug(sanitizedTopic)` — client-side before navigation
- **Max length**: 240 characters (2× the 120-char topic cap, accounting for hyphen expansion)
- **Invalid value**: Page renders with `slugToTopic(slug)` as a best-guess label; does not 404 (graceful degradation — the prompt still generates)
- **Special characters**: Only lowercase a-z, 0-9, and hyphens; any other characters are rejected by slug generation

---

## URL State Transitions

```
User taps subject tile "Pathology"
  → Client pushes URL: /pathology
  → TopicInputSheet opens

User types "Myocardial Infarction", taps Generate
  → Client calls: topicToSlug("Myocardial Infarction") → "myocardial-infarction"
  → Router navigates to: /pathology/myocardial-infarction
  → Server Component renders prompt page
```

---

## SEO / OG Metadata Contract

Every `[subject]/[topic]` route exports `generateMetadata()`:

```typescript
// Contract (not implementation)
generateMetadata({ params: { subject, topic } }): Metadata {
  return {
    title:       `<TopicLabel> — <SubjectLabel> Board Prompt | MedPrompt`,
    description: `High-yield <SubjectLabel> board exam prompt for <TopicLabel>. Copy into ChatGPT or Gemini.`,
    alternates:  { canonical: `https://medprompts.mostafayaser.earth/<subject>/<topic>` },
    openGraph: {
      type:   'article',
      title, description,
      url:    canonical,
      images: [{ url: `/api/og?subject=<subject>&topic=<topic>`, width: 1200, height: 630 }],
    },
    twitter: {
      card:   'summary_large_image',
      title, description,
      images: [`/api/og?subject=<subject>&topic=<topic>`],
    },
  }
}
```

---

## OG Image API Contract

**Endpoint**: `GET /api/og`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subject` | `SubjectId` | No (defaults to 'pathology') | Medical subject |
| `topic` | string (slug) | No (defaults to 'topic') | Topic slug |

**Response**:
- Content-Type: `image/png`
- Dimensions: 1200 × 630 px
- Runtime: Edge (Cloudflare Worker via next/og ImageResponse)
- Caching: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`

**Error behaviour**: Always returns an image (uses defaults if params are invalid) — never 4xx/5xx.

---

## Sitemap Contract

**Endpoint**: `GET /sitemap.xml`

- Lists all `/<subject>/<topic-slug>` URLs from the `topicsSeed` static list
- Includes all 6 subject landing pages `/<subject>`
- `changefreq`: `weekly` for topic pages, `monthly` for subject pages
- `priority`: `1.0` for home, `0.9` for topic pages, `0.7` for subject pages
