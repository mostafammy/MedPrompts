import { SubjectId, Slug, Topic } from '@/lib/types/branded';
import { PromptEngine, EngineEnv } from '@/lib/prompts/engine';
import { notFound } from 'next/navigation';
import { PromptDisplay } from '@/components/PromptDisplay/PromptDisplay';
import { getDb } from '@/lib/db/get-db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createInMemoryCache } from '@/lib/prompts/cache';
import { NormalizerCache, createInMemoryCacheStore } from '@/lib/prompts/normalizer/cache';
import { TopicNormalizationPipeline } from '@/lib/prompts/pipeline';
import { plausibleAnalytics } from '@/lib/analytics';
import { Metadata } from 'next';
import { slugToTopic } from '@/lib/prompts/slugifier';
import { SubjectGrid } from '@/components/SubjectGrid/SubjectGrid';
import { SwipeableContainer } from '@/components/SwipeableContainer';
import { z } from 'zod';
import { terminologyStandardForSubject } from '@/lib/prompts/medical-tutor-variables';
import { DatabaseVersionReader } from '@/lib/prompts/version-reader';
import { DatabaseVersionWriter } from '@/lib/prompts/version-writer';
import { DatabaseVersionActivator } from '@/lib/prompts/version-activator';
import { SemanticInvalidationStrategy } from '@/lib/prompts/cache-invalidation-strategy';

export const dynamic = 'force-dynamic';

const SearchParamsSchema = z.object({
  lang: z.string().optional().default('German'),
  analogy: z.string().optional().default('Cooking and Culinary Arts'),
  cycles: z.string().optional().default('2'),
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subject: string; topic: string }>;
}): Promise<Metadata> {
  const { subject, topic } = await params;
  const decodedTopic = slugToTopic(topic as Slug);
  const titleCaseTopic = decodedTopic.charAt(0).toUpperCase() + decodedTopic.slice(1);
  return {
    title: `${titleCaseTopic} | ${subject} — MedPrompts`,
    description: `Get a structured study prompt for ${titleCaseTopic} in ${subject} — optimized for medical boards.`,
    openGraph: {
      title: `${titleCaseTopic} | ${subject} — MedPrompts`,
      description: `Get a structured study prompt for ${titleCaseTopic} in ${subject} — optimized for medical boards.`,
      images: [
        {
          url: `/api/og?subject=${subject}&topic=${topic}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titleCaseTopic} | ${subject} — MedPrompts`,
      description: `Get a structured study prompt for ${titleCaseTopic} in ${subject} — optimized for medical boards.`,
    },
  };
}

export async function generateStaticParams() {
  try {
    const db = getDb();
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

export default async function DynamicPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string; topic: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { subject, topic } = await params;
  const rawSearchParams = await searchParams;

  const parsedParams = SearchParamsSchema.safeParse(rawSearchParams);
  const variables = {
    OUTPUT_LANGUAGE: parsedParams.success ? parsedParams.data.lang : 'German',
    ANALOGY_DOMAIN: parsedParams.success ? parsedParams.data.analogy : 'Cooking and Culinary Arts',
    MAX_REMEDIATION_CYCLES: parsedParams.success ? parsedParams.data.cycles : '2',
    TERMINOLOGY_STANDARD: terminologyStandardForSubject(subject),
  };

  const queryString = parsedParams.success
    ? new URLSearchParams(parsedParams.data).toString()
    : '';

  const parsedSubject = SubjectId.parse(subject);
  const parsedSlug = Slug.parse(topic);

  if (!parsedSubject.ok || !parsedSlug.ok) {
    notFound();
  }

  const subjectId = parsedSubject.value;
  const slug = parsedSlug.value;
  const topicName = slugToTopic(slug) as unknown as Topic;

  const engine = getEngine();

  const db = getDb();
  const subjects = await db.query.subjects.findMany({
    where: eq(schema.subjects.isActive, true),
    orderBy: schema.subjects.sortOrder,
  });

  const env: EngineEnv = { hasApiKey: false, userPlan: 'free' };
  const result = await engine.generatePrompt(subjectId, topicName, variables, env);

  if (!result.ok) {
    if (result.error.code === 'SUBJECT_NOT_FOUND' || result.error.code === 'TOPIC_INVALID') {
      notFound();
    }
    throw new Error(`Failed to generate prompt: ${result.error.code}`);
  }

  const promptText = result.value;
  const wordCount = promptText.split(/\s+/).filter(Boolean).length;
  const dir = typeof rawSearchParams.dir === 'string' ? rawSearchParams.dir : undefined;

  return (
    <main className="min-h-[100dvh] p-4 sm:p-8 md:p-24 pt-12 max-w-7xl mx-auto flex flex-col items-center overflow-x-hidden">
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
        <SwipeableContainer subjects={subjects} currentSubjectId={subjectId} topicSlug={slug} searchParams={queryString}>
          <PromptDisplay
            prompt={promptText}
            subject={subjectId}
            topic={slugToTopic(slug)}
            wordCount={wordCount}
            fromCache={false}
            dir={dir}
          />
        </SwipeableContainer>
      </div>
    </main>
  );
}
