import { describe, it, expect } from 'vitest';
import { injectTopic, injectVariables } from '../../src/lib/prompts/injector';
import { Topic } from '../../src/lib/types/branded';

describe('injectTopic', () => {
  it('should inject topic successfully (happy path 1)', () => {
    const template = 'Explain {{TOPIC}} to me.';
    const topic = 'Asthma' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Explain Asthma to me.');
      expect(result.value.placeholderCount).toBe(1);
      expect(result.value.wordCount).toBe(4);
      expect(result.value.characterCount).toBe(21);
    }
  });

  it('should inject topic successfully (happy path 2)', () => {
    const template = 'What is the pathogenesis of {{TOPIC}}?';
    const topic = 'Myocardial Infarction' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('What is the pathogenesis of Myocardial Infarction?');
      expect(result.value.placeholderCount).toBe(1);
      expect(result.value.wordCount).toBe(7);
      expect(result.value.characterCount).toBe(50);
    }
  });

  it('should handle multiple placeholders', () => {
    const template = '{{TOPIC}} is a disease. The treatment for {{TOPIC}} is important.';
    const topic = 'Pneumonia' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Pneumonia is a disease. The treatment for Pneumonia is important.');
      expect(result.value.placeholderCount).toBe(2);
    }
  });

  it('should return error for empty template', () => {
    const template = '   ';
    const topic = 'Asthma' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEMPLATE_EMPTY');
    }
  });

  it('should return error if placeholder is missing', () => {
    const template = 'Explain Asthma to me.';
    const topic = 'Asthma' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_PLACEHOLDER');
    }
  });

  it('should return error if topic is too long', () => {
    const template = 'Explain {{TOPIC}} to me.';
    const topic = 'a'.repeat(121) as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TOPIC_TOO_LONG');
    }
  });

  it('should handle special characters in topic without bugs (like $$)', () => {
    const template = 'Price for {{TOPIC}} is high.';
    const topic = '$$Asthma' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Price for $$Asthma is high.');
    }
  });

  it('should be case-sensitive for placeholder', () => {
    const template = 'Explain {{topic}} to me.';
    const topic = 'Asthma' as Topic;
    const result = injectTopic(template, topic);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_PLACEHOLDER');
    }
  });
});

describe('injectVariables', () => {
  it('should replace multiple distinct variables', () => {
    const template = 'Teach {{TOPIC}} in {{OUTPUT_LANGUAGE}} using {{ANALOGY_DOMAIN}} analogies.';
    const result = injectVariables(template, {
      TOPIC: 'Plexus brachialis',
      OUTPUT_LANGUAGE: 'German',
      ANALOGY_DOMAIN: 'Cooking',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Teach Plexus brachialis in German using Cooking analogies.');
      expect(result.value.placeholderCount).toBe(3);
    }
  });

  it('should return error for unknown placeholder', () => {
    const template = '{{TOPIC}} and {{UNKNOWN_VAR}}';
    const result = injectVariables(template, { TOPIC: 'Asthma' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_PLACEHOLDER');
    }
  });

  it('should return error for empty template', () => {
    const result = injectVariables('', { TOPIC: 'test' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEMPLATE_EMPTY');
    }
  });

  it('should handle zero variables gracefully', () => {
    const template = 'No placeholders here.';
    const result = injectVariables(template, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('No placeholders here.');
      expect(result.value.placeholderCount).toBe(0);
    }
  });

  it('should replace the same variable appearing multiple times', () => {
    const template = '{{TOPIC}} is complex. Study {{TOPIC}} daily.';
    const result = injectVariables(template, { TOPIC: 'Pharmacology' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Pharmacology is complex. Study Pharmacology daily.');
      expect(result.value.placeholderCount).toBe(2);
    }
  });

  it('should handle regex-special characters in variable values', () => {
    const template = 'Cost: {{TOPIC}}';
    const result = injectVariables(template, { TOPIC: '$100 (special)' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toBe('Cost: $100 (special)');
    }
  });

  it('should compute correct word and character counts', () => {
    const template = 'Hello {{TOPIC}} world';
    const result = injectVariables(template, { TOPIC: 'beautiful' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.wordCount).toBe(3);
      expect(result.value.characterCount).toBe(21);
    }
  });

  it('should return error for missing placeholder value', () => {
    const template = '{{TOPIC}} and {{OUTPUT_LANGUAGE}}';
    const result = injectVariables(template, { TOPIC: 'Asthma' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_PLACEHOLDER');
    }
  });
});
