'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { usePlausible } from 'next-plausible';
import { LLMApp, openLLMApp } from '@/lib/deep-links';
import { triggerFeedback } from '@/lib/haptics';

interface DeepLinkButtonProps {
  textToCopy: string;
  subjectId: string;
  topic: string;
  targetApp: LLMApp;
  label: string;
  icon?: React.ReactNode;
}

export default function DeepLinkButton({ 
  textToCopy, 
  subjectId, 
  topic, 
  targetApp, 
  label,
  icon
}: DeepLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const plausible = usePlausible();

  const handleAction = async () => {
    triggerFeedback(15);
    setLoading(true);
    const success = await copyToClipboard(textToCopy);
    
    plausible('deep_link_attempt', {
      props: { subject: subjectId, topic, targetApp, copySuccess: success }
    });

    if (success) {
      // Small delay to let the user see the button active state
      setTimeout(() => {
        openLLMApp(targetApp, textToCopy);
        setLoading(false);
      }, 300);
    } else {
      setLoading(false);
      // Fallback is handled by the main CopyButton manual textarea
    }
  };

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="flex-1 bg-white/60 hover:bg-white/95 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/70 text-zinc-800 dark:text-zinc-100 font-semibold py-4 px-6 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 disabled:opacity-60 disabled:pointer-events-none select-none backdrop-blur-sm"
    >
      {icon}
      <span>{loading ? 'Opening...' : label}</span>
    </button>
  );
}
