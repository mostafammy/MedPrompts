import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SubjectId, Topic } from '@/lib/types/branded';
import { PromptEngine } from '@/lib/prompts/engine';
import { TopicNormalizationPipeline } from '@/lib/prompts/pipeline';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/db/schema';
import { createInMemoryCache } from '@/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '@/lib/prompts/normalizer/cache';
import { plausibleAnalytics } from '@/lib/analytics';

export const runtime = 'edge';

const GenerateRequestSchema = z.object({
  subjectId: z.string() as unknown as z.ZodType<SubjectId>,
  topic: z.string() as unknown as z.ZodType<Topic>
});

let engine: PromptEngine | null = null;

function getEngine() {
  if (engine) return engine;

  const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client, { schema });

  // In a real edge deployment we'd wire this to KV bindings
  const promptCache = createInMemoryCache();
  const normCache = new NormalizerCache(createInMemoryCacheStore());

  const pipeline = new TopicNormalizationPipeline([], normCache);
  
  engine = new PromptEngine(db, promptCache, pipeline, plausibleAnalytics);
  return engine;
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
