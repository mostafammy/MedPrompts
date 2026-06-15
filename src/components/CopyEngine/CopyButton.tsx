'use client';

import React, { useReducer, useEffect } from 'react';
import { copyReducer } from './CopyButton.reducer';
import { copyToClipboard } from '@/lib/clipboard';
import { ManualCopySheet } from '../ManualCopySheet/ManualCopySheet';
import * as Icons from 'lucide-react';

export interface CopyButtonProps {
  textToCopy: string;
  isHeaderInline?: boolean;
}

export function CopyButton({ textToCopy, isHeaderInline = false }: CopyButtonProps) {
  const [state, dispatch] = useReducer(copyReducer, { status: 'idle' });

  useEffect(() => {
    if (state.status === 'success') {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  const handleCopy = async () => {
    dispatch({ type: 'COPY_STARTED' });
    const success = await copyToClipboard(textToCopy);
    if (success) {
      dispatch({ type: 'COPY_SUCCESS' });
    } else {
      dispatch({ type: 'COPY_MANUAL' });
    }
  };

  const isSuccess = state.status === 'success';

  // Styles based on location
  const buttonClass = isHeaderInline
    ? `w-full h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 select-none cursor-pointer
       ${isSuccess 
         ? 'bg-emerald-950/40 border-emerald-500/35 text-emerald-400' 
         : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300'
       }`
    : `px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200 shadow-md backdrop-blur-sm select-none cursor-pointer
       ${isSuccess 
         ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' 
         : 'bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
       }`;

  return (
    <>
      <button
        onClick={handleCopy}
        className={buttonClass}
        aria-label="Copy prompt to clipboard"
      >
        <span aria-live="polite" className="sr-only">
          {isSuccess ? 'Copied!' : ''}
        </span>
        {isSuccess ? (
          <>
            <Icons.Check className="w-3.5 h-3.5 shrink-0" />
            Copied
          </>
        ) : (
          <>
            <Icons.Copy className="w-3.5 h-3.5 shrink-0" />
            Copy
          </>
        )}
      </button>

      <ManualCopySheet 
        isOpen={state.status === 'manual-fallback'} 
        onClose={() => dispatch({ type: 'RESET' })}
        textToCopy={textToCopy}
      />
    </>
  );
}
