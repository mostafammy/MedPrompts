import { Result } from '../types/result';
import { SubjectId, Slug } from '../types/branded';

export type GenerateRequest = {
  subjectId: SubjectId;
  topic: string;
  topicSlug: Slug;
  variables: Record<string, string>;
  rawTemplate: string;
  templateSemver: string;
  isInteractive: boolean;
};

export type GenerateSuccess = {
  output: string;
  cacheKey: Slug;
  placeholderCount: number;
  wordCount: number;
  characterCount: number;
};

export type GenerateError =
  | { code: 'TEMPLATE_MALFORMED'; errors: unknown[] }
  | { code: 'INJECTION_FAILED'; details: string }
  | { code: 'CACHE_KEY_FAILED'; details: string };

export interface Generator {
  generate(request: GenerateRequest): Promise<Result<GenerateSuccess, GenerateError>>;
}
