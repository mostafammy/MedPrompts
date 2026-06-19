import { Result } from '../types/result';
import {
  ValidationStrategy,
  TemplateValidationError,
} from './validation-strategy';

export type { TemplateValidationError };

/**
 * @pure
 * @throws Never
 */
export function validateTemplate(
  template: string,
  strategy: ValidationStrategy
): Result<void, TemplateValidationError[]> {
  return strategy.validate(template);
}
