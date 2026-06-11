# UI Component Contracts: MedPrompt MVP

**Type**: Component API Contracts  
**Branch**: `001-medprompt-mvp`  
**Date**: 2026-06-11

---

## Overview

This document defines the interface contracts for all MedPrompt UI components. These contracts define what each component accepts, what it renders, and what side effects it produces. They are implementation-agnostic — the internal rendering mechanism may change without violating the contract.

---

## SubjectGrid

**Type**: Server Component  
**File**: `src/components/SubjectGrid.tsx`

**Props**:
```typescript
interface SubjectGridProps {
  activeSubject?: SubjectId;  // Pre-highlighted subject (from URL)
}
```

**Responsibilities**:
- Renders all 6 subject tiles in order (sortOrder)
- Applies 2-column layout on mobile, 3-column on desktop
- Passes `activeSubject` down to each SubjectTile for visual state

**Accessibility contract**:
- Root element: `<ul>` with `role="list"`
- No `aria-label` needed (context is obvious from page heading)

---

## SubjectTile

**Type**: Client Component  
**File**: `src/components/SubjectTile.tsx`

**Props**:
```typescript
interface SubjectTileProps {
  subject: Subject;
  isActive?: boolean;         // Pre-selected state (from URL)
}
```

**Responsibilities**:
- Renders subject name + icon in a tappable tile
- On tap/click: pushes URL to `/<subject.id>` and opens TopicInputSheet
- Handles hover/active visual states (scale transform, shadow)

**Accessibility contract**:
- Element: `<button>` (not `<div>`)
- `aria-label`: `"Generate prompt for {subject.label}"`
- `aria-pressed`: `true` when `isActive`, `false` otherwise
- Keyboard: activated by `Enter` or `Space`

**Side effects**:
- `router.push('/<subject.id>')` on activation
- Opens TopicInputSheet via shared state/context

---

## TopicInputSheet

**Type**: Client Component  
**File**: `src/components/TopicInputSheet.tsx`

**Props**:
```typescript
interface TopicInputSheetProps {
  subject: Subject;
  isOpen: boolean;
  onClose: () => void;
}
```

**Responsibilities**:
- Slide-up sheet on mobile, centered modal on desktop
- Contains: heading, single text input (auto-focused), Generate button, Turnstile widget
- On submit: sanitizes input → generates slug → navigates to `/<subject.id>/<slug>`
- On Escape or backdrop tap: calls `onClose()`

**Input validation contract**:
- `maxLength={120}` attribute on input
- Client-side: disable Generate button if input is empty or matches banned patterns
- Server-side: `sanitizeTopic()` runs again on the server component (defense in depth)

**Turnstile contract**:
- `@marsidev/react-turnstile` widget renders in `interaction-only` appearance
- Generate button is disabled until Turnstile token is available
- Token is sent as part of the form submission (included in navigation params or validated server-side)
- On Turnstile failure: button remains disabled; no error shown to user unless persistent

**Accessibility contract**:
- Element: `<dialog>` with `aria-modal="true"` and `aria-labelledby="topic-dialog-heading"`
- Focus trap: active when open; focus returns to triggering tile on close
- `aria-label="Topic name"` on input
- Dismiss: `Escape` key calls `onClose()`

**Side effects**:
- Navigates to `/<subject.id>/<topic-slug>` on valid submit
- Fires no analytics events directly (analytics fired on copy, not generation)

---

## PromptView

**Type**: Server Component (outer); Client Component (CopyButton, Toast)  
**File**: `src/components/PromptView.tsx`

**Props**:
```typescript
interface PromptViewProps {
  prompt: GeneratedPrompt;
}
```

**Responsibilities**:
- Renders the full prompt text in a `<pre>` / scrollable monospace box
- Renders CopyButton and DeepLinkButton
- Shows character count / word count as secondary info

**Accessibility contract**:
- Prompt text: `<pre role="region" aria-label="Generated prompt">` with `tabIndex={0}` for keyboard scrollability
- Character/word counts: `<p aria-live="off">` (static info)

---

## CopyButton

**Type**: Client Component  
**File**: `src/components/CopyButton.tsx`

**Props**:
```typescript
interface CopyButtonProps {
  promptText: string;          // Full prompt content to copy
  subjectId: SubjectId;        // For analytics
  topic: string;               // Topic label for analytics
}
```

**State machine**:
```
'idle' | 'copying' | 'success' | 'manual'
```

**Responsibilities**:
- Primary CTA: triggers 3-level clipboard engine on click
- State `idle`: label "📋 Copy Prompt", enabled
- State `copying`: label "Copying…", disabled (prevents double-tap)
- State `success`: label "✓ Copied!", returns to `idle` after 2000ms
- State `manual`: shows `<textarea>` with full prompt selected; button label "Select All & Copy"

**Side effects**:
- Calls `copyPrompt(text)` from `src/lib/clipboard.ts`
- Fires `trackCopy(subjectId, topic, method)` on success
- Shows Toast notification on success (calls Toast via context/portal)

**Accessibility contract**:
- `role="button"` (it is a `<button>`)
- `aria-live="polite"` on button label region to announce state changes
- `aria-label` changes with state: "Copy prompt to clipboard" / "Prompt copied" / "Select prompt text"

---

## DeepLinkButton

**Type**: Client Component  
**File**: `src/components/DeepLinkButton.tsx`

**Props**:
```typescript
interface DeepLinkButtonProps {
  promptText: string;
  subjectId: SubjectId;
  topic: string;
  target?: 'chatgpt' | 'gemini';  // default: 'chatgpt'
}
```

**Responsibilities**:
- Secondary CTA: "Copy & Open ChatGPT"
- Always copies prompt first (calls same clipboard engine)
- Then attempts deep link via platform-specific URL scheme
- Silently swallows deep link failures

**Deep link precedence**:
1. Copy prompt (always succeeds or falls back gracefully)
2. Detect platform (iOS / Android / desktop)
3. Attempt deep link with 1500ms timeout
4. On timeout or error: no error shown; copy success is the end state

**Side effects**:
- Fires `trackCopy(subjectId, topic, method)` on copy
- Fires `trackDeepLink(target, outcome)` after deep link attempt

---

## Toast

**Type**: Client Component (Portal)  
**File**: `src/components/Toast.tsx`

**Props**:
```typescript
interface ToastProps {
  message: string;
  duration?: number;  // ms, default 2000
}
```

**Responsibilities**:
- Non-blocking notification that appears at bottom of screen
- Auto-dismisses after `duration` ms
- Does not block any interactive elements

**Accessibility contract**:
- `role="status"` with `aria-live="polite"`
- `aria-atomic="true"` — full message is read by screen readers
