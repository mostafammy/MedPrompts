# Feature Specification: Semantic Prompt Versioning & Intelligent Caching

**Feature Branch**: `006-prompt-versioning-caching`  
**Created**: 2026-06-20  
**Status**: Draft  
**Input**: User description: "Organise prompts with semantic versioning (v1.0.0, v1.0.1, v1.1.0, v2.0.0) and manage caching with production-grade best practices, SOLID principles, and proper design patterns"

## Design Principles

This specification is grounded in five software engineering principles that govern every requirement:

| Principle | Application |
|-----------|-------------|
| **Single Responsibility (SRP)** | Version lifecycle, cache invalidation, audit history, and content integrity are each owned by separate, independently changeable components |
| **Open/Closed (OCP)** | New cache invalidation strategies or version bump types can be added without modifying existing activation logic |
| **Liskov Substitution (LSP)** | All cache invalidation strategies conform to a shared contract; any strategy can replace another without breaking the activation workflow |
| **Interface Segregation (ISP)** | Clients depend only on the operations they need — the version manager does not expose cache internals; the cache layer does not expose database details |
| **Dependency Inversion (DIP)** | High-level activation workflow depends on abstract interfaces (`VersionManager`, `CacheInvalidationStrategy`, `PromptCache`), not concrete implementations |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prompt Engineer Creates a Patch Version (Priority: P1)

A prompt engineer maintains the master prompt templates for medical subjects. After reviewing user feedback, they fix a typo in the Pharmacology template. They create a new version, marking it as a patch bump (v1.0.0 → v1.0.1), and activate it. Existing cached prompts for v1.0.0 continue serving users without disruption. New requests automatically populate the cache for v1.0.1.

**Why this priority**: This is the most frequent operation — minor fixes and improvements happen daily. The entire caching strategy depends on patch bumps being zero-cost.

**Independent Test**: Can be tested by activating a patch bump and verifying that old cache entries remain accessible while new requests generate v1.0.1 cache entries.

**Acceptance Scenarios**:

1. **Given** a subject has an active template at v1.0.0 with cached prompts, **When** a patch version v1.0.1 is activated, **Then** existing v1.0.0 cache entries are not deleted and continue to serve until their TTL expires
2. **Given** a patch version v1.0.1 is activated, **When** a user requests a prompt for that subject, **Then** the response is generated using the v1.0.1 template and cached under the v1.0.1 key
3. **Given** no changes were made to the template content, **When** a version bump is attempted, **Then** the system warns that the template content is identical to the active version

---

### User Story 2 - Prompt Engineer Releases a Major Rewrite (Priority: P1)

A prompt engineer rewrites the Anatomy template with a new pedagogical framework, adding new variables and changing the output structure. They create v2.0.0 and activate it. The system recognizes this as a major bump, invalidates all cached prompts for that subject, and all subsequent requests are served from the new template.

**Why this priority**: Major rewrites are high-impact events that require full cache invalidation. Correct behavior here prevents users from receiving stale, incompatible prompts.

**Independent Test**: Can be tested by activating a major bump and verifying that v1.x.x cache entries are deleted and v2.0.0 entries are created fresh.

**Acceptance Scenarios**:

1. **Given** a subject has active v1.0.0 with cached prompts, **When** v2.0.0 is activated, **Then** all cache entries with prefix matching v1.x.x for that subject are deleted
2. **Given** v2.0.0 is active, **When** a user requests a prompt for that subject, **Then** the response is generated using v2.0.0 template
3. **Given** a major version activation, **When** the cache is empty, **Then** the system serves requests successfully (cache populated on first request)

---

### User Story 3 - Administrator Rolls Back to Previous Version (Priority: P2)

After activating v2.0.0 for Pathology, users report that critical variable placeholders are missing. An administrator rolls back to v1.3.2. The system restores the v1.3.2 template from version history and performs a targeted cache invalidation proportionate to the rollback scope.

**Why this priority**: Rollback is a safety net that prevents prolonged outages from bad deployments. It is less frequent than forward activation but critical when needed.

**Independent Test**: Can be tested by activating v2.0.0, then rolling back to v1.3.2, and verifying that prompts are generated from the restored template.

