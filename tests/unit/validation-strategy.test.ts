import { describe, it, expect } from 'vitest';
import { StandardValidation, InteractiveValidation } from '../../src/lib/prompts/validation-strategy';

describe('StandardValidation', () => {
  const strategy = new StandardValidation();

  it('should pass a valid template with headers, disclaimer, and placeholder', () => {
    const template = `
## Section 1
Content about {{TOPIC}} with enough words to meet the minimum threshold.
Let me add more text here to ensure we pass the word count validation.
One two three four five six seven eight nine ten eleven twelve thirteen.

## Section 2
More content here for the second section.

## Section 3
Final section content.

⚠️ Verify this information with a medical professional.
    `;
    const result = strategy.validate(template);
    expect(result.ok).toBe(true);
  });

  it('should reject a template with fewer than 3 headers', () => {
    const template = `## Only header\n\nContent about {{TOPIC}} that is long enough.\n\n⚠️ Verify`;
    const result = strategy.validate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.code === 'MISSING_SECTIONS')).toBe(true);
    }
  });

  it('should reject a template without disclaimer', () => {
    const template = `## Header 1\n## Header 2\n## Header 3\n\nContent about {{TOPIC}} that is long enough.`;
    const result = strategy.validate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.code === 'MISSING_DISCLAIMER')).toBe(true);
    }
  });

  it('should reject a template with too few words', () => {
    const template = `## A\n## B\n## C\n\nShort.\n\n⚠️ Verify`;
    const result = strategy.validate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.code === 'WORD_COUNT_OUT_OF_BOUNDS')).toBe(true);
    }
  });
});

describe('InteractiveValidation', () => {
  const strategy = new InteractiveValidation();

  it('should pass a template without headers or disclaimer', () => {
    const template = `
This is an interactive tutor template with enough words to pass the minimum
word count threshold. It has no markdown headers and no medical disclaimer
because those are not needed for interactive Socratic tutoring sessions.
Let me add enough words to be absolutely certain we meet the threshold.
One two three four five six seven eight nine ten eleven twelve thirteen
fourteen fifteen sixteen seventeen eighteen nineteen twenty. And more.
    `;
    const result = strategy.validate(template);
    expect(result.ok).toBe(true);
  });

  it('should reject a template with too few words (shared rule)', () => {
    const template = `Too short.`;
    const result = strategy.validate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.code === 'WORD_COUNT_OUT_OF_BOUNDS')).toBe(true);
    }
  });

  it('should reject a template exceeding maximum word count', () => {
    const template = 'word '.repeat(5001);
    const result = strategy.validate(template);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.code === 'WORD_COUNT_OUT_OF_BOUNDS')).toBe(true);
    }
  });
});
