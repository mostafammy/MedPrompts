'use client';

import React, { useReducer, useEffect, useState } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { topicInputReducer } from './TopicInput.reducer';
import { abbreviationNormalizer } from '@/lib/prompts/normalizer/abbreviation';

export interface TopicInputProps {
  subjectId: SubjectId | null;
  onGenerate: (topic: string) => void;
}

export function TopicInput({ subjectId, onGenerate }: TopicInputProps) {
  const [state, dispatch] = useReducer(topicInputReducer, { status: 'idle' });
  const [inputValue, setInputValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    dispatch({ type: 'INPUT_CHANGED', value: inputValue });
    
    if (inputValue.trim() === '') {
      setHint(null);
      return;
    }

    const timer = setTimeout(async () => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || inputValue.trim() === '') return;
    onGenerate(inputValue);
  };

  const isError = state.status === 'error';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mt-8 flex flex-col gap-2">
      <label htmlFor="topic-input" className="text-sm font-semibold text-slate-700 ml-1">
        Topic
      </label>
      <div className="relative">
        <input
          id="topic-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, 120))}
          aria-describedby="topic-hint"
          className={`w-full p-4 rounded-xl border-2 shadow-sm text-lg outline-none transition-colors
            ${isError ? 'border-red-500 focus:border-red-600' : 'border-slate-300 focus:border-blue-500'}
          `}
          placeholder="e.g. Myocardial Infarction, MI, Asthma"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {inputValue.length}/120
        </div>
      </div>
      
      {isError && (
        <div role="alert" className="text-red-600 text-sm ml-1">
          {state.status === 'error' ? state.reason : 'Invalid topic'}
        </div>
      )}

      {hint && (
        <div id="topic-hint" className="text-sm text-blue-600 ml-1">
          Did you mean:{' '}
          <button 
            type="button" 
            onClick={() => setInputValue(hint)} 
            className="font-semibold underline hover:text-blue-800"
          >
            {hint}
          </button>
          ?
        </div>
      )}

      <button
        type="submit"
        disabled={!subjectId || inputValue.trim() === ''}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-sm"
      >
        Generate Prompt
      </button>
    </form>
  );
}
