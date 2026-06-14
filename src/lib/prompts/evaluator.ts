import { Result, ok, err } from '../types/result';

export type TemplateValidationError = 
  | { code: 'MISSING_SECTIONS'; message: string }
  | { code: 'MISSING_DISCLAIMER'; message: string }
  | { code: 'MISSING_PLACEHOLDER'; message: string }
  | { code: 'WORD_COUNT_OUT_OF_BOUNDS'; message: string };

/**
 * @pure
 */
export function validateTemplate(template: string): Result<void, TemplateValidationError[]> {
  const errors: TemplateValidationError[] = [];
  
  // Section validation
  const headerMatches = template.match(/^##\s+/gm) || [];
  if (headerMatches.length < 3) {
    errors.push({ code: 'MISSING_SECTIONS', message: `Expected at least 3 headers, found ${headerMatches.length}` });
  }

  // Disclaimer validation
  const hasDisclaimer = /⚠️\s*Verify/i.test(template) || /verify/i.test(template);
  if (!hasDisclaimer) {
    errors.push({ code: 'MISSING_DISCLAIMER', message: 'Template must contain a verification disclaimer' });
  }

  // Placeholder validation
  if (!template.includes('{{TOPIC}}')) {
    errors.push({ code: 'MISSING_PLACEHOLDER', message: 'Template must contain {{TOPIC}}' });
  }

  // Word count validation
  const wordCount = template.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50 || wordCount > 3000) {
    errors.push({ code: 'WORD_COUNT_OUT_OF_BOUNDS', message: `Word count must be between 50 and 3000. Found ${wordCount}` });
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(undefined);
}
