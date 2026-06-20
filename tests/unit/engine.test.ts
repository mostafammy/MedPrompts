import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreGenerator } from '../../src/lib/prompts/core-generator';
import { CachingDecorator } from '../../src/lib/prompts/caching-decorator';
import { AnalyticsDecorator } from '../../src/lib/prompts/analytics-decorator';
import { PromptEngine, EngineEnv } from '../../src/lib/prompts/engine';
import { TopicNormalizationPipeline } from '../../src/lib/prompts/pipeline';
import { createInMemoryCache } from '../../src/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '../../src/lib/prompts/normalizer/cache';
import { noopAnalytics } from '../../src/lib/analytics';
import { SubjectId, Slug } from '../../src/lib/types/branded';
import { StubVersionReader } from '../../src/lib/prompts/version-reader';
import { StubVersionWriter } from '../../src/lib/prompts/version-writer';
import { StubVersionActivator } from '../../src/lib/prompts/version-activator';
import { ok } from '../../src/lib/types/result';
import type { PromptTemplate } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/client', () => ({
  Database: class {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const validTemplate = `
## Section 1
Content about {{TOPIC}} with enough words to meet the minimum threshold.
Let me add more text here to ensure we pass the word count validation.
One two three four five six seven eight nine ten eleven twelve thirteen.

## Section 2
More content here for the second section.

## Section 3
Final section content.

⚠️ Verify this information with a medical professional.
`;

const interactiveTemplate = 'Teach {{TOPIC}} in {{OUTPUT_LANGUAGE}}. This is a sufficiently long interactive template that actually has enough words to pass the minimum word count validation for interactive mode without any issues at all. One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty one twenty two twenty three twenty four twenty five.';

const subjectId = 'anatomy' as SubjectId;
const topicSlug = 'plexus-brachialis' as Slug;

describe('CoreGenerator', () => {
  const generator = new CoreGenerator();

  it('should inject variables and return success for valid template', async () => {
    const result = await generator.generate({
      subjectId,
      topic: 'Plexus brachialis',
      topicSlug: 'plexus-brachialis' as Slug,
      variables: { OUTPUT_LANGUAGE: 'German' },
      rawTemplate: validTemplate,
      templateSemver: '1.0.0',
      isInteractive: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.output).toContain('Plexus brachialis');
    }
  });

  it('should reject a template that fails validation', async () => {
    const template = 'Too short';
    const result = await generator.generate({
      subjectId,
      topic: 'test',
      topicSlug: 'test' as Slug,
      variables: {},
      rawTemplate: template,
      templateSemver: '1.0.0',
      isInteractive: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEMPLATE_MALFORMED');
    }
  });

  it('should accept an interactive template without headers', async () => {
    const result = await generator.generate({
      subjectId,
      topic: 'Heart',
      topicSlug: 'heart' as Slug,
      variables: { OUTPUT_LANGUAGE: 'German' },
      rawTemplate: interactiveTemplate,
      templateSemver: '1.0.0',
      isInteractive: true,
    });
    expect(result.ok).toBe(true);
  });
});

describe('CachingDecorator', () => {
  it('should call inner generator on cache miss and return cached on second call', async () => {
    const inner = new CoreGenerator();
    const cache = createInMemoryCache();
    const decorator = new CachingDecorator(inner, cache);

    const result = await decorator.generate({
      subjectId,
      topic: 'Diabetes',
      topicSlug: 'diabetes' as Slug,
      variables: { OUTPUT_LANGUAGE: 'Spanish' },
      rawTemplate: interactiveTemplate,
      templateSemver: '1.0.0',
      isInteractive: true,
    });

    expect(result.ok).toBe(true);

    const spy = vi.spyOn(inner, 'generate');
    const cachedResult = await decorator.generate({
      subjectId,
      topic: 'Diabetes',
      topicSlug: 'diabetes' as Slug,
      variables: { OUTPUT_LANGUAGE: 'Spanish' },
      rawTemplate: interactiveTemplate,
      templateSemver: '1.0.0',
      isInteractive: true,
    });
    expect(spy).not.toHaveBeenCalled();
    expect(cachedResult.ok).toBe(true);
  });
});

describe('AnalyticsDecorator', () => {
  it('should track analytics on successful generation', async () => {
    const inner = new CoreGenerator();
    const analytics = { ...noopAnalytics, trackPromptGenerated: vi.fn() };
    const decorator = new AnalyticsDecorator(inner, analytics);

    await decorator.generate({
      subjectId,
      topic: 'Heart',
      topicSlug: 'heart' as Slug,
      variables: { OUTPUT_LANGUAGE: 'German' },
      rawTemplate: interactiveTemplate,
      templateSemver: '1.0.0',
      isInteractive: true,
    });

    expect(analytics.trackPromptGenerated).toHaveBeenCalledTimes(1);
    expect(analytics.trackPromptGenerated).toHaveBeenCalledWith(
      subjectId,
      expect.any(String),
      expect.any(Number)
    );
  });
});

describe('PromptEngine (integration)', () => {
  const dummyEnv: EngineEnv = { hasApiKey: false, userPlan: 'free' };

  function createEngine(
    db: any,
    promptCache: ReturnType<typeof createInMemoryCache>,
    pipeline: TopicNormalizationPipeline,
    template?: Partial<PromptTemplate>
  ) {
    const reader = new StubVersionReader();
    if (template) {
      reader.withActive(subjectId, {
        id: '1',
        subjectId,
        template: validTemplate,
        version: 1,
        semver: '1.0.0',
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
        checksum: '',
        isActive: true,
        createdAt: new Date(),
        changelog: null,
        isInteractive: false,
        requiredVariables: [],
        ...template,
      } as PromptTemplate);
    }
    const writer = new StubVersionWriter(ok({} as PromptTemplate));
    const activator = new StubVersionActivator();

    return new PromptEngine(db, promptCache, pipeline, noopAnalytics, reader, writer, activator);
  }

  it('should return SUBJECT_NOT_FOUND if no template is active', async () => {
    const promptCache = createInMemoryCache();
    const normCache = new NormalizerCache(createInMemoryCacheStore());
    const pipeline = new TopicNormalizationPipeline([], normCache);
    const engine = createEngine({} as any, promptCache, pipeline);

    const result = await engine.generatePrompt(subjectId, 'New Topic', {}, dummyEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SUBJECT_NOT_FOUND');
    }
  });

  it('should follow full generation flow and cache result', async () => {
    const promptCache = createInMemoryCache();
    const normCache = new NormalizerCache(createInMemoryCacheStore());
    const pipeline = new TopicNormalizationPipeline([], normCache);

    const trackSpy = vi.spyOn(noopAnalytics, 'trackPromptGenerated');

    const engine = createEngine({} as any, promptCache, pipeline, {});

    const result = await engine.generatePrompt(subjectId, 'Myocardial Infarction', {}, dummyEnv);

    expect(result.ok).toBe(true);

    const secondResult = await engine.generatePrompt(subjectId, 'Myocardial Infarction', {}, dummyEnv);
    expect(secondResult.ok).toBe(true);
    if (secondResult.ok && result.ok) {
      expect(secondResult.value).toBe(result.value);
    }

    expect(trackSpy).toHaveBeenCalledTimes(2);
  });
});
