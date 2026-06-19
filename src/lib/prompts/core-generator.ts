import { Generator, GenerateRequest, GenerateSuccess, GenerateError } from './generator';
import { injectVariables } from './injector';
import { validateTemplate } from './evaluator';
import { strategyForTemplate } from './validation-strategy';
import { Result, ok, err } from '../types/result';

export class CoreGenerator implements Generator {
  async generate(
    request: GenerateRequest
  ): Promise<Result<GenerateSuccess, GenerateError>> {
    const validationResult = validateTemplate(
      request.rawTemplate,
      strategyForTemplate({ isInteractive: request.isInteractive })
    );

    if (!validationResult.ok) {
      return err({
        code: 'TEMPLATE_MALFORMED',
        errors: validationResult.error,
      });
    }

    const injectionResult = injectVariables(request.rawTemplate, {
      ...request.variables,
      TOPIC: request.topic,
      SUBJECT: request.subjectId.charAt(0).toUpperCase() + request.subjectId.slice(1),
    });

    if (!injectionResult.ok) {
      return err({ code: 'INJECTION_FAILED', details: injectionResult.error.code });
    }

    return ok({ ...injectionResult.value, cacheKey: request.topicSlug });
  }
}