**Acceptance Scenarios**:

1. **Given** v2.0.0 is active and v1.3.2 exists in version history, **When** an admin rolls back to v1.3.2, **Then** the active template content is restored to v1.3.2's exact text
2. **Given** a rollback from v2.0.0 to v1.3.2, **When** the cache strategy determines the scope, **Then** only v2.0.0 cache keys are invalidated (v1.3.2 cache may still be valid if not expired)
3. **Given** a rollback to a version that has no cached entries, **When** a user requests a prompt, **Then** the response is generated and cached normally under the restored version key

---

### User Story 4 - System Maintains Version Audit Trail (Priority: P3)

An auditor reviews all prompt template changes over the past quarter. They request a full version history for each subject, including who activated what version, when, and the changelog for each change.

**Why this priority**: Audit trail is essential for compliance and debugging but does not affect real-time user experience.

**Independent Test**: Can be tested by activating multiple versions and querying the version history for a subject.

**Acceptance Scenarios**:

1. **Given** a sequence of version activations for a subject, **When** the version history is queried, **Then** all versions are returned with timestamps, semver strings, and changelogs
2. **Given** a deactivated version, **When** the history is queried, **Then** the deactivation timestamp is recorded
3. **Given** a version is activated, **When** the changelog is inspected, **Then** it contains the structured change type (patch/minor/major) and description

---

### User Story 5 - Prompt Engineer Adds Optional Variables via Minor Version (Priority: P1)

A prompt engineer enhances the Microbiology template by adding two new optional variables (DIFFICULTY_LEVEL and CASE_FORMAT) alongside the existing ones. They create v1.2.0 (minor bump) and activate it. The system invalidates only v1.1.x cache entries, while any remaining v1.0.x entries (from a prior major version) expire naturally. Users who had cached prompts from v1.1.x get regenerated prompts with the new variables, while users with v1.0.x cached prompts continue to see their results until TTL expiry.

**Why this priority**: Minor bumps represent new capabilities — they happen as frequently as patches during active development. Correct cache scoping prevents unnecessary regeneration while ensuring users with the latest minor version get the new features.

**Independent Test**: Can be tested by activating a minor bump and verifying that only v1.x.x cache entries for the previous minor are deleted, while entries from earlier minor versions remain.

**Acceptance Scenarios**:

1. **Given** v1.1.0 is active with cached prompts, **When** v1.2.0 is activated, **Then** only cache keys containing `-v1.1.` (prefix match v1.1.x) are deleted
2. **Given** v1.2.0 is active, **When** a user makes a request that was previously cached under v1.1.0, **Then** the response is generated using v1.2.0 with the new variables and cached under the v1.2.0 key
3. **Given** a minor activation where the invalidation operation partially fails, **When** some v1.1.x keys remain in the cache, **Then** the system serves the stale cached entry with a warning header and schedules a retry of the invalidation

---

### User Story 6 - Operator Monitors Version Health via Observability (Priority: P2)

An on-call operator accesses a dashboard showing version activation activity, cache hit/miss rates segmented by version, invalidation operation success rates, and template checksum integrity status. They detect that a minor activation failed to fully invalidate the old version's cache due to a transient KV failure, and trigger a manual retry.

**Why this priority**: Without visibility into version and cache health, operators cannot detect or diagnose partial failures that degrade user experience over time.

**Independent Test**: Can be tested by checking that all version activation events produce observable telemetry, and that the telemetry includes version identifiers and operation outcomes.

**Acceptance Scenarios**:

1. **Given** any version activation (patch/minor/major), **When** the operation completes, **Then** a telemetry event is emitted with: subject ID, new semver, old semver, bump type, invalidation scope, success/failure status, and duration
2. **Given** a cache hit or miss, **When** the request is processed, **Then** the telemetry event includes the version string and whether the cache entry was found
3. **Given** a cache invalidation operation fails partially, **When** an operator views the dashboard, **Then** the dashboard shows the failed invalidation with count of remaining stale keys and a retry action

---

### Edge Cases

**Identity Activation**
- What happens when a version is activated with the same semver as the currently active version? The system should detect identity (same semver AND same checksum) and reject the activation with a clear message indicating no changes were made.
- What happens when a version is activated with the same semver but a different checksum (template was edited without bumping version)? The system should reject activation and require a proper version bump, recommending the appropriate bump type based on diff magnitude.

