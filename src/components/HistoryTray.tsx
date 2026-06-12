'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HistoryItem, getHistory } from '@/lib/history';
import { triggerFeedback } from '@/lib/haptics';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const subjectBadgeStyles: Record<string, string> = {
  anatomy: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/15',
  histology: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/15',
  physiology: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/15',
  microbiology: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15',
  pathology: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15',
  parasitology: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15',
};

export default function HistoryTray() {
  const [history, setHistory] = useState<HistoryItem[]>(() => 
    typeof window !== 'undefined' ? getHistory() : []
  );
  const [mounted, setMounted] = useState(false);

  const loadHistory = () => {
    setHistory(getHistory());
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });

    // Listen to custom updates dispatched when new generations happen
    window.addEventListener('medprompt_history_updated', loadHistory);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('medprompt_history_updated', loadHistory);
    };
  }, []);

  if (!mounted || history.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-6 sm:mt-10 select-none">
      <div className="bg-white/40 dark:bg-zinc-900/15 border border-zinc-200/40 dark:border-zinc-800/40 backdrop-blur-md rounded-[28px] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            Recently Generated
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {history.map((item, index) => {
              const badgeStyle = subjectBadgeStyles[item.subjectId] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border-zinc-200';
              return (
                <motion.div
                  key={`${item.subjectId}-${item.slug}-${item.timestamp}`}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24, delay: index * 0.03 }}
                  layoutId={`history-${item.subjectId}-${item.slug}`}
                >
                  <Link
                    href={`/${item.subjectId}/${item.slug}`}
                    onClick={() => triggerFeedback(10)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/70 hover:bg-white/95 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/70 text-xs font-medium text-zinc-850 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800/60 transition-all duration-300 active:scale-[0.97]"
                  >
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${badgeStyle}`}>
                      {item.subjectLabel}
                    </span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {item.topic}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
