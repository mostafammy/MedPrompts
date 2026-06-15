import React from 'react';
import { CopyButton } from '../CopyEngine/CopyButton';
import * as Icons from 'lucide-react';

export interface PromptDisplayProps {
  prompt: string;
  subject: string;
  topic: string;
  wordCount: number;
  fromCache: boolean;
}

export function PromptDisplay({ prompt, subject, topic, wordCount, fromCache }: PromptDisplayProps) {
  return (
    <article 
      aria-label={`${subject} prompt for ${topic}`} 
      className="w-full max-w-4xl mx-auto mt-12 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800/80 overflow-hidden relative transition-all duration-300"
    >
      {/* Terminal Mock Header */}
      <div className="bg-zinc-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          {/* Window Control Dots */}
          <div className="flex gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="h-4 w-[1px] bg-zinc-800 mx-1 hidden sm:block" />
          <div>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <span className="text-blue-400 capitalize">{subject}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-300">{topic}</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="flex gap-2">
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold rounded-lg flex items-center gap-1">
              <Icons.FileText className="w-3.5 h-3.5" />
              {wordCount} words
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 border ${
              fromCache 
                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' 
                : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
            }`}>
              {fromCache ? (
                <>
                  <Icons.Zap className="w-3.5 h-3.5" />
                  Cached
                </>
              ) : (
                <>
                  <Icons.Sparkles className="w-3.5 h-3.5" />
                  Generated
                </>
              )}
            </span>
          </div>
          
          {/* We push the CopyButton inline to the header bar on desktop */}
          <div className="relative h-9 w-24 hidden sm:block">
            <CopyButton textToCopy={prompt} isHeaderInline={true} />
          </div>
        </div>
      </div>
      
      {/* Mobile Copy Button (Absolute inside content body) */}
      <div className="sm:hidden absolute top-[72px] right-4 z-20">
        <CopyButton textToCopy={prompt} isHeaderInline={false} />
      </div>
      
      {/* Code / Prompt Body */}
      <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 max-h-[600px] overflow-y-auto relative">
        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed select-text">
          <code>{prompt}</code>
        </pre>
      </div>
    </article>
  );
}
