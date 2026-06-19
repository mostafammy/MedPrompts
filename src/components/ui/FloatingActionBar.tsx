'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingActionBarProps {
  isVisible: boolean;
  subject: string;
  children: React.ReactNode;
}

export function FloatingActionBar({ isVisible, subject, children }: FloatingActionBarProps) {
  // Map subject to color indicator glow
  const getSubjectGlow = (sub: string) => {
    switch (sub.toLowerCase()) {
      case 'pathology':
        return 'shadow-red-500/10 border-red-500/20';
      case 'anatomy':
        return 'shadow-blue-500/10 border-blue-500/20';
      case 'physiology':
        return 'shadow-emerald-500/10 border-emerald-500/20';
      case 'pharmacology':
        return 'shadow-purple-500/10 border-purple-500/20';
      case 'microbiology':
        return 'shadow-amber-500/10 border-amber-500/20';
      case 'biochemistry':
        return 'shadow-teal-500/10 border-teal-500/20';
      default:
        return 'shadow-blue-500/5 border-zinc-200/50 dark:border-zinc-800/50';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="fixed bottom-6 inset-x-4 z-50 flex items-center justify-center pointer-events-none"
        >
          <div 
            className={`
              pointer-events-auto
              bg-white/45 dark:bg-zinc-950/50 
              backdrop-blur-2xl saturate-150
              border shadow-2xl rounded-full p-2.5 px-4
              flex items-center gap-3.5 w-full max-w-md justify-around 
              relative overflow-hidden transition-all duration-500
              ${getSubjectGlow(subject)}
            `}
          >
            {/* Ambient inner glow reflecting the subject */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-550/5 to-transparent dark:from-zinc-400/5 pointer-events-none" />
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
