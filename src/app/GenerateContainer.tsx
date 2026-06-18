'use client';

import React, { useTransition } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { useRouter, useSearchParams } from 'next/navigation';
import { slugifyTopic } from '@/lib/prompts/slugifier';
import { motion } from 'framer-motion';

export function GenerateContainer({ subjectId: serverSubjectId }: { subjectId: SubjectId | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientSubjectId = (searchParams.get('subject') as SubjectId) || serverSubjectId;
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (topic: string) => {
    if (!clientSubjectId) return;
    
    const slug = slugifyTopic(topic);
    
    startTransition(() => {
      router.push(`/${clientSubjectId}/${slug}`);
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      <TopicInput key={clientSubjectId || 'none'} subjectId={clientSubjectId} onGenerate={handleGenerate} />
      
      {isPending && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 flex flex-col items-center justify-center space-y-6"
        >
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Glowing Aura Rings */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-blue-500/30 dark:border-blue-400/20 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 blur-md"
            />
            <motion.div 
              animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-indigo-400/40 dark:border-indigo-400/30 bg-gradient-to-bl from-indigo-500/10 to-purple-500/10 blur-sm"
            />
            {/* Core Spark */}
            <motion.div 
              animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"
            />
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-zinc-800 dark:text-zinc-200 font-bold text-lg mb-1">Synthesizing Prompt</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm animate-pulse">Consulting medical frameworks...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
