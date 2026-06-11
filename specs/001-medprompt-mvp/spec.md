# Feature Specification: MedPrompt MVP

**Feature Branch**: `001-medprompt-mvp`  
**Created**: 2026-06-11  
**Status**: Draft  
**Input**: User description: "MedPrompt — Mobile-first PWA prompt clipboard utility for medical students. Houses a library of engineered Master Prompts (one per medical discipline) and injects a user-supplied topic into the correct template in under 3 taps. The user copies the result and pastes it into ChatGPT, Gemini, or any LLM. Full Cloudflare edge deployment."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate & Copy a Board-Exam Prompt (Priority: P1)

A medical student opens MedPrompt, selects a subject (e.g., Pathology), types a topic (e.g., "Myocardial Infarction"), presses Generate, and taps "Copy Prompt". The fully structured, board-exam-ready prompt is now on their clipboard, ready to paste into ChatGPT or Gemini.

**Why this priority**: This is the *entire* value proposition of the product. All other features exist to support or enhance this flow. Without it there is no product.

**Independent Test**: Can be fully tested by opening the app on any device, completing the 3-tap flow (Select Subject → Enter Topic → Copy), verifying clipboard contents match the expected master prompt with the topic injected, and delivering a study-ready prompt.

**Acceptance Scenarios**:

1. **Given** a student is on the subject grid, **When** they tap "Pathology" and type "Myocardial Infarction" and press Generate, **Then** they are shown the Pathology master prompt with `{{TOPIC}}` replaced by "Myocardial Infarction" and a prominent "Copy Prompt" button.
2. **Given** the generated prompt is displayed, **When** the student taps "Copy Prompt", **Then** the clipboard is populated with the full prompt text and a success confirmation ("✓ Copied!") is shown for 2 seconds.
3. **Given** the student is on any device/browser, **When** they complete the copy action, **Then** the system uses the best available clipboard method (modern API → execCommand fallback → manual selection) without displaying an error.
4. **Given** a student types more than 120 characters as a topic, **When** they submit, **Then** the input is silently truncated to 120 characters before injection.

---

### User Story 2 - Subject Selection Grid (Priority: P1)

A student launches MedPrompt and sees a full-screen grid of all 6 medical subjects. They instantly recognise the subject they need and tap it to begin.

**Why this priority**: The subject grid is the entry point to the entire workflow. Without a clear, functional subject selector, the core flow cannot begin.

**Independent Test**: Can be fully tested by loading the home page, verifying 6 subject tiles are displayed (Anatomy, Histology, Physiology, Microbiology, Pathology, Parasitology), confirming tap/click on each tile opens the topic input sheet, and verifying the URL updates accordingly (e.g., `/pathology`).

**Acceptance Scenarios**:

1. **Given** a student opens the app on mobile, **When** the home page loads, **Then** a 2-column grid of 6 subject tiles is displayed, each with a label and icon, with no page load or navigation needed.
2. **Given** a student opens the app on desktop, **When** the home page loads, **Then** a 3-column grid of 6 subject tiles is displayed.
3. **Given** the student taps any subject tile, **When** the tap is registered, **Then** the topic input sheet slides up (mobile) or appears as a centered modal (desktop) immediately, and the URL updates to `/<subject>`.
4. **Given** the student uses keyboard navigation, **When** they Tab to a tile and press Enter or Space, **Then** the topic input sheet opens, maintaining accessibility.

---

### User Story 3 - Shareable URL Opens Pre-Filled Prompt (Priority: P2)

A student shares a URL like `/pathology/myocardial-infarction` in their WhatsApp study group. When a classmate opens it, they land directly on the fully generated prompt page — no taps required.

**Why this priority**: Shareable URLs are the viral growth mechanism. Each shared link is a zero-cost acquisition channel. The URL must resolve server-side so OG metadata renders correctly in messaging apps.

**Independent Test**: Can be tested by directly visiting `/pathology/myocardial-infarction` in a browser, verifying the prompt is displayed immediately, the page title and OG image are correct, and the copy button is available without any additional navigation.

**Acceptance Scenarios**:

1. **Given** a student navigates directly to `/anatomy/brachial-plexus`, **When** the page loads, **Then** the generated Anatomy prompt for "Brachial Plexus" is shown without requiring any subject/topic selection steps.
2. **Given** a shared URL is previewed in WhatsApp or Telegram, **When** the link is pasted, **Then** a rich preview card appears with the correct subject, topic title, and a branded OG image.
3. **Given** a student visits a valid shareable URL, **When** they tap "Copy Prompt", **Then** the clipboard is populated exactly as if they had navigated via the subject grid.

---

### User Story 4 - PWA Install & Offline Access (Priority: P2)

A student installs MedPrompt on their phone home screen. The next day, in a subway with no signal, they open the app and can still access previously-visited prompt pages without an internet connection.

**Why this priority**: PWA installation places the app adjacent to LLM apps on the home screen, reducing the switching cost to zero. Offline capability is mandatory for exam-season use where connectivity is unreliable.

