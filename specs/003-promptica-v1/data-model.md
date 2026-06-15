# Data Model: Promptica V1

## Entities

### `subjects`
Represents the top-level medical domains (e.g., Pathology, Pharmacology).
- `id` (text, PK): kebab-case identifier (e.g., 'pathology')
- `label` (text): Human-readable label
- `icon` (text): Name of the Lucide icon to use
- `sortOrder` (integer): Sorting priority
- `isActive` (boolean): Whether the subject is publicly accessible

### `prompt_templates`
Versioned text strings associated with a Subject, containing `{{TOPIC}}` placeholders.
- `id` (text, PK): Unique ID (e.g., 'pathology_v3')
- `subjectId` (text, FK -> subjects.id)
- `version` (integer): Version sequence
- `template` (text): The prompt text (100 - 8000 chars)
- `changelog` (text): Context for this version
- `isActive` (boolean): Only one active version per subject
- `createdAt` (timestamp)
- `createdBy` (text)

### `topics_seed`
High-yield medical topics pre-populated to enable autocomplete and static SEO landing pages.
- `id` (text, PK)
- `subjectId` (text, FK -> subjects.id)
- `topic` (text): Raw topic string (e.g., 'Myocardial Infarction')
- `slug` (text): URL-safe slug (e.g., 'myocardial-infarction')
- `isHighYield` (boolean)

### `prompt_events`
Anonymous tracking record for usage analytics.
- `id` (text, PK)
- `subjectId` (text)
- `slug` (text)
- `copyMethod` (text): 'clipboard-api' | 'exec-command' | 'manual'
- `copiedAt` (timestamp)

## Type Safety
- **Zod schemas** dictate parsing and validation for all database schemas and API inputs.
- **Branded Types** ensure primitive string distinctions (e.g., `type Slug = string & { readonly __brand: 'Slug' }`).
