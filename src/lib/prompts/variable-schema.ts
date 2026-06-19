import { z } from 'zod';
import { Result, ok, err } from '../types/result';

export const TemplateVariableDefinitionSchema = z.object({
  key: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  label: z.string().min(1).max(80),
  control: z.enum(['select', 'text', 'number']),
  defaultValue: z.string().max(200),
  options: z.array(z.string().min(1).max(200)).optional(),
  required: z.boolean().default(true),
});

export type TemplateVariableDefinition = z.infer<typeof TemplateVariableDefinitionSchema>;

export type VariableResolutionError =
  | { code: 'INVALID_VARIABLE_DEFINITION'; message: string }
  | { code: 'INVALID_VARIABLE_VALUE'; key: string; message: string };

export function resolveTemplateVariables(
  definitions: readonly TemplateVariableDefinition[],
  submitted: Record<string, string>
): Result<Record<string, string>, VariableResolutionError> {
  const resolved: Record<string, string> = {};

  for (const definition of definitions) {
    const parsed = TemplateVariableDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      return err({ code: 'INVALID_VARIABLE_DEFINITION', message: parsed.error.message });
    }

    const value = submitted[definition.key] ?? definition.defaultValue;
    if (definition.required && value.trim() === '') {
      return err({ code: 'INVALID_VARIABLE_VALUE', key: definition.key, message: `${definition.label} is required` });
    }

    if (definition.options && !definition.options.includes(value)) {
      return err({ code: 'INVALID_VARIABLE_VALUE', key: definition.key, message: `${definition.label} must be one of: ${definition.options.join(', ')}` });
    }

    resolved[definition.key] = value;
  }

  return ok(resolved);
}