**Cache Stampede**
- What happens when a major version activation causes mass cache invalidation and thousands of users request prompts simultaneously for the same topic? The system must prevent redundant concurrent generation requests for the same cache-miss key. Only one request should trigger generation; concurrent requests for the same key should wait and reuse the result. This prevents compute waste and downstream API rate limit exhaustion on inference providers.

**Cache Invalidation Failures**
- What happens when cache invalidation partially fails (e.g., KV list pagination succeeds but some batched deletes fail)? Invalidation should be best-effort: log the failure, emit a metric, and rely on TTL for eventual eviction. A retry mechanism should allow operators to re-run invalidation for a specific version.
- What happens when the cache layer is completely unavailable during activation (e.g., KV service outage)? The activation should still succeed against the database, and cache invalidation should be queued for retry when the cache layer recovers. The system continues serving requests without caching until the cache layer is restored.

**Version History Integrity**
- What happens when the version history table accumulates thousands of entries for a single subject? Older history beyond a configurable retention period (e.g., 2 years) should be archived or compressed, but never deleted without explicit operator confirmation.
- What happens if a historical version's template content is corrupted in the database? The checksum stored alongside the template should detect corruption on read. On checksum mismatch during rollback, the system must refuse to restore the corrupted version and alert operators.

**Concurrency Conflicts**
- What happens if two operators attempt to activate different versions for the same subject simultaneously? The system must enforce serialization — one activation succeeds, the other receives a conflict error with the information that another version was activated moments earlier.
- What happens if a rollback is initiated while a forward activation is in progress? The system must reject the rollback with a conflict error indicating an activation is in progress, or queue the rollback to execute after the activation completes.

**Edge Cases: Data Size and Format**
- What happens if a template exceeds a reasonable size limit (e.g., 100KB)? Version creation should validate size limits and reject oversized templates with a clear message.
- What happens if the semver string exceeds 20 characters? The cache key must handle arbitrarily long semver strings gracefully, or enforce a maximum semver length.
- What happens if the structured changelog contains invalid JSON or missing required fields? Version creation should validate the changelog structure and reject with specific field-level error messages.

## Requirements *(mandatory)*

### Functional Requirements

**Version Lifecycle**
- **FR-001**: System MUST support semantic versioning format `MAJOR.MINOR.PATCH` for all prompt templates, where each component is a non-negative integer and the string representation fits within 20 characters
- **FR-002**: System MUST allow activating any existing template version for a subject, deactivating the previously active version in a single atomic database transaction
- **FR-003**: System MUST compute a SHA-256 checksum of the template content at version creation time and store it alongside the version
- **FR-004**: System MUST compare the checksum of a new version against the currently active version's checksum and warn the operator if they are identical
- **FR-005**: System MUST maintain an append-only version history table recording every activation and deactivation with timestamp, semver, full template text, checksum, and structured changelog
- **FR-006**: System MUST support rollback to any previously activated version for a subject by restoring the template content, variables, and interactive flag from version history
- **FR-007**: System MUST reject activation when the target version's semver is already the active version AND the checksum matches, returning a clear identity-detected message

**Cache Key Management**
- **FR-008**: System MUST include the full semver string in all cache keys (format: `{subject}:{slug}-v{major}.{minor}.{patch}-{variableHash}`) to guarantee zero key collisions between versions
- **FR-009**: Cache keys MUST use a deterministic variable hash derived from canonicalized (sorted-key) JSON of all user-supplied variable values, ensuring identical inputs produce identical keys
- **FR-010**: Cache TTL MUST be configurable per-version at activation time, with a default of 30 days (2,592,000 seconds)

