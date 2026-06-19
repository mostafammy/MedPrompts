import { Generator, GenerateRequest, GenerateSuccess, GenerateError } from './generator';
import { Analytics } from '../analytics';
import { Result } from '../types/result';

export class AnalyticsDecorator implements Generator {
  constructor(
    private inner: Generator,
    private analytics: Analytics
  ) {}

  async generate(
    request: GenerateRequest
  ): Promise<Result<GenerateSuccess, GenerateError>> {
    const start = Date.now();
    const result = await this.inner.generate(request);
    const latency = Date.now() - start;

    if (result.ok) {
      this.analytics.trackPromptGenerated(request.subjectId, result.value.cacheKey, latency);
    }

    return result;
  }
}
