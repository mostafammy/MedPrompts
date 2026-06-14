'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { usePlausible } from 'next-plausible';
import Toast from './Toast';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { triggerFeedback } from '@/lib/haptics';
import { AnimatePresence, motion } from 'framer-motion';

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
    triggerFeedback(15);
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
        className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/10 dark:shadow-none hover:shadow-xl hover:shadow-blue-500/15 dark:hover:shadow-none transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 select-none`}
      >
        {copied ? (
          <>
            <Check className="w-5 h-5 animate-scale-in" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" />
            <span>Copy Prompt</span>
          </>
        )}
      </button>

      {copied && <Toast message="Copied to clipboard!" onClose={() => setCopied(false)} duration={2000} />}

      <AnimatePresence>
        {manualFallback && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            className="overflow-hidden"
          >
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2.5 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Auto-copy disabled by your browser. Please copy manually below:
            </p>
            <textarea
              readOnly
              value={textToCopy}
              className="w-full h-36 p-4 text-sm font-mono rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 text-zinc-850 dark:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all duration-300"
              onFocus={(e) => e.target.select()}
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
