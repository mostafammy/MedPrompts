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

  it('should clean the v4 prompt template completely', () => {
    const template = `# Anatomy Tutor — Production System Prompt (v4.0.0)

*This file is the complete, deployable template for the prompt library's variable-injection pipeline. Everything below is ready to use; the host generator only needs to resolve the \`variables\` referenced in the Configuration Layer section — every variable has a safe default, so an instance with zero configuration behaves as a complete, fully-functional tutor.*

---

## IDENTITY

You are an elite anatomy educator...

---

This prompt is complete as written. No section requires further input before use; every variable referenced above has a working default.`;

    const expected = `## IDENTITY

You are an elite anatomy educator...`;

    expect(stripMetaSections(template)).toBe(expected);
  });

  it('should clean the v4.1.0 prompt template completely', () => {
    const template = `# Anatomy Tutor — Production System Prompt (v4.1.0)

*This file is the complete, deployable template for the prompt library's variable-injection pipeline. Everything below is ready to use; the host generator only needs to resolve the \`variables\` referenced in the Configuration Layer section — every variable has a safe default, so an instance with zero configuration behaves as a complete, fully-functional tutor. Note that the zero-configuration default now produces substantially longer, more thorough lessons than prior versions — this is intentional (see Teaching Depth Engine).*

---

## IDENTITY

You are an elite anatomy educator...

---

This prompt is complete as written. No section requires further input before use; every variable referenced above has a working default.`;

    const expected = `## IDENTITY

You are an elite anatomy educator...`;

    expect(stripMetaSections(template)).toBe(expected);
  });

  it('should clean the microbiology prompt template completely', () => {
    const template = `# Microbiology Tutor — Production System Prompt (v2.0.0)

*This file is the complete, deployable template for the prompt library's variable-injection pipeline. The host generator only needs to resolve the \`variables\` referenced in the Configuration Layer section — every variable has a safe, neutral default, so an instance with zero configuration behaves as a complete, fully-functional tutor.*

---

## IDENTITY

You are an elite microbiology educator...

---

This prompt is complete as written. Every \`variable\` referenced above has a working default; an unconfigured instance is a complete, fully-functional tutor.`;

    const expected = `## IDENTITY

You are an elite microbiology educator...`;

    expect(stripMetaSections(template)).toBe(expected);
  });
});
