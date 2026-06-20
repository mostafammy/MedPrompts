'use client';

import React, { useState, useTransition } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { useRouter } from 'next/navigation';
import { slugifyTopic } from '@/lib/prompts/slugifier';
import { motion } from 'framer-motion';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { CustomSelect } from '@/components/ui/CustomSelect';
import * as Icons from 'lucide-react';

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
      <div className="w-full max-w-lg mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-1">
          <CustomSelect
            label="Language"
            value={language}
            options={OUTPUT_LANGUAGES}
            onChange={setLanguage}
            icon={<Icons.Globe className="w-4 h-4" />}
          />
        </div>

        <div className="sm:col-span-2">
          <CustomSelect
            label="Analogy Domain"
            value={analogy}
            options={ANALOGY_DOMAINS}
            onChange={setAnalogy}
            icon={<Icons.Sparkles className="w-4 h-4" />}
          />
        </div>

        <div className="sm:col-span-1">
          <CustomSelect
            label="Max Cycles"
            value={cycles}
            options={REMEDIATION_CYCLES}
            onChange={setCycles}
            icon={<Icons.RotateCw className="w-4 h-4" />}
          />
        </div>
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
