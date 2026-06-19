'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { copyToClipboard } from '@/lib/clipboard';
import { plausibleAnalytics } from '@/lib/analytics';
import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/audio';
import { haptics } from '@/lib/haptics';

interface DeepLinkButtonProps {
  textToCopy: string;
  subjectId: SubjectId;
  targetApp: 'chatgpt' | 'gemini';
  label: string;
  icon: React.ReactNode;
  isHeaderInline?: boolean;
  minimal?: boolean;
}

export function DeepLinkButton({ textToCopy, subjectId, targetApp, label, icon, isHeaderInline = false, minimal = false }: DeepLinkButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const handleAction = async () => {
    soundEngine.playClick();
    haptics.tap();
    setStatus('copied');
    
    // Copy the text
    await copyToClipboard(textToCopy);
    soundEngine.playSuccess();
    haptics.success();
    toast.success(`Copied! Opening ${label}...`);
    
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

  const baseClass = minimal
    ? `relative overflow-hidden w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-300 select-none cursor-pointer border-0 bg-transparent text-zinc-550 dark:text-zinc-400 hover:bg-zinc-150 dark:hover:bg-zinc-800`
    : isHeaderInline
    ? `relative overflow-hidden h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 select-none cursor-pointer w-full sm:w-auto`
    : `px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border shadow-md hover:shadow-lg transition-all duration-300 select-none cursor-pointer w-full sm:w-auto`;

  const colorClass = minimal
    ? `${status === 'copied' ? 'text-emerald-500 dark:text-emerald-400' : ''}`
    : targetApp === 'chatgpt'
    ? isHeaderInline
      ? 'bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 hover:text-emerald-100 border-emerald-500/40 hover:border-emerald-400 shadow-sm shadow-emerald-950/30'
      : 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-600 shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-500/20'
    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-500/30 shadow-blue-500/10';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleAction}
      className={`${baseClass} ${colorClass}`}
      title={status === 'copied' ? 'Opening...' : `Open in ${label}`}
    >
      {status === 'copied' ? (
        <>
          <Icons.Check className="w-5 h-5 shrink-0 text-emerald-550 dark:text-emerald-400 animate-pulse" />
          {!minimal && <span className={`text-zinc-100 ${isHeaderInline ? 'hidden sm:inline-block' : ''}`}>{isHeaderInline ? 'Opening...' : 'Copied & Opening...'}</span>}
        </>
      ) : (
        <>
          {icon}
          {!minimal && <span className={isHeaderInline ? 'hidden sm:inline-block' : ''}>{isHeaderInline ? label : `Open in ${label}`}</span>}
        </>
      )}
    </motion.button>
  );
}
