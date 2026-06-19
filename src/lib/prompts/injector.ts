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

export type MultiInjectionError =
  | { code: 'TEMPLATE_EMPTY'; message: string }
  | { code: 'MISSING_PLACEHOLDER'; placeholder: string; message: string }
  | { code: 'UNRESOLVED_PLACEHOLDER'; placeholder: string; message: string };

/**
 * @pure
 * @throws Never
 */
export function injectVariables(
  template: string,
  variables: Record<string, string>
): Result<InjectionSuccess, MultiInjectionError> {
  if (template.trim() === '') {
    return err({ code: 'TEMPLATE_EMPTY', message: 'Template cannot be empty' });
  }

  const placeholders = Array.from(template.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)).map(
    (match) => match[1]
  );

  for (const placeholder of placeholders) {
    if (variables[placeholder] === undefined) {
      return err({
        code: 'MISSING_PLACEHOLDER',
        placeholder,
        message: `Missing value for {{${placeholder}}}`,
      });
    }
  }

  let matchCount = 0;
  const output = template.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_match, key: string) => {
    matchCount++;
    return variables[key];
  });

  const unresolved = output.match(/\{\{([A-Z][A-Z0-9_]*)\}\}/);
  if (unresolved) {
    return err({
      code: 'UNRESOLVED_PLACEHOLDER',
      placeholder: unresolved[1],
      message: `Unresolved placeholder {{${unresolved[1]}}}`,
    });
  }

  const characterCount = output.length;
  const wordCount = output.trim().split(/\s+/).filter(Boolean).length;
  return ok({ output, placeholderCount: matchCount, wordCount, characterCount });
}
