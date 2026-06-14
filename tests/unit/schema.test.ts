import { describe, it, expect } from 'vitest';
import { PromptRequestSchema, PromptResponseSchema } from '../../src/lib/prompts/schema';

describe('Zod schemas', () => {
  it('validates PromptRequest', () => {
    const res = PromptRequestSchema.safeParse({ topic: 'Heart Failure', subjectId: 'cardio' });
    expect(res.success).toBe(true);
  });

  it('fails invalid PromptRequest', () => {
    const res = PromptRequestSchema.safeParse({ topic: '', subjectId: 'Cardio' });
    expect(res.success).toBe(false);
  });

  it('validates PromptResponse', () => {
    const res = PromptResponseSchema.safeParse({ slug: 'heart-failure', prompt: 'test' });
    expect(res.success).toBe(true);
  });
});