**Cache Invalidation Strategy**
- **FR-011**: System MUST implement a pluggable cache invalidation strategy where the invalidation scope is determined by the magnitude of the version bump, selected at activation time
- **FR-012**: On patch version activation (v1.0.0 → v1.0.1): system MUST NOT perform any cache invalidation; old cache entries expire naturally via TTL
- **FR-013**: On minor version activation (v1.0.0 → v1.1.0): system MUST invalidate only cache keys whose semver segment matches the old minor version prefix (e.g., keys containing `-v1.0.`)
- **FR-014**: On major version activation (v1.0.0 → v2.0.0): system MUST invalidate all cache keys for that subject regardless of their version prefix
- **FR-015**: Cache invalidation MUST be best-effort — if the cache layer is unavailable or a partial failure occurs, the activation MUST still succeed against the database and invalidation MUST be queued for retry

**Version History & Audit**
- **FR-016**: System MUST support listing version history for a subject, returning all versions ordered by activation timestamp descending, including semver, changelog, activation timestamp, and deactivation timestamp
- **FR-017**: Deactivated versions in the history MUST retain their deactivation timestamp; the history is append-only and no records may be deleted or modified after creation
- **FR-018**: Version history MUST include a `parentSemver` field recording which version was active before the current one, enabling reconstruction of the activation chain

**Changelog Validation**
- **FR-019**: On version creation, the changelog MUST be validated as structured JSON containing at minimum: `type` (enum: patch|minor|major), `summary` (string, 10-500 chars), and `changes` (array of objects with `area`, `description`, and `breaking` boolean fields)
- **FR-020**: Minor and major version bumps REQUIRE a complete structured changelog; patch version bumps MAY have an empty changelog (for trivial fixes)

**Concurrency & Consistency**
- **FR-021**: System MUST use optimistic locking or serializable transactions to prevent concurrent activations for the same subject from conflicting
- **FR-022**: If concurrent activation is detected, the system MUST reject the second activation with a conflict error indicating that a version was activated moments earlier and suggesting the operator reload the current state

### Non-Functional Requirements

**Performance**
- **NFR-001**: Version activation (including cache invalidation) MUST complete within 5 seconds for all bump types, regardless of cache size
- **NFR-002**: Cache hit latency MUST be under 50ms (p99); cache miss generation time depends on the underlying inference engine and is out of scope of this feature
- **NFR-003**: Version history queries for subjects with up to 100 historical versions MUST return results within 2 seconds
- **NFR-004**: Concurrent read throughput during activation MUST NOT be affected; active version reads are served from a read-optimized path that does not block on activation

**Reliability**
- **NFR-005**: The version activation process MUST maintain data consistency across database and cache — if the database transaction commits, the template is active regardless of cache operation success
- **NFR-006a**: Cache invalidation failures MUST be retried synchronously within the same request up to 3 times with exponential backoff (1s, 4s, 16s), covering transient KV failures
- **NFR-006b** [QUEUE-BACKED]: If a Cloudflare Queue binding is provisioned, invalidation failures that exhaust synchronous retries MUST be enqueued for asynchronous retry with a maximum of 3 additional attempts. If no Queue binding exists, the dashboard's manual retry action serves as the async recovery path
- **NFR-007**: The system MUST gracefully handle cache layer outages — requests are served without caching until the cache layer recovers, and a health check endpoint reports cache status
- **NFR-008**: Rollback MUST restore the exact template content byte-for-byte, verified by checksum comparison after restoration

**Security**
- **NFR-009**: Version activation and rollback MUST require authenticated sessions with administrative privileges
- **NFR-010**: All version activation events MUST be logged to an immutable audit log accessible only to administrators
- **NFR-011**: Cache keys MUST NOT contain Personally Identifiable Information (PII); variable values are hashed, not stored in plaintext in the cache key

**Maintainability**
- **NFR-012**: The cache invalidation strategy MUST be implemented as a replaceable component — adding a new strategy (e.g., for canary deployments or A/B testing) requires no changes to activation, version manager, or cache layer code
- **NFR-013**: The version manager, cache layer, and invalidation strategy MUST each be independently testable via their abstract interfaces

### Key Entities *(include if feature involves data)*

