import { Result, ok, err } from '../types/result';
import { Topic } from '../types/branded';

export type InjectionError = 
  | { code: 'TEMPLATE_EMPTY'; message: string }
  | { code: 'MISSING_PLACEHOLDER'; message: string }
  | { code: 'TOPIC_TOO_LONG'; message: string };

export type InjectionSuccess = {
  output: string;
  placeholderCount: number;
  wordCount: number;
  characterCount: number;
};

/**
 * @pure
 * @throws Never
 */
export function injectTopic(template: string, topic: Topic): Result<InjectionSuccess, InjectionError> {
  if (template.trim() === '') {
    return err({ code: 'TEMPLATE_EMPTY', message: 'Template cannot be empty' });
  }
  if (!template.includes('{{TOPIC}}')) {
    return err({ code: 'MISSING_PLACEHOLDER', message: 'Template must contain {{TOPIC}}' });
  }
  if (topic.length > 120) {
    return err({ code: 'TOPIC_TOO_LONG', message: 'Topic exceeds maximum length' });
  }

  const parts = template.split('{{TOPIC}}');
  const placeholderCount = parts.length - 1;
  const output = parts.join(topic);
  
  const characterCount = output.length;
  const wordCount = output.trim().split(/\s+/).filter(Boolean).length;

  return ok({ output, placeholderCount, wordCount, characterCount });
}
