import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SubjectId, Topic } from '@/lib/types/branded';
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

const GenerateRequestSchema = z.object({
  subjectId: z.string() as unknown as z.ZodType<SubjectId>,
  topic: z.string() as unknown as z.ZodType<Topic>,
  variables: z.record(z.string(), z.string()).optional().default({}),
});

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { subjectId, topic, variables } = parsed.data;
    const e = getEngine();
    const env: EngineEnv = { hasApiKey: false, userPlan: 'free' };
    const result = await e.generatePrompt(subjectId, topic, variables, env);

    if (!result.ok) {
      let status = 500;
      if (result.error.code === 'TOPIC_INVALID') status = 400;
      if (result.error.code === 'SUBJECT_NOT_FOUND') status = 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ prompt: result.value });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
