# Feature Specification: Socratic Interactive Tutor Prompts

**Feature Branch**: `004-interactive-tutor-prompt`  
**Created**: 2026-06-18
**Status**: Draft  
**Input**: User description: "Integration of the Socratic interactive tutor prompt with multi-variable support (Language, Analogy Domain) and dynamic evaluation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prompt Configuration (Priority: P1)

As a user, I want to select my preferred Language and Analogy Domain before generating a prompt, so that the tutor provides culturally and linguistically relevant explanations.

**Why this priority**: Essential for allowing users to actually interact with the new multi-variable prompt variables without needing to edit the generated text manually.

**Independent Test**: Can be fully tested by verifying that the frontend renders Language and Analogy Domain dropdowns and correctly maps selections to the generated output.

**Acceptance Scenarios**:

1. **Given** I am on the topic page, **When** I open the configuration panel, **Then** I see options to select Language and Analogy Domain.
2. **Given** I selected 'German' and 'Cooking', **When** I click generate, **Then** the resulting prompt includes those explicit variables inside the injected text.

---

### User Story 2 - Interactive Socratic Support Engine (Priority: P1)

As an admin/system, I want the prompt evaluation engine to support multi-variable templates without requiring rigid 3-header standard formats, so that interactive Agentic workflows can be deployed.

**Why this priority**: The backend must stop blocking non-standard prompts (like the Socratic tutor) during template validation, and it needs the parsing logic to replace arbitrary `{{VARIABLES}}`.

**Independent Test**: Can be tested directly via the `/api/generate` route by passing multi-variable JSON payloads to a non-standard template without throwing validation errors.

**Acceptance Scenarios**:

1. **Given** a template without headers or disclaimers, **When** the system evaluates it, **Then** validation succeeds if the template is marked as interactive/agentic.
2. **Given** a payload of multiple variables, **When** the injection runs, **Then** all instances of `{{VARIABLE}}` are replaced accurately.

---

### User Story 3 - Distinct Caching by Variables (Priority: P2)

As a user, I want the prompt generation to seamlessly cache varying combinations so that if I ask for a Spanish prompt after a German one, I don't get the cached German version.

**Why this priority**: Prevents cache poisoning where users receive the wrong permutations of a prompt.

**Independent Test**: Can be tested by generating identical topics with varying languages, ensuring cache misses and hits match the full permutation of inputs.

**Acceptance Scenarios**:

1. **Given** a previously generated 'German' topic, **When** I request the same topic in 'Spanish', **Then** the prompt engine generates a new prompt instead of serving the cached 'German' response.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST dynamically resolve and replace multiple placeholder variables (e.g., `{{LANGUAGE}}`, `{{ANALOGY_DOMAIN}}`, `{{TOPIC}}`) within a template via the `injector.ts`.
- **FR-002**: System MUST relax strict template structural constraints (e.g., 3 headers, disclaimer) in `evaluator.ts` for templates designated as interactive or agentic.
- **FR-003**: System MUST update the database schema (e.g., adding `variables` JSON or `is_interactive` boolean) to store metadata about what variables a template requires.
- **FR-004**: System MUST render dynamic UI inputs (dropdowns or text fields) based on the active template's required variables.
- **FR-005**: System MUST construct cache keys by combining `subjectId`, `topicSlug`, and all additional variables (e.g. `language`, `analogyDomain`) to prevent cross-variable cache conflicts.
- **FR-006**: System MUST pass the selected variable state from the UI via the `/api/generate` endpoint payload into the `PromptEngine`.

### Key Entities

- **Prompt Template**: Needs an added property to denote required variables and/or template type (e.g., standard vs. interactive).
- **Prompt Generation Request**: Extended to accept an arbitrary map of `Record<string, string>` containing user-selected variables.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure at least Language and Analogy Domain before generating the interactive tutor prompt, with 100% of generated prompts reflecting the selections.
- **SC-002**: The injection engine successfully parses and replaces multiple distinct `{{VARIABLES}}` in < 200ms processing time.
- **SC-003**: Multi-variable prompt generation maintains a 0% cache collision rate across different variable permutations for the same topic.

## Assumptions

- Existing prompt injection logic (`injector.ts`) can be safely generalized using Regex without massive performance hits.
- The UI components (dropdowns, inputs) will use standard React states within the `GenerateContainer`.
- Evaluator rules can be conditionally applied or removed safely without breaking existing standard templates.
