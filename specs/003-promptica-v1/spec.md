# Feature Specification: Promptica V1 Core

**Feature Branch**: `003-promptica-v1`  
**Created**: 2026-06-14  
**Status**: Draft  
**Input**: User description: "Imagine You are a Principal FUll Stack SWE at Google and Start the Spec of Promptica V1 @[MedPrompt_Engineering_Playbook.md] Using Production Grade Best Practices, SOLID Princples Ensuring Scalability, Maintainability, Perormance"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find and Generate Subject Prompt (Priority: P1)

As a medical student studying for an exam, I want to select a subject and enter a specific topic (e.g., Pathology -> Myocardial Infarction), so that I can get a perfectly formatted prompt to paste into my preferred LLM.

**Why this priority**: This is the core loop of the application and the primary reason users will visit the app. It must work flawlessly across all devices.

**Independent Test**: Can be fully tested by selecting a subject, entering a known topic, and verifying that the output prompt contains the topic correctly injected into the subject's prompt template.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** I click "Pathology" and enter "Myocardial Infarction" into the topic input sheet, **Then** I am presented with the full prompt for "Myocardial Infarction" and a "Copy to Clipboard" button.
2. **Given** I am viewing a generated prompt, **When** I click "Copy to Clipboard", **Then** the prompt text is saved to my device's clipboard and I see a success indication.

---

### User Story 2 - Share Specific Topic Prompt (Priority: P2)

As a medical student, I want to share a direct link to a specific subject and topic combination (e.g., `/pathology/myocardial-infarction`) with a classmate, so they can immediately generate the prompt without navigating the menus.

**Why this priority**: Viral growth and ease of sharing are essential for product adoption among study groups.

**Independent Test**: Can be tested by navigating directly to a deep link and verifying the pre-filled prompt is generated instantly using edge caching.

**Acceptance Scenarios**:

1. **Given** I receive a URL like `/pathology/myocardial-infarction`, **When** I navigate to it, **Then** the page loads instantly (<50ms) with the topic already injected into the prompt template.
2. **Given** I enter a topic with complex casing or symbols (e.g. "type-2 diabetes!"), **When** I generate the prompt, **Then** the URL updates to a clean slug (`/endocrinology/type-2-diabetes`).

---

### Edge Cases

- What happens when a user's browser blocks the modern Clipboard API? (Fallback to `execCommand` or manual copy).
- How does system handle offensive, injection-attempt, or exceptionally long topic strings?
- What happens when the database is temporarily unreachable during a cache miss?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a grid or list of available medical subjects fetched from the data layer.
- **FR-002**: System MUST render a prompt template by cleanly injecting the user-provided topic string.
- **FR-003**: System MUST provide a multi-level clipboard copy mechanism (Clipboard API -> execCommand -> Manual Selection) to ensure cross-device compatibility.
- **FR-004**: System MUST slugify topics to create clean, URL-safe routes that map deterministically to the rendered prompt.
- **FR-005**: System MUST sanitize user inputs to limit input size before rendering and prevent layout breaking.
- **FR-006**: System MUST serve requests with high performance, aggressively caching generated responses.
- **FR-007**: System MUST record basic usage analytics without collecting Personally Identifiable Information (PII).

### Key Entities

- **Subject**: Represents a high-level medical domain (e.g., Pathology, Pharmacology), containing an ID, label, icon, and sort order.
- **Prompt Template**: Versioned text strings associated with a Subject, containing `{{TOPIC}}` placeholders for rendering.
- **Topic Seed**: High-yield medical topics pre-populated to enable autocomplete and static SEO landing pages.
- **Prompt Event**: Anonymous tracking record for analytics, recording the subject, topic slug, copy method, and device class.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: P95 Page Load Time is under 100ms globally.
- **SC-002**: Prompt generation and variable injection takes under 5ms on the client.
- **SC-003**: 99% of "Copy to Clipboard" actions succeed across desktop, iOS, and Android platforms.
- **SC-004**: Application achieves a 100/100 Lighthouse score for Performance, Accessibility, and Best Practices.

## Assumptions

- Users have basic familiarity with pasting text into an LLM (ChatGPT, Claude, Gemini).
- V1.0 requires zero LLM API integration; all prompt rendering is deterministic string transformation.
- The hosting architecture provides low-latency edge caching and edge compute.
- Analytics will be collected via privacy-first tools, avoiding heavy third-party SDKs or cookie banners.
