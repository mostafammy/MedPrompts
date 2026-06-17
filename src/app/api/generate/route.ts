import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SubjectId, Topic } from '@/lib/types/branded';
import { PromptEngine } from '@/lib/prompts/engine';
import { TopicNormalizationPipeline } from '@/lib/prompts/pipeline';
import { getDb } from '@/lib/db/get-db';
import { createInMemoryCache } from '@/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '@/lib/prompts/normalizer/cache';
import { plausibleAnalytics } from '@/lib/analytics';


const GenerateRequestSchema = z.object({
  subjectId: z.string() as unknown as z.ZodType<SubjectId>,
  topic: z.string() as unknown as z.ZodType<Topic>
});

function getEngine() {
  const db = getDb();
  const promptCache = createInMemoryCache();
  const normCache = new NormalizerCache(createInMemoryCacheStore());
  const pipeline = new TopicNormalizationPipeline([], normCache);
  return new PromptEngine(db, promptCache, pipeline, plausibleAnalytics);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { subjectId, topic } = parsed.data;

    const e = getEngine();
    
    const env = { hasApiKey: false, userPlan: 'free' as const };
    
    const result = await e.generatePrompt(subjectId, topic, env);

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
