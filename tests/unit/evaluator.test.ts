import { describe, it, expect } from 'vitest';
import { validateTemplate } from '../../src/lib/prompts/evaluator';
import { StandardValidation, InteractiveValidation } from '../../src/lib/prompts/validation-strategy';

describe('validateTemplate with StandardValidation', () => {
  const strategy = new StandardValidation();

  it('should return ok for a valid template', () => {
    const template = `
## Overview
This is a test prompt for {{TOPIC}}. It needs to have enough words to pass the 50-word minimum threshold.
So I will write a little bit of placeholder text here to make sure that the word count goes above fifty words.
This is just some extra text to ensure that the template is considered valid.
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25.

## Pathogenesis
Explain the pathogenesis of the condition.

## Clinical Presentation
Describe the signs and symptoms.

⚠️ Verify the information provided by the AI.
    `;
    const result = validateTemplate(template, strategy);
    expect(result.ok).toBe(true);
  });

  it('should return errors for a completely malformed template', () => {
    const template = 'Just a short prompt without anything.';
    const result = validateTemplate(template, strategy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThanOrEqual(2);
      const codes = result.error.map(e => e.code);
      expect(codes).toContain('MISSING_SECTIONS');
      expect(codes).toContain('WORD_COUNT_OUT_OF_BOUNDS');
    }
  });
});

describe('validateTemplate with InteractiveValidation', () => {
  const strategy = new InteractiveValidation();

  it('should pass an interactive template without headers or disclaimer', () => {
    const template = `
This is an interactive Socratic tutor template with variable placeholders like
{{OUTPUT_LANGUAGE}} and {{ANALOGY_DOMAIN}}. It has enough words to pass the
minimum word count but lacks the standard headers and disclaimer.
One two three four five six seven eight nine ten eleven twelve thirteen
fourteen fifteen sixteen seventeen eighteen nineteen twenty.
    `;
    const result = validateTemplate(template, strategy);
    expect(result.ok).toBe(true);
  });
});
