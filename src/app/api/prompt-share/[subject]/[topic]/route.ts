import { NextRequest, NextResponse } from 'next/server';
import { SubjectId, Topic, Slug } from '@/lib/types/branded';
import { PromptEngine, EngineEnv } from '@/lib/prompts/engine';
import { TopicNormalizationPipeline } from '@/lib/prompts/pipeline';
import { getDb } from '@/lib/db/get-db';
import { createInMemoryCache } from '@/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '@/lib/prompts/normalizer/cache';
import { plausibleAnalytics } from '@/lib/analytics';
import { DatabaseVersionReader } from '@/lib/prompts/version-reader';
import { DatabaseVersionWriter } from '@/lib/prompts/version-writer';
import { DatabaseVersionActivator } from '@/lib/prompts/version-activator';
import { SemanticInvalidationStrategy } from '@/lib/prompts/cache-invalidation-strategy';
import { slugToTopic } from '@/lib/prompts/slugifier';
import { terminologyStandardForSubject } from '@/lib/prompts/medical-tutor-variables';

let engineInstance: PromptEngine | null = null;

function getEngine(): PromptEngine {
  if (engineInstance) return engineInstance;
  const db = getDb();
  const promptCache = createInMemoryCache();
  const normCache = new NormalizerCache(createInMemoryCacheStore());
  const pipeline = new TopicNormalizationPipeline([], normCache);
  const versionReader = new DatabaseVersionReader(db);
  const versionWriter = new DatabaseVersionWriter(db);
  const versionActivator = new DatabaseVersionActivator(db, promptCache, new SemanticInvalidationStrategy(), plausibleAnalytics);
  engineInstance = new PromptEngine(db, promptCache, pipeline, plausibleAnalytics, versionReader, versionWriter, versionActivator);
  return engineInstance;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subject: string; topic: string }> }
) {
  try {
    const { subject, topic } = await params;
    const parsedSubject = SubjectId.parse(subject);
    const parsedSlug = Slug.parse(topic);

    if (!parsedSubject.ok || !parsedSlug.ok) {
      return new NextResponse('Subject or Topic not found', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || 'German';
    const analogy = searchParams.get('analogy') || 'Cooking and Culinary Arts';
    const cycles = searchParams.get('cycles') || '2';

    const subjectId = parsedSubject.value;
    const slug = parsedSlug.value;
    const topicName = slugToTopic(slug) as unknown as Topic;

    const variables = {
      OUTPUT_LANGUAGE: lang,
      ANALOGY_DOMAIN: analogy,
      MAX_REMEDIATION_CYCLES: cycles,
      TERMINOLOGY_STANDARD: terminologyStandardForSubject(subjectId),
    };

    const engine = getEngine();
    const env: EngineEnv = { hasApiKey: false, userPlan: 'free' };
    const result = await engine.generatePrompt(subjectId, topicName, variables, env);

    if (!result.ok) {
      return new NextResponse(`Failed to generate prompt: ${result.error.code}`, { status: 500 });
    }

    // Return raw plain text response for OpenAI bot to read
    return new NextResponse(result.value, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (err) {
    console.error('Prompt share endpoint error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Internal Server Error: ${message}`, { status: 500 });
  }
}
