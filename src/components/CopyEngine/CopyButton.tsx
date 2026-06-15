'use client';

import React, { useReducer, useEffect } from 'react';
import { copyReducer } from './CopyButton.reducer';
import { copyToClipboard } from '@/lib/clipboard';
import { ManualCopySheet } from '../ManualCopySheet/ManualCopySheet';
import * as Icons from 'lucide-react';

export interface CopyButtonProps {
  textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
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

  return (
    <>
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition-colors flex items-center gap-2"
        aria-label="Copy prompt to clipboard"
      >
        <span aria-live="polite" className="sr-only">
          {state.status === 'success' ? 'Copied!' : ''}
        </span>
        {state.status === 'success' ? (
          <>
            <Icons.Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Icons.Copy className="w-4 h-4" />
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
