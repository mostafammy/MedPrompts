'use client';

import React, { useTransition } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { useRouter } from 'next/navigation';
import { slugifyTopic } from '@/lib/prompts/slugifier';

export function GenerateContainer({ subjectId }: { subjectId: SubjectId | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (topic: string) => {
    if (!subjectId) return;
    
    const slug = slugifyTopic(topic);
    
    startTransition(() => {
      router.push(`/${subjectId}/${slug}`);
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      <TopicInput key={subjectId || 'none'} subjectId={subjectId} onGenerate={handleGenerate} />
      
      {isPending && (
        <div className="mt-8 p-8 flex flex-col items-center justify-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your comprehensive study prompt...</p>
        </div>
      )}
    </div>
  );
}
