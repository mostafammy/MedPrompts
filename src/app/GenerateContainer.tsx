'use client';

import React, { useState, useTransition } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { useRouter } from 'next/navigation';
import { slugifyTopic } from '@/lib/prompts/slugifier';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

const VariableDefaults = {
  OUTPUT_LANGUAGE: 'German',
  ANALOGY_DOMAIN: 'Cooking and Culinary Arts',
  MAX_REMEDIATION_CYCLES: '2',
} as const;

const OUTPUT_LANGUAGES = ['German', 'English', 'Spanish', 'French', 'Arabic'] as const;
const ANALOGY_DOMAINS = [
  'Cooking and Culinary Arts',
  'Construction and Architecture',
  'Music and Orchestra',
  'Sports and Athletics',
  'Transportation and Mechanics',
] as const;
const REMEDIATION_CYCLES = ['1', '2', '3', '4', '5'] as const;

const VariableSchema = z.object({
  lang: z.enum(OUTPUT_LANGUAGES).default('German'),
  analogy: z.enum(ANALOGY_DOMAINS).default('Cooking and Culinary Arts'),
  cycles: z.enum(REMEDIATION_CYCLES).default('2'),
});

export function GenerateContainer({ subjectId }: { subjectId: SubjectId | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [language, setLanguage] = useState<string>(VariableDefaults.OUTPUT_LANGUAGE);
  const [analogy, setAnalogy] = useState<string>(VariableDefaults.ANALOGY_DOMAIN);
  const [cycles, setCycles] = useState<string>(VariableDefaults.MAX_REMEDIATION_CYCLES);

  const handleGenerate = (topic: string) => {
    if (!subjectId) return;
    const slug = slugifyTopic(topic);

    const params = new URLSearchParams();
    params.set('lang', language);
    params.set('analogy', analogy);
    params.set('cycles', cycles);

    startTransition(() => {
      router.push(`/${subjectId}/${slug}?${params.toString()}`);
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-lg mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {OUTPUT_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Analogy Domain</span>
          <select
            value={analogy}
            onChange={(e) => setAnalogy(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {ANALOGY_DOMAINS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Max Cycles</span>
          <select
            value={cycles}
            onChange={(e) => setCycles(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {REMEDIATION_CYCLES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <TopicInput key={subjectId || 'none'} subjectId={subjectId} onGenerate={handleGenerate} />

      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 w-full max-w-lg space-y-4"
        >
          <div className="flex flex-col items-center mb-2">
            <h3 className="text-zinc-800 dark:text-zinc-200 font-bold text-lg mb-1">Synthesizing Prompt</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm animate-pulse">Consulting medical frameworks...</p>
          </div>
          <SkeletonLoader variant="prompt" />
        </motion.div>
      )}
    </div>
  );
}
