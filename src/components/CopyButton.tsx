'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { usePlausible } from 'next-plausible';
import Toast from './Toast';

interface CopyButtonProps {
  textToCopy: string;
  subjectId: string;
  topic: string;
}

export default function CopyButton({ textToCopy, subjectId, topic }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);
  const plausible = usePlausible();

  const handleCopy = async () => {
    const success = await copyToClipboard(textToCopy);
    
    if (success) {
      setCopied(true);
      plausible('copy_prompt', {
        props: { subject: subjectId, topic: topic, method: 'auto' }
      });
    } else {
      setManualFallback(true);
      plausible('copy_prompt', {
        props: { subject: subjectId, topic: topic, method: 'manual' }
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <button
        onClick={handleCopy}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Prompt
          </>
        )}
      </button>

      {copied && <Toast message="Copied to clipboard!" onClose={() => setCopied(false)} duration={2000} />}

      {manualFallback && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Auto-copy disabled by your browser. Please copy manually below:
          </p>
          <textarea
            readOnly
            value={textToCopy}
            className="w-full h-32 p-3 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-zinc-800 dark:text-zinc-200 focus:ring-amber-500"
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
