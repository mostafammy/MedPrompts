import { describe, it, expect } from 'vitest';
import { stripMetaSections } from '../../src/lib/prompts/strip-meta-sections';

describe('stripMetaSections', () => {
  it('should pass through standard templates with no meta sections', () => {
    const template = `## Section 1\nContent with {{TOPIC}}.\n\n## Section 2\nMore content.`;
    expect(stripMetaSections(template)).toBe(template);
  });

  it('should clean the master prompt template completely', () => {
    const template = `# MEDICAL TUTOR — MASTER PROMPT TEMPLATE (v3.0)

> **Library usage:** The generator fills the variables below...

---

## CHANGE LOG — FIXES APPLIED FROM v1.0 (and v2.0)

| # | Issue | Fix |
|---|---|---|
| 1 | Unbounded loop | Fixed |

---

## CO-STAR SPECIFICATION

**C — Context**
Context here.

## INPUTS

- **Subject**: {{SUBJECT}}
- **Topic**: {{TOPIC}}
- **Terminology Standard**: {{TERMINOLOGY_STANDARD}} — see *Subject Adaptation Notes* below for examples per subject

### Subject Adaptation Notes (for the generator, not spoken to the user)
| Subject | Suggested Terminology Standard |
|---|---|
| Anatomy | Terminologia Anatomica |

If {{SUBJECT}} doesn't match a row above, select...

---

## CORE RULES

1. Rule 1
2. Rule 2

---

## RECOMMENDED MODEL CONFIGURATION

- Global temperature: low`;

    const expected = `## CO-STAR SPECIFICATION

**C — Context**
Context here.

## INPUTS

- **Subject**: {{SUBJECT}}
- **Topic**: {{TOPIC}}
- **Terminology Standard**: {{TERMINOLOGY_STANDARD}}

---

## CORE RULES

1. Rule 1
2. Rule 2`;

    expect(stripMetaSections(template)).toBe(expected);
  });
});