**PromptTemplate**
The authoritative record of a prompt template for a medical subject. Only one template per subject may be active at any time, defining which version is served to users.
| Attribute | Type | Description |
|-----------|------|-------------|
| id | Identifier | Unique, immutable identifier assigned at creation |
| subjectId | Identifier | Foreign key to the subject this template belongs to |
| template | Text | The full prompt template text with variable placeholders |
| semver | SemVer String | Current version in `MAJOR.MINOR.PATCH` format (e.g., "2.1.3") |
| versionMajor | Integer | Parsed major component for query efficiency |
| versionMinor | Integer | Parsed minor component for query efficiency |
| versionPatch | Integer | Parsed patch component for query efficiency |
| checksum | String | SHA-256 hex digest of the template text |
| isActive | Boolean | Whether this template is currently serving user requests |
| changelog | JSON | Structured changelog for the current version |
| isInteractive | Boolean | Whether the template uses the interactive tutor format |
| requiredVariables | JSON Array | Variable definitions recognized by this template |
| createdAt | Timestamp | When this template record was created |

**TemplateVersion**
Immutable, append-only journal of every version activation. Forms the complete audit trail and enables rollback to any prior state.
| Attribute | Type | Description |
|-----------|------|-------------|
| id | Identifier | Unique, immutable identifier |
| templateId | Identifier | Foreign key to the PromptTemplate this record belongs to |
| semver | SemVer String | The version that was activated (e.g., "1.3.2") |
| template | Text | Full template text at the time of activation |
| checksum | String | SHA-256 checksum of the template text |
| changelog | JSON | Structured changelog for this version activation |
| parentSemver | SemVer String or null | The version that was active before this activation (null for first version) |
| activatedAt | Timestamp | When this version became active |
| activatedAt | Timestamp | When this version became active |
| deactivatedAt | Timestamp or null | When this version was superseded (null if currently active) |
| activatedBy | String | Operator identifier from authenticated session (NFR-009); answers the audit requirement "who activated what version" |

**CacheInvalidationStrategy**
Pluggable strategy that determines the scope and approach of cache invalidation based on version difference.
| Attribute | Type | Description |
|-----------|------|-------------|
| name | String | Human-readable strategy identifier (e.g., "semantic-scoping") |
| scopeResolver | Function(oldVersion, newVersion) → Scope | Computes invalidation scope from two semvers |
| supportsRetry | Boolean | Whether partial failures can be retried |
| Scope values | Enum | NONE (no invalidation), VERSION (delete keys matching old minor prefix), SUBJECT (delete all keys for subject) |

**PromptCache**
Abstraction over the edge cache infrastructure that isolates the rest of the system from cache provider specifics.
| Operation | Parameters | Behavior |
|-----------|------------|----------|
| get | subjectId, cacheKey | Returns cached prompt or null if not found or expired |
| set | subjectId, cacheKey, prompt, ttlSeconds | Stores prompt with TTL; silently handles failures |
| deleteVersion | subjectId, semver | Deletes all keys for subject whose key contains the semver prefix |
| deleteSubject | subjectId | Deletes all keys for the subject regardless of version |

**VersionReader** (ISP-segregated read interface)
Read-only operations for the audit page (User Story 4) and the public prompt-rendering path. These consumers never need write dependencies.
| Operation | Input | Output | Side Effects |
|-----------|-------|--------|--------------|
| getActive | subjectId | PromptTemplate or null | Read-only query |
| getHistory | subjectId | TemplateVersion[] | Read-only query ordered by activation timestamp desc |

**VersionWriter** (ISP-segregated write interface)
Write-only operations for creating new template versions. No read or activation surface.
| Operation | Input | Output | Side Effects |
|-----------|-------|--------|--------------|
| createVersion | subjectId, template, semver, changelog, activatedBy | PromptTemplate or error | Validates semver, computes checksum, inserts record |

