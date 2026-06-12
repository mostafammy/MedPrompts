'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubjectId, SUBJECTS } from '@/lib/subjects';
import { generatePromptAction } from '@/app/actions';
import TurnstileWidget from './TurnstileWidget';
import { X, Sparkles, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerFeedback } from '@/lib/haptics';

interface TopicInputSheetProps {
  subjectId: SubjectId;
  onClose?: () => void;
}

const SUGGESTED_TOPICS: Record<SubjectId, string[]> = {
  anatomy: ['Circle of Willis', 'Brachial Plexus', 'Cranial Nerves'],
  histology: ['Epithelial Tissue', 'Skeletal Muscle', 'Glomerulus'],
  physiology: ['Cardiac Cycle', 'Nephron Filtration', 'Action Potential'],
  microbiology: ['Gram Stain', 'Bacterial Cell Wall', 'Viral Replication'],
  pathology: ['Acute Inflammation', 'Atherosclerosis', 'Myocardial Infarction'],
  parasitology: ['Malaria Life Cycle', 'Giardiasis', 'Amoebiasis'],
};

export default function TopicInputSheet({ subjectId, onClose }: TopicInputSheetProps) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => 
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const requireTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isOffline) return;
    
    triggerFeedback(20);
    
    if (requireTurnstile && !turnstileToken) {
      setError('Verifying security... Please wait.');
      return;
    }

    setError('');
    
    startTransition(async () => {
      const result = await generatePromptAction(subjectId, topic, turnstileToken || 'dev-bypass');
      
      if (result.success && result.slug) {
        router.push(`/${subjectId}/${result.slug}`);
      } else {
        setError(result.error || 'Failed to generate prompt.');
      }
    });
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  if (!subject) return null;

  return (
    <motion.div 
      layoutId={`subject-card-${subjectId}`}
      className="fixed inset-x-0 bottom-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] p-6 pt-4 sm:pt-8 sm:relative sm:rounded-3xl sm:p-8 sm:w-full sm:max-w-md mx-auto sm:shadow-2xl border-t sm:border border-zinc-200/85 dark:border-zinc-800/80 overflow-hidden"
    >
      {/* iOS-Style Drag Handle for Mobile Sheets */}
      <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden select-none" />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {subject.label}
        </h2>
        <button 
          onClick={() => {
            triggerFeedback(10);
            handleClose();
          }}
          className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 p-1.5 rounded-full transition-all duration-200 active:scale-90"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-zinc-550 dark:text-zinc-450 mb-2.5">
            What topic are you studying?
          </label>
          
          {/* Suggested Topics Pills */}
          <div className="flex flex-wrap gap-2 mb-3.5 select-none">
            {SUGGESTED_TOPICS[subjectId]?.map((sTopic) => (
              <button
                key={sTopic}
                type="button"
                onClick={() => {
                  triggerFeedback(10);
                  setTopic(sTopic);
                }}
                className="text-[11px] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 text-zinc-605 dark:text-zinc-400 px-2.5 py-1 rounded-full transition-all cursor-pointer border border-zinc-200/50 dark:border-zinc-800/50 active:scale-95 duration-200"
                disabled={isPending || isOffline}
              >
                {sTopic}
              </button>
            ))}
          </div>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Myocardial Infarction"
            maxLength={120}
            autoFocus
            className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all duration-300"
            disabled={isPending}
            required
          />
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 select-none">
            <span>Max 120 characters</span>
            {topic.length > 0 && (
              <span className={`transition-colors duration-200 ${topic.length > 100 ? 'text-amber-500 dark:text-amber-400 font-bold' : ''}`}>
                {topic.length}/120
              </span>
            )}
          </div>
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
          disabled={!topic.trim() || isPending || isOffline || (requireTurnstile && !turnstileToken)}
          className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all duration-500 ease-spring shadow-lg shadow-blue-500/10 dark:shadow-none active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Generating...</span>
            </>
          ) : isOffline ? (
            <>
              <WifiOff className="w-4.5 h-4.5" />
              <span>Offline — Connection Required</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Prompt</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
