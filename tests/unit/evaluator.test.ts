import { describe, it, expect } from 'vitest';
import { validateTemplate } from '../../src/lib/prompts/evaluator';

describe('validateTemplate', () => {
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
    const result = validateTemplate(template);
    expect(result.ok).toBe(true);
  });

  it('should return errors for a completely malformed template', () => {
    const template = 'Just a short prompt without anything.';
    const result = validateTemplate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toHaveLength(4);
      const codes = result.error.map(e => e.code);
      expect(codes).toContain('MISSING_SECTIONS');
      expect(codes).toContain('MISSING_DISCLAIMER');
      expect(codes).toContain('MISSING_PLACEHOLDER');
      expect(codes).toContain('WORD_COUNT_OUT_OF_BOUNDS');
    }
  });

  it('should collect multiple errors without failing fast', () => {
    const template = '## Only one header\n\nNo disclaimer or topic here. This is short.';
    const result = validateTemplate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBe(4);
    }
  });
});
