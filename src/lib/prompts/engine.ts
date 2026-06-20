import { SubjectId } from '../types/branded';
import { Result, ok, err } from '../types/result';
import { Database } from '../db/client';
import { PromptCache } from './cache';
import { Analytics } from '../analytics';
import { TopicNormalizationPipeline } from './pipeline';
import { sanitizeTopic } from './sanitizer';

import { Generator, GenerateError } from './generator';
import { CoreGenerator } from './core-generator';
import { CachingDecorator } from './caching-decorator';
import { AnalyticsDecorator } from './analytics-decorator';
import { slugifyTopic } from './slugifier';
import { resolveTemplateVariables } from './variable-schema';
import { terminologyStandardForSubject } from './medical-tutor-variables';
import { VersionReader } from './version-reader';
import { VersionWriter } from './version-writer';
import { VersionActivator } from './version-activator';

export type EngineEnv = {
  hasApiKey: boolean;
  userPlan: 'free' | 'pro';
};

export type EngineError =
  | { code: 'TOPIC_INVALID'; details: string }
  | { code: 'SUBJECT_NOT_FOUND' }
  | { code: 'VARIABLE_INVALID'; details: string }
  | { code: 'GENERATION_FAILED'; details: string }
  | GenerateError;

export class PromptEngine {
  private generator: Generator;

  constructor(
    private db: Database,
    private promptCache: PromptCache,
    private pipeline: TopicNormalizationPipeline,
    private analytics: Analytics,
    private versionReader: VersionReader,
    private versionWriter: VersionWriter,
    private versionActivator: VersionActivator
  ) {
    const core = new CoreGenerator();
    const cached = new CachingDecorator(core, this.promptCache, this.analytics);
    this.generator = new AnalyticsDecorator(cached, this.analytics);
  }

  async generatePrompt(
    subjectId: SubjectId,
    topic: string,
    submittedVariables: Record<string, string> = {},
    env: EngineEnv
  ): Promise<Result<string, EngineError>> {
    try {
      const normalized = await this.pipeline.normalize(topic, {
        subjectId,
        raw: topic,
      }, env);

      const sanitizedResult = sanitizeTopic(normalized.cleaned);
      if (!sanitizedResult.ok) {
        return err({ code: 'TOPIC_INVALID', details: sanitizedResult.error.code });
      }
      const safeTopic = sanitizedResult.value;
      const topicSlug = slugifyTopic(safeTopic);

      const template = await this.versionReader.getActive(this.db, subjectId);
      if (!template) {
        return err({ code: 'SUBJECT_NOT_FOUND' });
      }

      const variableDefinitions = template.requiredVariables ?? [];
      const resolvedVariables = resolveTemplateVariables(variableDefinitions, submittedVariables);
      if (!resolvedVariables.ok) {
        return err({ code: 'VARIABLE_INVALID', details: resolvedVariables.error.message });
      }

      const result = await this.generator.generate({
        subjectId,
        topic: safeTopic,
        topicSlug,
        variables: {
          TOPIC: safeTopic,
          TERMINOLOGY_STANDARD: terminologyStandardForSubject(subjectId),
          ...resolvedVariables.value,
        },
        rawTemplate: template.template,
        templateSemver: template.semver,
        isInteractive: template.isInteractive ?? false,
      });

      return result.ok
        ? ok(result.value.output)
        : err(result.error);
    } catch (e) {
      return err({ code: 'GENERATION_FAILED', details: (e as Error).message });
    }
  }
}