**VersionActivator** (ISP-segregated activation interface)
Activation and rollback — the highest-risk operations. Constructed once with `PromptCache` and `CacheInvalidationStrategy` baked in (DIP via constructor injection), matching the existing `PromptEngineDeps` pattern.
| Operation | Input | Output | Side Effects |
|-----------|-------|--------|--------------|
| activate | templateId, activatedBy | ActivationResult | DB transaction + cache invalidation via strategy |
| rollback | subjectId, targetSemver, activatedBy | ActivationResult | Restores template from history + cache invalidation |

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Speed & Efficiency**
- **SC-001**: Prompt engineers can create and activate a patch version in under 30 seconds (including writing the changelog entry)
- **SC-002**: Patch version activations cause zero cache flush operations — existing cache entries continue serving uninterrupted, verified by comparing cache hit rates before and after activation
- **SC-003**: Minor version activations delete only cache keys containing the previous minor version prefix (e.g., `-v1.0.`), verified by listing remaining cache keys after activation
- **SC-004a**: Major version activations complete full cache invalidation within 5 seconds at current operational scale (~500 cached keys per subject)
- **SC-004b** [FUTURE, GATED ON KV PAID TIER]: Major version activations complete full cache invalidation within 10 seconds at 10,000+ cached keys, enabled when the KV namespace is upgraded past the free-tier 1,000 ops/day quota
- **SC-005**: Version history queries for any subject return complete results within 2 seconds, including for subjects with 50+ historical versions
- **SC-006**: Template content changes without a version bump are detected and flagged within 1 second of the activation attempt

**Reliability & Correctness**
- **SC-007**: Version rollback restores the exact template content (verified by byte-for-byte comparison) and completes cache invalidation within 10 seconds
- **SC-008**: Zero cache stampede incidents during normal operation — measured as concurrent identical generation requests for the same cache-miss key exceeding 1 during a 30-day observation window
- **SC-009**: 100% of cache invalidation partial failures are logged, visible on the operator dashboard, and retryable with a single action
- **SC-010**: Concurrent activation attempts for the same subject always result in exactly one success; the second attempt receives a conflict error, verified by automated concurrency testing

**Observability**
- **SC-011**: Every version activation produces a telemetry event with subject, old/new semver, bump type, invalidation scope, and duration — verified by inspecting the event stream after each activation
- **SC-012**: Cache hit/miss rates are queryable segmented by major.minor version with under 1 minute data freshness on the operator dashboard

**Maintainability**
- **SC-013**: A new cache invalidation strategy can be added by writing exactly one new file implementing `CacheInvalidationStrategy`, verified by adding a test strategy and confirming no existing activation code changes are required
- **SC-014**: All version lifecycle components (VersionReader, VersionWriter, VersionActivator, PromptCache, CacheInvalidationStrategy) are independently unit-testable via their interfaces without requiring real database or cache infrastructure

## Detailed Activation Flow

This section describes the step-by-step execution of a version activation, showing how each principle and component participates.

### Activation Sequence (Patch, Minor, or Major)

```
Operator            VersionActivator              Database              Cache Layer
   │                             │                    │                      │
   │  1. activate(templateId)    │                    │                      │
   ├────────────────────────────►│                    │                      │
   │                             │                    │                      │
   │                             │  2. Begin transaction                    │
   │                             ├───────────────────►│                      │
   │                             │                    │                      │
   │                             │  3. Load template +│                      │
   │                             │     check existence│                      │
   │                             ├───────────────────►│                      │
   │                             │◄───────────────────┤                      │
   │                             │                    │                      │
   │                             │  4. Load current   │                      │
   │                             │     active version │                      │
   │                             ├───────────────────►│                      │
   │                             │◄───────────────────┤                      │
   │                             │                    │                      │
   │                             │  5. Compute bump   │                      │
   │                             │     type via SemVer│                      │
   │                             │                    │                      │
   │                             │  6. Identity check │                      │
   │                             │     → Reject if id │                      │
   │                             │                    │                      │
   │                             │  7. Deactivate old,│                      │
   │                             │     activate new   │                      │
   │                             ├───────────────────►│                      │
   │                             │◄───────────────────┤                      │
   │                             │                    │                      │
   │                             │  8. Insert version │                      │
   │                             │     history record │                      │
   │                             ├───────────────────►│                      │
   │                             │◄───────────────────┤                      │
   │                             │                    │                      │
   │                             │  9. Commit txn     │                      │
   │                             ├───────────────────►│                      │
   │                             │◄───────────────────┤                      │
   │  ─── DB committed ──────────┤                    │                      │
   │                             │                    │                      │
   │                             │ 10. Determine scope│                      │
   │                             │     via strategy   │                      │
   │                             │                    │                      │
   │                             │ 11a. Try sync      │                      │
   │                             │      invalidation  │                      │
   │                             ├──────────────────────────────────────────►│
   │                             │◄──────────────────────────────────────────┤
   │                             │                    │                      │
   │                             │ 11b. Sync failed?  │                      │
   │                             │      Retry ×3 exp. │                      │
   │                             │      backoff (1,4,16)                     │
   │                             ├──────────────────────────────────────────►│
   │                             │◄──────────────────────────────────────────┤
   │                             │                    │                      │
   │                             │ 11c. Exhausted?    │                      │
   │                             │      Enqueue async │                      │
   │                             │      → Queue (opt.)│                      │
   │                             │      OR log for    │                      │
   │                             │      manual retry  │                      │
   │                             │                    │                      │
   │                             │ 12. Log telemetry  │                      │
   │                             │     (incl. retry   │                      │
   │                             │      count + actor)│                      │
   │                             │                    │                      │
   │◄────────────────────────────┤                    │                      │
   │                             │                    │                      │
   │ 13. Return success/error    │                    │                      │
```

