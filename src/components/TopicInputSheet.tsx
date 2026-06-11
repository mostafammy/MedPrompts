'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SubjectId, SUBJECTS } from '@/lib/subjects';
import { generatePromptAction } from '@/app/actions';
import TurnstileWidget from './TurnstileWidget';

interface TopicInputSheetProps {
  subjectId: SubjectId;
  onClose?: () => void;
}

export default function TopicInputSheet({ subjectId, onClose }: TopicInputSheetProps) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const requireTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    // We only enforce Turnstile if it's configured
    if (requireTurnstile && !turnstileToken) {
      setError('Verifying security... Please wait.');
      return;
    }

    setError('');
    
    startTransition(async () => {
      const result = await generatePromptAction(subjectId, topic, turnstileToken || 'dev-bypass');
      
      if (result.success && result.slug) {
        // Navigate to the generated prompt page
        router.push(`/${subjectId}/${result.slug}`);
      } else {
        setError(result.error || 'Failed to generate prompt.');
      }
    });
  };

  if (!subject) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl p-6 sm:relative sm:rounded-2xl sm:p-8 sm:w-full sm:max-w-md mx-auto sm:shadow-xl sm:border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {subject.label}
        </h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-full transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            What topic are you studying?
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Myocardial Infarction"
            maxLength={120}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            disabled={isPending}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
        )}

        {requireTurnstile && (
          <TurnstileWidget 
            onVerify={setTurnstileToken} 
            onError={() => setError('Security check failed.')} 
            onExpire={() => setTurnstileToken(null)}
          />
        )}

        <button
          type="submit"
          disabled={!topic.trim() || isPending || (requireTurnstile && !turnstileToken)}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm disabled:shadow-none"
        >
          {isPending ? 'Generating...' : 'Generate Prompt'}
        </button>
      </form>
    </div>
  );
}