**Independent Test**: Can be tested by visiting the app on iOS Safari and Android Chrome, using "Add to Home Screen", opening the installed app, visiting at least one prompt page while online, then going offline and revisiting the same page — verifying content loads from cache.

**Acceptance Scenarios**:

1. **Given** a student visits MedPrompt on iOS Safari or Android Chrome, **When** they use "Add to Home Screen", **Then** the app installs and opens in standalone mode (no browser chrome).
2. **Given** the student has previously visited `/pathology/myocardial-infarction` while online, **When** they visit the same URL offline, **Then** the page loads from cache with the full prompt available.
3. **Given** the student is offline and visits a page they have never visited before, **When** the page fails to load, **Then** they are shown a friendly offline fallback page.

---

### User Story 5 - Deep Link to LLM App (Priority: P3)

After copying a prompt, a student taps "Copy & Open ChatGPT". The app copies the prompt and attempts to launch the ChatGPT native app. If the app is not installed, the copy still succeeds silently.

**Why this priority**: Deep linking reduces friction further (saving one manual step of app-switching), but is progressive enhancement — the product is fully functional without it.

**Independent Test**: Can be tested by tapping "Copy & Open ChatGPT" on an iOS and Android device with ChatGPT installed (verifying launch) and without ChatGPT installed (verifying copy succeeds and no error is shown).

**Acceptance Scenarios**:

1. **Given** the student taps "Copy & Open ChatGPT" with ChatGPT installed, **When** the button is pressed, **Then** the clipboard is populated AND the ChatGPT app launches.
2. **Given** the student taps "Copy & Open ChatGPT" but ChatGPT is not installed, **When** the button is pressed, **Then** the clipboard is populated and no error is shown to the user (silent fallback).
3. **Given** the copy action fails at all levels, **When** Level 3 (manual) is reached, **Then** a selectable textarea appears with the full prompt text highlighted, allowing the student to manually copy.

---

### Edge Cases

- What happens when the topic field is submitted empty? → The Generate button is disabled or validation prevents submission; a hint is shown asking the student to enter a topic.
- What happens when the topic contains prompt injection patterns (e.g., "ignore previous instructions")? → The input is rejected silently; the generate action does not proceed and the field is cleared with a generic error ("Invalid topic — please use a medical topic name").
- What happens when the topic contains special characters (`<`, `>`, `{`, `}`, brackets)? → Characters are stripped during sanitisation; the cleaned version is used for injection and slug generation.
- What happens when a URL is visited with an unrecognised subject slug (e.g., `/chemistry/adenosine`)? → The page returns a 404-equivalent with a link back to the home grid.
- What happens when the clipboard API is unavailable (e.g., HTTP context, restrictive in-app browser)? → The system falls through to execCommand, then to manual textarea selection — the copy action never displays an error.
- What happens when the Turnstile challenge blocks submission? → The Generate button remains disabled until the challenge resolves; an invisible challenge is shown only to flagged sessions.
- What happens when the database is unreachable? → The app falls back to hardcoded prompt templates (V1.0 behaviour); an error page is shown only if both the network and cache fail.
- What happens when a student types a topic in a non-English language (e.g., Arabic)? → The topic is injected as-is after sanitisation; non-ASCII characters are permitted up to the 120-character cap.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a full-screen grid of exactly 6 subject tiles (Anatomy, Histology, Physiology, Microbiology, Pathology, Parasitology) on the home screen.
- **FR-002**: Each subject tile MUST display the subject name and a relevant icon; tapping/clicking a tile MUST open the topic input sheet and update the URL to `/<subject>`.
- **FR-003**: The topic input sheet MUST contain a single auto-focused text field and a Generate button; the field MUST accept free-text input up to 120 characters.
- **FR-004**: The system MUST sanitise topic input by stripping injection patterns, special characters (`<>{}[]`), and newlines before any processing.
- **FR-005**: On topic submission, the system MUST inject the sanitised topic into the appropriate master prompt template by replacing the `{{TOPIC}}` placeholder.
- **FR-006**: The system MUST navigate to (or render at) the URL `/<subject>/<topic-slug>` upon topic submission, where the topic slug is a URL-safe lowercase representation of the topic.
- **FR-007**: The generated prompt page MUST display the full prompt text in a scrollable preview area and a prominently placed "Copy Prompt" button.
- **FR-008**: The copy action MUST attempt clipboard population using (in order): the modern Clipboard API, the execCommand fallback, and a manual-selection textarea; it MUST NOT show an error to the user under any of these conditions.
- **FR-009**: After a successful copy, the Copy button MUST display a "✓ Copied!" confirmation for 2 seconds before returning to its default label.
- **FR-010**: The system MUST generate and serve Open Graph metadata (title, description, OG image) for every `/<subject>/<topic-slug>` URL to enable rich link previews in messaging apps.
- **FR-011**: The system MUST include a branded OG image (1200×630) generated dynamically for each subject/topic combination.
- **FR-012**: A "Copy & Open ChatGPT" button MUST be available as progressive enhancement; it MUST always copy the prompt first and only attempt the deep link after, never blocking copy on deep-link success.
- **FR-013**: Deep-link launch MUST silently fail (no error shown) if the target LLM app is not installed on the user's device.
- **FR-014**: The system MUST enforce bot protection on the prompt generation endpoint; this protection MUST be invisible to human users (no visible CAPTCHA under normal conditions).
- **FR-015**: The system MUST track the following analytics events without cookies or personally identifiable information: prompt copied (subject, topic, copy method), deep link attempted (target, outcome), shared URL visited (subject, topic).
- **FR-016**: The system MUST provide a PWA manifest enabling home-screen installation on iOS and Android.
- **FR-017**: A service worker MUST cache static assets and previously-visited prompt pages for offline access.
- **FR-018**: The system MUST serve an offline fallback page when a requested page is unavailable and the network is unreachable.
- **FR-019**: All interactive elements MUST be keyboard-navigable and meet WCAG 2.1 Level AA colour contrast requirements.
- **FR-020**: All 6 master prompt templates MUST be reviewed and approved by a qualified medical educator before the V1.0 launch.
- **FR-021**: The master prompt template MUST instruct the LLM to flag uncertainty with "⚠️ Verify this point" rather than guessing.
- **FR-022**: The system MUST support both light and dark colour modes using the project's defined design token system.

