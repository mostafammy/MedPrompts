'use client';

import React, { useState } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { PromptDisplay } from '@/components/PromptDisplay/PromptDisplay';

export function GenerateContainer({ subjectId }: { subjectId: SubjectId | null }) {
  const [result, setResult] = useState<{
    prompt: string;
    slug: string;
    topic: string;
    wordCount: number;
    fromCache: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (topic: string) => {
    if (!subjectId) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, topic }),
      });

      const data = await res.json() as { error?: { message?: string } | string; prompt?: typeof result };

      if (!res.ok) {
        const errMsg = typeof data.error === 'object' ? data.error?.message : data.error;
        throw new Error(errMsg || 'Failed to generate prompt');
      }

      setResult(data.prompt ?? null); // Note: backend returns { prompt: { prompt: "...", slug: "...", wordCount: ... } }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <TopicInput subjectId={subjectId} onGenerate={handleGenerate} />
      
      {isLoading && (
        <div className="mt-8 p-8 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Generating your comprehensive study prompt...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl max-w-2xl w-full text-center">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && !isLoading && (
        <PromptDisplay
          prompt={result.prompt}
          subject={subjectId!}
          topic={result.topic}
          wordCount={result.wordCount}
          fromCache={result.fromCache}
        />
      )}
    </div>
  );
}
