'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isFeedbackEnabled, setFeedbackEnabled, triggerFeedback } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(() => 
    typeof window !== 'undefined' ? isFeedbackEnabled() : true
  );
  const [mounted, setMounted] = useState(false);

  // Sync state on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleToggle = () => {
    const nextState = !enabled;
    setFeedbackEnabled(nextState);
    setEnabled(nextState);
    
    if (nextState) {
      // Play a quick confirmation feedback
      setTimeout(() => {
        triggerFeedback(15);
      }, 50);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none pointer-events-auto">
      <button
        onClick={handleToggle}
        className="group flex items-center gap-2 p-3 rounded-full bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:bg-white/85 dark:hover:bg-zinc-900/75 transition-all duration-300 active:scale-95 cursor-pointer outline-none focus:ring-4 focus:ring-blue-500/10"
        title={enabled ? 'Mute Haptic Feedback' : 'Unmute Haptic Feedback'}
      >
        <div className="text-zinc-650 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-150 transition-colors">
          {enabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          )}
        </div>
        
        <AnimatePresence initial={false}>
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="overflow-hidden whitespace-nowrap text-[11px] font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors pr-1"
          >
            {enabled ? 'Tactile On' : 'Tactile Muted'}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
