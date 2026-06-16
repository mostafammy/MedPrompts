import { SubjectId, Slug, Topic } from '@/lib/types/branded';
import { PromptEngine } from '@/lib/prompts/engine';
import { notFound } from 'next/navigation';
import { PromptDisplay } from '@/components/PromptDisplay/PromptDisplay';
import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createInMemoryCache } from '@/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '@/lib/prompts/normalizer/cache';
import { TopicNormalizationPipeline } from '@/lib/prompts/pipeline';
import { plausibleAnalytics } from '@/lib/analytics';
import { Metadata } from 'next';
import { slugToTopic } from '@/lib/prompts/slugifier';
import { SubjectGrid } from '@/components/SubjectGrid/SubjectGrid';

export const dynamic = 'force-static';
export const revalidate = 3600; // ISR: revalidate every 1 hour

function getEngine() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required');
  }

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
  const db = drizzle(client, { schema });

  const promptCache = createInMemoryCache();
  const normCache = new NormalizerCache(createInMemoryCacheStore());
  const pipeline = new TopicNormalizationPipeline([], normCache);
  
  return new PromptEngine(db, promptCache, pipeline, plausibleAnalytics);
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string; topic: string }> }): Promise<Metadata> {
  const { subject, topic } = await params;
  const decodedTopic = slugToTopic(topic as Slug);
  const titleCaseTopic = decodedTopic.charAt(0).toUpperCase() + decodedTopic.slice(1);
  const title = `${titleCaseTopic} | ${subject} — MedPrompts`;
  const description = `Get a structured study prompt for ${titleCaseTopic} in ${subject} — optimized for medical boards.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?subject=${subject}&topic=${topic}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export async function generateStaticParams() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return [];

  const client = createClient({ url, ...(authToken ? { authToken } : {}) });
  const db = drizzle(client, { schema });

  try {
    const highYieldTopics = await db.query.topicsSeed.findMany({
      where: eq(schema.topicsSeed.isHighYield, true),
      limit: 100,
    });

    return highYieldTopics.map((topicItem) => ({
      subject: topicItem.subjectId,
      topic: topicItem.slug,
    }));
  } catch (err) {
    console.warn('Could not fetch static params.', err);
    return [];
  }
}

export default async function DynamicPromptPage({ params }: { params: Promise<{ subject: string; topic: string }> }) {
  const { subject, topic } = await params;
  
  const parsedSubject = SubjectId.parse(subject);
  const parsedSlug = Slug.parse(topic);

  if (!parsedSubject.ok || !parsedSlug.ok) {
    notFound();
  }

  const subjectId = parsedSubject.value;
  const slug = parsedSlug.value;
  const topicName = slugToTopic(slug) as unknown as Topic;

  const engine = getEngine();

  const env = { hasApiKey: false, userPlan: 'free' as const };
  const result = await engine.generatePrompt(subjectId, topicName, env);

  if (!result.ok) {
    if (result.error.code === 'SUBJECT_NOT_FOUND' || result.error.code === 'TOPIC_INVALID') {
      notFound();
    }
    throw new Error(`Failed to generate prompt: ${result.error.code}`);
  }

  const promptText = result.value;
  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  // `engine.generatePrompt` handles cache internally but doesn't return boolean flag currently
  const fromCache = false;

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-24 pt-12 max-w-7xl mx-auto flex flex-col items-center overflow-x-hidden">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4 transition-colors">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
            Promptica
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 font-medium max-w-2xl mx-auto balance-text">
          Your Medical Study Prompt
        </p>
      </div>

      <SubjectGrid variant="compact" />

      <div className="w-full">
        <PromptDisplay
          prompt={promptText}
          subject={subjectId}
          topic={slugToTopic(slug)}
          wordCount={wordCount}
          fromCache={fromCache}
        />
      </div>
    </main>
  );
}
