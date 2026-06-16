'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { copyToClipboard } from '@/lib/clipboard';
import { plausibleAnalytics } from '@/lib/analytics';
import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';

interface DeepLinkButtonProps {
  textToCopy: string;
  subjectId: SubjectId;
  targetApp: 'chatgpt' | 'gemini';
  label: string;
  icon: React.ReactNode;
  isHeaderInline?: boolean;
}

export function DeepLinkButton({ textToCopy, subjectId, targetApp, label, icon, isHeaderInline = false }: DeepLinkButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const handleAction = async () => {
    setStatus('copied');
    
    // Copy the text
    await copyToClipboard(textToCopy);
    
    // Track plausible event
    plausibleAnalytics.trackPromptCopied(subjectId, targetApp);

    // Open target application in new tab with the prompt prefilled in the query parameter ?q
    const url = targetApp === 'chatgpt' 
      ? `https://chatgpt.com/?q=${encodeURIComponent(textToCopy)}` 
      : `https://gemini.google.com/?q=${encodeURIComponent(textToCopy)}`;
    
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.warn('Block popup prevented window open', e);
    }

    setTimeout(() => {
      setStatus('idle');
    }, 2000);
  };

  const baseClass = isHeaderInline
    ? `relative overflow-hidden h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 select-none cursor-pointer w-full sm:w-auto`
    : `px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border shadow-md hover:shadow-lg transition-all duration-300 select-none cursor-pointer w-full sm:w-auto`;

  const colorClass = targetApp === 'chatgpt'
    ? isHeaderInline
      ? 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm shadow-emerald-950/25'
      : 'bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white border-zinc-950 dark:border-zinc-700/80 shadow-zinc-950/20 dark:shadow-none'
    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500/30 shadow-blue-500/10';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleAction}
      className={`${baseClass} ${colorClass}`}
    >
      {status === 'copied' ? (
        <>
          <Icons.Check className={`${isHeaderInline ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 text-emerald-300 animate-pulse`} />
          <span className="text-zinc-100">{isHeaderInline ? 'Opening...' : 'Copied & Opening...'}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{isHeaderInline ? label : `Open in ${label}`}</span>
        </>
      )}
    </motion.button>
  );
}