**Sync/Async Clarification** — Two Invalidation Paths:
- **Fast path (synchronous)**: Steps 11a-11b run within the HTTP request. For patch (NONE) and minor (VERSION, small key count) bumps, this completes within the 5-second budget. The operator does not see the response until sync retries are exhausted.
- **Slow path (async off-ramp)**: Step 11c applies only if sync retries are exhausted and a Queue binding exists. The activation response returns success to the operator immediately; the Queue worker retries asynchronously. If no Queue binding exists, the dashboard displays the pending invalidation for manual retry. In all cases, the database transaction already committed at step 9 — the template is active regardless of cache outcome (NFR-005).

### Decision Matrix: Invalidation Scope

| Bump Type | Example | Invalidation Scope | Rationale |
|-----------|---------|-------------------|-----------|
| Patch | v1.0.0 → v1.0.1 | NONE | Old cache is still semantically valid; new keys populate naturally |
| Patch (identical content) | v1.0.0 → v1.0.0 | Rejected | Same checksum detected; no operation performed |
| Minor | v1.0.0 → v1.1.0 | VERSION | Only v1.0.x keys are stale; v1.1.x keys populate on next request |
| Major | v1.x.x → v2.0.0 | SUBJECT | Breaking change invalidates all cached output for the subject |
| Rollback (within major) | v2.1.0 → v2.0.0 | VERSION | Only v2.1.x entries are stale |
| Rollback (cross-major) | v2.0.0 → v1.3.2 | SUBJECT | Breaking change in reverse direction; full invalidation |

### Concurrency Guard

During the transaction (step 2-9), the VersionManager uses a serializable isolation level or optimistic locking on the subject ID. If another activation transaction commits first, the second transaction's version check detects that the active version changed since it began and aborts with a conflict error. This prevents the "lost update" anomaly where two operators both believe their activation succeeded but only one actually took effect.

## Assumptions

**Operational Assumptions**
- Version creation and activation are performed by trusted operators (prompt engineers, administrators) — no self-service versioning for end users
- Operators have basic familiarity with semantic versioning conventions (MAJOR = breaking change, MINOR = new feature, PATCH = bug fix)
- At most one operator performs version activations at a time per subject; concurrent cross-subject activations are supported
- No automated version bump suggestion based on diff analysis — version type is always specified manually by the operator

**Data & Storage Assumptions**
- The version history table is append-only; no deletion or modification of historical records is permitted under normal operations
- Cache TTL of 30 days (2,592,000 seconds) is sufficient for all versions; expired cache entries are not reconstructed preemptively
- Template content size is under 100KB per template; version history stores full template text, not diffs
- Historical data beyond 2 years may be archived to cold storage; archived versions are not available for rollback without restoration

**Scope Boundaries**
- The system uses a single active template per subject at any time (no A/B testing, canary deployments, or traffic-split versioning in scope)
- Version rollback restores the exact template text, variables, and interactive flags from history — no partial or selective rollback
- Cache warm-up (pre-populating cache after activation) is out of scope; cache populates naturally on first user request after activation
- The Git feature branch (`006-prompt-versioning-caching`) handles source control; this spec describes application-level versioning only

