'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      setIsOnline(window.navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setShowRestored(true);
        const timer = setTimeout(() => {
          setShowRestored(false);
        }, 3000);
        return () => clearTimeout(timer);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setShowRestored(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {/* Offline Mode Pill */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-4 left-1/2 z-[100] flex items-center gap-2 px-4 py-2 bg-zinc-950/90 dark:bg-zinc-900/90 text-amber-500 dark:text-amber-400 border border-amber-500/30 rounded-full shadow-lg shadow-amber-500/10 backdrop-blur-md text-xs font-semibold select-none pointer-events-none whitespace-nowrap"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <Icons.CloudOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Offline Mode — using cached pages</span>
        </motion.div>
      )}

      {/* Back Online Pill */}
      {isOnline && showRestored && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-4 left-1/2 z-[100] flex items-center gap-2 px-4 py-2 bg-zinc-950/90 dark:bg-zinc-900/90 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 rounded-full shadow-lg shadow-emerald-500/10 backdrop-blur-md text-xs font-semibold select-none pointer-events-none whitespace-nowrap"
        >
          <Icons.CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-bounce" />
          <span>Back Online — connection restored</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
