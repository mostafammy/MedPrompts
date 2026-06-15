import { z } from 'zod';
import { Topic, SubjectId, Slug } from '../types/branded';

export const PromptRequestSchema = z.object({
  topic: z.string().min(1).max(120).transform(s => Topic.unsafeParse(s)),
  subjectId: z.string().regex(/^[a-z][a-z0-9-]*$/).transform(s => SubjectId.unsafeParse(s))
});

export const PromptResponseSchema = z.object({
  slug: z.string().transform(s => Slug.unsafeParse(s)),
  prompt: z.string()
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;
export type PromptResponse = z.infer<typeof PromptResponseSchema>;