**Dependencies**
- The existing subject, prompt template, and database infrastructure is in place and stable
- The edge cache layer (KV) supports prefix-based listing and deletion operations
- Database supports transactions with rollback capability for atomic activation
- The changelog validation schema is agreed upon by the team and implemented as a shared library

## Observability & Monitoring

### Telemetry Events

Every version lifecycle operation emits a structured event for downstream observability:

| Event | Triggered By | Payload |
|-------|-------------|---------|
| `version.activated` | Successful activation | subjectId, oldSemver, newSemver, bumpType, invalidationScope, durationMs, success, activatedBy |
| `version.activation_failed` | Failed activation | subjectId, newSemver, errorCode, errorMessage |
| `version.rolled_back` | Successful rollback | subjectId, fromSemver, toSemver, invalidationScope, durationMs |
| `cache.invalidation_started` | Cache invalidation begins | subjectId, scope, targetVersion, keyCount |
| `cache.invalidation_completed` | Invalidation finishes | subjectId, scope, deletedCount, durationMs |
| `cache.invalidation_failed` | Partial/full invalidation failure | subjectId, scope, deletedCount, remainingCount, errorDetails |
| `cache.stampede_detected` | Concurrent requests for same cache-miss key | subjectId, semver, cacheKey, concurrentCount |

### Metrics (Counters & Histograms)

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `version_activations_total` | Counter | subject, bump_type, status | Track activation volume and success rate |
| `version_activation_duration_seconds` | Histogram | subject, bump_type | Track activation latency (p50/p95/p99) |
| `cache_invalidation_keys_deleted` | Counter | subject, scope | Track invalidation volume per operation |
| `cache_invalidation_duration_seconds` | Histogram | subject, scope | Track invalidation speed |
| `cache_hits_total` | Counter | subject, version_major, version_minor | Track cache efficiency per version |
| `cache_misses_total` | Counter | subject, version_major, version_minor | Track cache miss rate per version |
| `cache_stampede_events_total` | Counter | subject | Track stampede frequency |

### Operator Dashboard

The operator dashboard MUST surface:
- **Active versions per subject** — current semver, activation timestamp, days since last change
- **Recent activation activity** — last 24 hours of activations with status and duration
- **Cache health by version** — hit rate, miss rate, and entry count segmented by major.minor version
- **Pending invalidations** — list of versions whose invalidation partially failed, with retry action
- **Checksum integrity warnings** — templates whose checksum changed without a version bump

### Alert Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| Activation failure | Version activation fails (database or cache) | Critical |
| Cache invalidation failure | Invalidation completes with remaining keys > 0 | Warning |
| Cache stampede | > 5 concurrent requests for the same cache-miss key | Warning |
| Stale active version | Subject has same active version for > 90 days | Info |
| Template drift | Template content checksum changed without version bump | Warning |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Cache invalidation partial failure**: KV list returns keys but some deletes fail, leaving stale cache entries | Medium | Medium | Best-effort invalidation with logging; TTL as ultimate safety net; dashboard visibility enables operator retry |
| **Cache stampede on major activation**: Thousands of users request prompts simultaneously after major version cache flush, causing redundant inference calls | Low | High | First-request-wins locking for cache-miss keys; concurrent requests for the same key block and reuse the first result |
| **Rollback to corrupted version**: A historical version's template text is silently corrupted in the database, and rollback restores broken content | Low | Critical | Checksum verification on rollback; refuse restoration on checksum mismatch; alert operators immediately |
| **Concurrent activation conflict**: Two operators activate different versions for the same subject simultaneously, causing inconsistent state | Low | High | Serializable transactions or optimistic locking; reject concurrent activations with clear conflict error |
| **Semver confusion**: Operator incorrectly labels a breaking change as a minor bump, causing inappropriate cache invalidation scope | Medium | Medium | Changelog validation encourages proper classification; audit trail enables traceability; rollback provides safety net |
| **Version history bloat**: Thousands of rapid patch versions inflate the history table, degrading query performance | Low | Low | Archive policy for entries older than 2 years; paginated history queries enforce page size limits |
| **Cache layer outage during activation**: KV is unavailable, invalidation cannot execute, but database activation succeeds | Low | Medium | Activation succeeds regardless; invalidation queued for automatic retry; health check endpoint reports cache status |
