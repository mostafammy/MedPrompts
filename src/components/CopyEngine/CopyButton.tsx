'use client';

import React, { useReducer, useEffect } from 'react';
import { copyReducer } from './CopyButton.reducer';
import { copyToClipboard } from '@/lib/clipboard';
import { ManualCopySheet } from '../ManualCopySheet/ManualCopySheet';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CopyButtonProps {
  textToCopy: string;
  isHeaderInline?: boolean;
}

const PARTICLE_COUNT = 10;
const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
  const angle = (i * 360) / PARTICLE_COUNT;
  const rad = (angle * Math.PI) / 180;
  const distance = 40 + Math.random() * 30;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    size: 4 + Math.random() * 3,
    color: i % 2 === 0 ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-teal-400 dark:bg-teal-500',
  };
});

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

  // Apple-tier glassmorphic button styles
  const buttonClass = isHeaderInline
    ? `relative overflow-hidden w-full h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-300 select-none cursor-pointer
       ${isSuccess 
         ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
         : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
       }`
    : `relative overflow-hidden px-6 py-3 rounded-full font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 select-none cursor-pointer border
       ${isSuccess 
         ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
         : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-100 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-800/90'
       }`;

  return (
    <div className={isHeaderInline ? "relative w-full h-9" : "relative"}>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleCopy}
        className={buttonClass}
        aria-label="Copy prompt to clipboard"
      >
        <span aria-live="polite" className="sr-only">
          {isSuccess ? 'Copied!' : ''}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {isSuccess ? (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="flex items-center gap-1.5"
            >
              <Icons.Check className={isHeaderInline ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className={isHeaderInline ? 'hidden sm:inline-block' : ''}>Copied</span>
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="flex items-center gap-1.5"
            >
              <Icons.Copy className={isHeaderInline ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className={isHeaderInline ? 'hidden sm:inline-block' : ''}>{isHeaderInline ? 'Copy' : 'Copy Master Prompt'}</span>
            </motion.span>
          )}
        </AnimatePresence>

        {/* Ripple Wave Effect */}
        {isSuccess && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-emerald-500/20 pointer-events-none"
          />
        )}
      </motion.button>

      {/* Particle Spray Celebration (floats outside button boundaries) */}
      {isSuccess && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30" aria-hidden="true">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ 
                x: p.x, 
                y: p.y, 
                scale: [0, 1.2, 0], 
                opacity: [1, 0.8, 0] 
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ width: p.size, height: p.size }}
              className={`absolute rounded-full ${p.color} shadow-sm`}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {state.status === 'manual-fallback' && (
          <ManualCopySheet 
            isOpen={true} 
            onClose={() => dispatch({ type: 'RESET' })}
            textToCopy={textToCopy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
