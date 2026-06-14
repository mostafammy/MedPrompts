import { SubjectId, Slug } from '../types/branded';
import { Result, ok, err } from '../types/result';
import { Database } from '../db/client';
import { PromptCache } from './cache';
import { Analytics } from '../analytics';
import { TopicNormalizationPipeline } from './pipeline';
import { sanitizeTopic } from './sanitizer';
import { getActiveTemplate } from './loader';
import { validateTemplate } from './evaluator';
import { injectTopic } from './injector';
import { slugifyTopic } from './slugifier';

export type EngineError = 
  | { code: 'TOPIC_INVALID'; details: string }
  | { code: 'SUBJECT_NOT_FOUND' }
  | { code: 'TEMPLATE_MALFORMED'; errors: any[] }
  | { code: 'INJECTION_FAILED'; details: string };

export type EngineEnv = {
  hasApiKey: boolean;
  userPlan: 'free' | 'pro';
};

export class PromptEngine {
  constructor(
    private db: Database,
    private promptCache: PromptCache,
    private pipeline: TopicNormalizationPipeline,
    private analytics: Analytics
  ) {}

  async generatePrompt(subjectId: SubjectId, topic: string, env: EngineEnv): Promise<Result<string, EngineError>> {
    // Check prompt cache early if possible
    const initialSlug = slugifyTopic(topic);
    const cached = await this.promptCache.get(subjectId, initialSlug);
    if (cached) {
      this.analytics.trackPromptGenerated(subjectId, initialSlug, 0);
      return ok(cached);
    }

    const start = Date.now();

    // Run TopicNormalizationPipeline
    const normalized = await this.pipeline.normalize(topic, { subjectId, raw: topic }, env);

    // sanitizeTopic() -> if error, return TOPIC_INVALID
    const sanitizedResult = sanitizeTopic(normalized.cleaned);
    if (!sanitizedResult.ok) {
      return err({ code: 'TOPIC_INVALID', details: sanitizedResult.error.code });
    }
    const safeTopic = sanitizedResult.value;

    // Fetch active template via loader -> if null, return SUBJECT_NOT_FOUND
    const template = await getActiveTemplate(this.db, subjectId);
    if (!template) {
      return err({ code: 'SUBJECT_NOT_FOUND' });
    }

    // Evaluate template via validateTemplate -> if invalid, return TEMPLATE_MALFORMED
    const validationResult = validateTemplate(template.template);
    if (!validationResult.ok) {
      return err({ code: 'TEMPLATE_MALFORMED', errors: validationResult.error });
    }

    // injectTopic() -> if error, return INJECTION_FAILED
    const injectionResult = injectTopic(template.template, safeTopic);
    if (!injectionResult.ok) {
      return err({ code: 'INJECTION_FAILED', details: injectionResult.error.code });
    }
    const finalPrompt = injectionResult.value.prompt;

    // Generate slug via slugifyTopic()
    const finalSlug = slugifyTopic(safeTopic);

    // Write to PromptCache
    await this.promptCache.set(subjectId, finalSlug, finalPrompt, 2592000); // 30 days

    // Track analytics
    const latency = Date.now() - start;
    this.analytics.trackPromptGenerated(subjectId, finalSlug, latency);

    // Return injected prompt
    return ok(finalPrompt);
  }
}
