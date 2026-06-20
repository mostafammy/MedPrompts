# Data Model: Semantic Prompt Versioning

## Entity Relationship Diagram

```
subjects (1) ────── (N) prompt_templates (1) ────── (N) template_versions
                              │
                              │ (isActive=true = current active version)
                              ▼
                         prompt_cache
                         (transient, no FK)
```

## Entities

### prompt_templates (Extended)

Current table (schema.ts) with new columns added:

| Column | Type | Existing/New | Constraint | Description |
|--------|------|-------------|------------|-------------|
| id | text PK | Existing | UUIDv7 | Unique identifier |
| subject_id | text FK | Existing | NOT NULL → subjects.id | Parent subject |
| template | text | Existing | NOT NULL | Full prompt template text |
| version | integer | Existing | | Deprecated — kept for backward compat during migration |
| is_active | integer (boolean) | Existing | DEFAULT false | Only one true per subject |
| changelog | text | Existing | nullable | Structured JSON changelog |
| created_at | integer (timestamp) | Existing | NOT NULL | Record creation time |
| is_interactive | integer (boolean) | Existing | DEFAULT false | Interactive tutor format flag |
| required_variables | text (json) | Existing | DEFAULT [] | TemplateVariableDefinition[] |
| **semver** | **text** | **NEW** | **NOT NULL** | **Full semver string e.g. "2.1.3"** |
| **version_major** | **integer** | **NEW** | **NOT NULL** | **Parsed major component** |
| **version_minor** | **integer** | **NEW** | **NOT NULL** | **Parsed minor component** |
| **version_patch** | **integer** | **NEW** | **NOT NULL** | **Parsed patch component** |
| **checksum** | **text** | **NEW** | **NOT NULL** | **SHA-256 hex digest of template text** |

**Indexes:**
- `active_subject_idx` on `(subject_id, is_active)` — existing
- `semver_lookup_idx` on `(subject_id, version_major, version_minor)` — NEW, for version-scoped cache invalidation queries
- `checksum_idx` on `(subject_id, checksum)` — NEW, for identity detection

**Validation Rules (application-level):**
- `semver` must match `/^\d+\.\d+\.\d+$/` with each component < 100000
- `version_major === semver.major`, `version_minor === semver.minor`, `version_patch === semver.patch`
- `checksum === SHA-256(template)`
- `changelog` when present must be valid structured changelog JSON

**State Transitions:**
```
[isActive=false] ──activate()──> [isActive=true]
[isActive=true]  ──activate(other)──> [isActive=false]
[isActive=true]  ──rollback()──> [isActive=false] (after restore)
```

---

### template_versions (New Table)

Append-only journal of every version activation.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | text PK | UUIDv7 | Unique identifier |
| template_id | text FK | NOT NULL → prompt_templates.id | Reference to the template record |
| semver | text | NOT NULL | The version that was activated |
| template | text | NOT NULL | Full template text at activation time |
| checksum | text | NOT NULL | SHA-256 of template text |
| changelog | text | nullable | Structured changelog for this activation |
| parent_semver | text | nullable | Version that was active before this one |
| activated_by | text | NOT NULL | Operator identifier from authenticated session (answers "who activated what") |
| activated_at | integer (timestamp) | NOT NULL | When activation occurred |
| deactivated_at | integer (timestamp) | nullable | When superseded (null if current) |

**Indexes:**
- `version_history_subject_idx` on `(template_id, activated_at DESC)` — for history queries
- `version_parent_lookup_idx` on `(template_id, parent_semver)` — for rollback chain traversal

**Validation Rules:**
- Insert-only — no UPDATE or DELETE permitted by application logic
- `parent_semver` must reference an existing version in the same template_id chain
- `deactivated_at` is set to current timestamp when a new version is activated
- The row with `deactivated_at IS NULL` is the current active version for that template_id

**State Transitions:**
```
[activated] ──new_activation──> [deactivated + new activated row]
[activated] ──rollback──> [deactivated + restored version becomes activated]
```

---

### prompt_cache (Transient, No Persistent Schema)

The cache is managed entirely through the `PromptCache` interface with Cloudflare KV as the production implementation. There is no database table for cached prompts — they exist only in KV with TTL-based expiry.

**Cache Key Format:**
```
prompt:{subjectId}:{topicSlug}-v{major}.{minor}.{patch}-{sha256hash16}
```

**Example:** `prompt:pathology:myocardial-infarction-v2.1.3-a1b2c3d4e5f67890`

**Key segments:**
| Segment | Source | Description |
|---------|--------|-------------|
| `prompt:` | Literal prefix | Namespace for all prompt cache entries |
| `{subjectId}` | Subject ID | e.g., "pathology", "anatomy" |
| `{topicSlug}` | Slugified topic | e.g., "myocardial-infarction" |
| `-v{major}.{minor}.{patch}` | SemVer | e.g., "-v2.1.3" — enables version-scoped prefix deletion |
| `-{hash16}` | SHA-256(variables) | Deterministic hash of canonicalized variable JSON |

**KV Operations:**
| Operation | KV Method | Prefix Used |
|-----------|-----------|-------------|
| get | `KV.get(key)` | Full key |
| set | `KV.put(key, value, {expirationTtl})` | Full key |
| deleteVersion | `KV.list({prefix: "prompt:{id}:*-v2.1."})` then delete each | `prompt:{subjectId}:` + contains version segment |
| deleteSubject | `KV.list({prefix: "prompt:{subjectId}:"})` then delete each | `prompt:{subjectId}:` |

---

## Type Definitions (TypeScript)

```typescript
// src/lib/prompts/semver.ts
class SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  
  private constructor(major: number, minor: number, patch: number);
  
  static parse(s: string): Result<SemVer, ValidationError>;
  static unsafeParse(major: number, minor: number, patch: number): SemVer;
  
  toString(): string;          // "1.0.0"
  bump(type: 'major' | 'minor' | 'patch'): SemVer;
  bumpType(other: SemVer): 'major' | 'minor' | 'patch' | 'none';
  equals(other: SemVer): boolean;
}

// In GenerateRequest (src/lib/prompts/generator.ts)
// Change: templateVersion: number → templateSemver: string

// In buildPromptCacheSlug (src/lib/prompts/cache-key.ts)
// Change: templateVersion: number → semver: SemVer

// PromptCache interface extension
interface PromptCache {
  get(subjectId: SubjectId, slug: Slug): Promise<string | null>;
  set(subjectId: SubjectId, slug: Slug, prompt: string, ttlSeconds: number): Promise<void>;
  deleteSubject(subjectId: SubjectId): Promise<number>;    // returns count of deleted keys
  deleteVersion(subjectId: SubjectId, semver: SemVer): Promise<number>;  // returns count of deleted keys
}

// Role-segregated interfaces (ISP — matching playbook TemplateReader/TemplateWriter precedent):
// VersionReader:     getActive(db, subjectId), getHistory(db, subjectId) — read-only
// VersionWriter:     createVersion(db, input) — write-only
// VersionActivator:  activate(templateId, activatedBy), rollback(subjectId, target, activatedBy)
//                    — constructor-injected PromptCache + CacheInvalidationStrategy (DIP)
```
