import { describe, it, expect } from 'vitest';
import { slugifyTopic, slugToTopic } from '../../src/lib/prompts/slugifier';
import { Topic } from '../../src/lib/types/branded';

describe('slugifyTopic', () => {
  it('should slugify standard string', () => {
    expect(slugifyTopic('Myocardial Infarction')).toBe('myocardial-infarction');
  });

  it('should handle diacritics', () => {
    expect(slugifyTopic('Ménière\'s disease')).toBe('menieres-disease');
  });

  it('should prevent collision for long topics', () => {
    const topic1 = 'a'.repeat(80) + '1';
    const topic2 = 'a'.repeat(80) + '2';
    expect(slugifyTopic(topic1)).not.toBe(slugifyTopic(topic2));
  });

  it('should return unknown for empty after sanitization', () => {
    expect(slugifyTopic('!@#$$')).toBe('unknown');
  });

  it('should be idempotent if already slugified', () => {
    expect(slugifyTopic('myocardial-infarction')).toBe('myocardial-infarction');
  });

  it('should handle mixed case', () => {
    expect(slugifyTopic('aSTHma')).toBe('asthma');
  });

  it('should return unknown for Arabic only (since it removes non-ascii)', () => {
    expect(slugifyTopic('احتشاء عضلة القلب')).toBe('unknown');
  });

  it('should handle numbers', () => {
    expect(slugifyTopic('Type 2 Diabetes')).toBe('type-2-diabetes');
  });

  it('should handle punctuation only', () => {
    expect(slugifyTopic('.,;')).toBe('unknown');
  });
  
  it('should not exceed max length', () => {
    const topic = 'a'.repeat(100);
    const slug = slugifyTopic(topic);
    expect(slug.length).toBeLessThanOrEqual(74);
  });
});

describe('slugToTopic', () => {
  it('should convert slug to title case', () => {
    expect(slugToTopic('myocardial-infarction')).toBe('Myocardial Infarction');
  });
});