### Key Entities

- **Subject**: A medical discipline (e.g., Pathology). Has an ID, display label, icon reference, and sort order. Fixed set of 6 in V1.0.
- **Master Prompt Template**: The engineered prompt associated with a Subject. Contains the `{{TOPIC}}` placeholder. Has a version number and active/inactive state. One active template per subject at any time.
- **Topic**: A free-text medical concept entered by the user (e.g., "Myocardial Infarction"). Slugified for URLs. Maximum 120 characters after sanitisation.
- **Generated Prompt**: The result of injecting a Topic into a Master Prompt Template. Ephemeral — computed on demand; not stored persistently in V1.0.
- **Shareable URL**: The canonical URL `/<subject>/<topic-slug>` that encodes the full application state and serves as the basis for OG metadata and viral sharing.
- **Analytics Event**: A privacy-first event record (subject, topic, copy method, timestamp) sent to the analytics service without cookies or PII.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student can complete the full workflow — from opening the app to having a formatted prompt on their clipboard — in **3 or fewer interactions** (taps/clicks) on any device.
- **SC-002**: The prompt generation and copy flow completes in **under 1 second** on a mid-range mobile device on a 4G connection, as perceived by the user.
- **SC-003**: The app loads within **2 seconds** on a global mobile connection (measured at edge nodes in Egypt, India, and Southeast Asia).
- **SC-004**: The copy action succeeds on **100% of tested device/browser combinations** including iOS Safari, Android Chrome, Desktop Chrome, Firefox, and Safari, including common in-app browsers (Instagram, WhatsApp).
- **SC-005**: A shared URL (`/<subject>/<topic-slug>`) renders a correct rich-preview card (title, description, OG image) in **WhatsApp, Telegram, and iMessage**.
- **SC-006**: All 6 subject prompts are approved by a qualified medical educator, confirmed by signed-off review records.
- **SC-007**: The PWA passes "Add to Home Screen" on both **iOS Safari** and **Android Chrome**, opening in standalone mode without browser chrome.
- **SC-008**: Previously-visited prompt pages load correctly when the device is **fully offline**.
- **SC-009**: Zero critical or serious accessibility violations are detected by automated tooling across all core screens.
- **SC-010**: Analytics events (prompt copied, deep link attempted, shared URL visited) are recorded in the analytics dashboard within **5 minutes** of occurring.

---

## Assumptions

- Users already have a ChatGPT, Gemini, or equivalent LLM app or web session open; MedPrompt does not need to manage LLM sessions or API keys.
- The primary user base consists of medical students in markets where mobile usage dominates (Egypt, India, Southeast Asia); mobile-first design is the baseline, desktop is secondary.
- All 6 master prompt templates will be available and educator-validated at V1.0 launch; hardcoded templates are acceptable for V1.0 (database migration is V1.2 scope).
- Plausible Analytics is sufficient for all V1.0 analytics needs; no cookie consent banner is required.
- Deep-link URL schemes for ChatGPT and Gemini are treated as best-effort progressive enhancement; breakage due to app updates is an accepted risk.
- The topic autocomplete feature from a curated seed list is out of scope for V1.0 and deferred to V1.2.
- The admin panel for non-developer prompt editing is out of scope for V1.0 and deferred to V1.2.
- In-app LLM execution (V2.0) is out of scope for this specification.
- Prompt template data will be bundled with the application code at V1.0 (no live database reads required for core prompt generation).
- The Cloudflare Turnstile invisible challenge is sufficient bot protection for V1.0; additional rate-limiting is a secondary safeguard.
- Medical content accuracy is the responsibility of the designated educator reviewer; the engineering team is not responsible for clinical correctness of prompt output.
- PWA icon assets (all sizes, maskable variants) will be produced by the design/content team and are not generated programmatically.
