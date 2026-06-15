import React from 'react';
import { CopyButton } from '../CopyEngine/CopyButton';

export interface PromptDisplayProps {
  prompt: string;
  subject: string;
  topic: string;
  wordCount: number;
  fromCache: boolean;
}

export function PromptDisplay({ prompt, subject, topic, wordCount, fromCache }: PromptDisplayProps) {
  return (
    <article aria-label={`${subject} prompt for ${topic}`} className="w-full max-w-4xl mx-auto mt-12 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {topic}
          </h2>
          <p className="text-sm text-slate-500 capitalize">{subject}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-full">
            {wordCount} words
          </span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${fromCache ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
            {fromCache ? '⚡ Cached' : '✨ Generated'}
          </span>
        </div>
      </div>
      
      <CopyButton textToCopy={prompt} />
      
      <div className="p-6 bg-slate-50 max-h-[600px] overflow-y-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700">
          <code>{prompt}</code>
        </pre>
      </div>
    </article>
  );
}
