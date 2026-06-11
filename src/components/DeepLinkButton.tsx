'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { usePlausible } from 'next-plausible';
import { LLMApp, openLLMApp } from '@/lib/deep-links';

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
    setLoading(true);
    const success = await copyToClipboard(textToCopy);
    
    plausible('deep_link_attempt', {
      props: { subject: subjectId, topic, targetApp, copySuccess: success }
    });

    if (success) {
      // Small delay to let the user see the button active state
      setTimeout(() => {
        openLLMApp(targetApp);
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
      className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold py-4 px-6 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700 disabled:opacity-70"
    >
      {icon}
      {loading ? 'Opening...' : label}
    </button>
  );
}
