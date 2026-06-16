'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { abbreviationNormalizer } from '@/lib/prompts/normalizer/abbreviation';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TopicInputProps {
  subjectId: SubjectId | null;
  onGenerate: (topic: string) => void;
}

export function TopicInput({ subjectId, onGenerate }: TopicInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (subjectId && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [subjectId]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

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
  const getGhostSuggestion = () => {
    if (!hint || !inputValue || inputValue.length >= hint.length) return '';
    if (hint.toLowerCase().startsWith(inputValue.toLowerCase())) {
      return hint.slice(inputValue.length);
    }
    return '';
  };
  const ghostSuggestion = getGhostSuggestion();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete on Tab or on ArrowRight (only if cursor is at the end)
    if (
      (e.key === 'Tab' || (e.key === 'ArrowRight' && e.currentTarget.selectionStart === inputValue.length)) &&
      hint
    ) {
      e.preventDefault();
      setInputValue(hint);
      setHint(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || inputValue.trim() === '') return;
    onGenerate(inputValue);
  };

  if (!subjectId) {
    if (!mounted) {
      return (
        <div className="w-full max-w-2xl mx-auto mt-4 p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-md text-center">
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
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-2xl mx-auto mt-4 p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-md text-center"
      >
        <Icons.HelpCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          No Subject Selected
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-sm mx-auto">
          Please click on one of the core subjects above to unlock the medical prompt generator.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-2xl mx-auto mt-4 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-xl saturate-150 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-zinc-200/50 dark:shadow-none transition-all duration-300"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
            Specify Topic
          </label>
          <div className="relative group">
            {/* pointer-events-none prevents overlays from blocking focus clicks */}
            <div className="pointer-events-none absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-300">
              <Icons.BookOpen className="w-5 h-5" />
            </div>
            
            {/* Ghost text autocomplete overlay */}
            {ghostSuggestion && (
              <div 
                className="absolute inset-0 pointer-events-none pl-12 pr-20 py-4 font-sans text-base leading-normal text-zinc-300 dark:text-zinc-700 whitespace-pre-wrap select-none overflow-hidden"
                aria-hidden="true"
              >
                {/* Mirror typed text transparently */}
                <span className="opacity-0">{inputValue}</span>
                {/* Visual suggestion tail */}
                <span className="text-zinc-400 dark:text-zinc-500">{ghostSuggestion}</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
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
              onKeyDown={handleKeyDown}
              aria-describedby="topic-hint"
              rows={3}
              className="w-full pl-12 pr-20 py-4 rounded-2xl border bg-white/50 dark:bg-zinc-950/50 text-zinc-900 dark:text-zinc-50 text-base leading-normal outline-none transition-all duration-300 border-zinc-200/80 dark:border-zinc-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/10 resize-none shadow-inner font-sans"
              placeholder="e.g. Myocardial Infarction, MI, Asthma"
            />
            
            <div className="pointer-events-none absolute right-4 top-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 px-2 py-1 rounded-md backdrop-blur-sm">
              {inputValue.length}/120
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hint && (
            <motion.div 
              id="topic-hint" 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl shadow-inner backdrop-blur-md">
                <div className="p-1.5 bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                  <Icons.Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-tight">
                  Did you mean <span className="font-bold text-blue-600 dark:text-blue-400">{hint}</span>?
                </div>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button" 
                  onClick={() => handleApplyHint(hint)} 
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer select-none transition-colors duration-300 flex items-center gap-1 shrink-0"
                >
                  <Icons.Check className="w-3.5 h-3.5" />
                  Apply
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: inputValue.trim() === '' ? 1 : 0.98 }}
          type="submit"
          disabled={inputValue.trim() === ''}
          className="mt-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-zinc-200 disabled:to-zinc-200 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:shadow-none hover:shadow-blue-500/30 flex items-center justify-center gap-2"
        >
          <Icons.Sparkles className="w-5 h-5 shrink-0" />
          Generate Prompt
        </motion.button>
      </form>
    </motion.div>
  );
}
