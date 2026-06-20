# Brand Logo Integration

## Objective
Replace the inline Stethoscope + "MedPrompts" brand header on the homepage with a custom SVG logo (code brackets + merged medical cross + stethoscope) and "Promptica" text, linked to `/`.

## Design (Approved)
- **Logo SVG**: Code angle brackets `< >` framing a merged medical cross + stethoscope symbol. The cross arms extend from a central circular chestpiece; the stethoscope tubing drops below and splits into a Y with earpieces. Terminal underscore `_` accent at the bottom right.
- **Text**: "Promptica" replacing "MedPrompts", with the same gradient styling.
- **Behavior**: Wrapped in `<a href="/">` — clicking returns to homepage.
- **Scope**: Homepage only. The Promptica detail page is unchanged.

## Files
| File | Change |
|------|--------|
| `src/components/MedPromptsLogo.tsx` | **Create** — reusable SVG component (merged cross + stethoscope) |
| `src/app/page.tsx` | **Edit** — replace brand header `<header>` with new logo + "Promptica" text inside `<a href="/">` |

## Non-Goals
- No changes to layout, metadata, PWA manifest, OG images, or page-level styling.
- No navbar or global header — this is a homepage-only replacement.
