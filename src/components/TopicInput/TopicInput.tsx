'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { abbreviationNormalizer } from '@/lib/prompts/normalizer/abbreviation';
import * as Icons from 'lucide-react';

export interface TopicInputProps {
  subjectId: SubjectId | null;
  onGenerate: (topic: string) => void;
}

export function TopicInput({ subjectId, onGenerate }: TopicInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync suggestion click to the DOM input value and state
  const handleApplyHint = (suggestion: string) => {
    setInputValue(suggestion);
    setHint(null);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.trim() === '') {
        setHint(null);
        return;
      }
      if (!subjectId) return;
      
      const result = await abbreviationNormalizer.normalize(inputValue, { subjectId, raw: inputValue });
      if (result.confidence >= 0.9 && result.cleaned !== inputValue) {
        setHint(result.cleaned);
      } else {
        setHint(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, subjectId]);

  // Reset input field when selected subject changes
  useEffect(() => {
    setInputValue('');
    setHint(null);
  }, [subjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || inputValue.trim() === '') return;
    onGenerate(inputValue);
  };

  if (!subjectId) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-4 p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-sm text-center animate-fade-in">
        <Icons.HelpCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          No Subject Selected
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-sm mx-auto">
          Please click on one of the core subjects above to unlock the medical prompt generator.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-100 dark:shadow-none transition-all duration-300 animate-fade-in">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
            Specify Topic
          </label>
          <div className="relative group">
            {/* pointer-events-none prevents overlays from blocking focus clicks */}
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors">
              <Icons.BookOpen className="w-5 h-5" />
            </div>
            
            <textarea
              id="topic-input"
              value={inputValue}
              onChange={(e) => {
                const target = e.target;
                let val = target.value;
                if (val.length > 120) {
                  val = val.slice(0, 120);
                }
                setInputValue(val);
              }}
              aria-describedby="topic-hint"
              rows={3}
              className="w-full pl-12 pr-20 py-4 rounded-xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-base outline-none transition-all duration-300 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/10 resize-none"
              placeholder="e.g. Myocardial Infarction, MI, Asthma"
            />
            
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 px-2 py-1 rounded">
              {inputValue.length}/120
            </div>
          </div>
        </div>

        {hint && (
          <div id="topic-hint" className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 ml-1 animate-fade-in">
            <Icons.Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Did you mean:</span>
            <button 
              type="button" 
              onClick={() => handleApplyHint(hint)} 
              className="font-bold underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              {hint}
            </button>
            <span>?</span>
          </div>
        )}

        <button
          type="submit"
          disabled={inputValue.trim() === ''}
          className="mt-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-zinc-200 disabled:to-zinc-200 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/15 disabled:shadow-none hover:shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <Icons.Sparkles className="w-5 h-5 shrink-0" />
          Generate Prompt
        </button>
      </form>
    </div>
  );
}
