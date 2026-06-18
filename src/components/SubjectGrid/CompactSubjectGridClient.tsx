'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Subject } from './SubjectGridClient';
import { SubjectCard } from './SubjectCard';
import { SubjectId } from '@/lib/types/branded';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { soundEngine } from '@/lib/audio';

export interface CompactSubjectGridClientProps {
  subjects: Subject[];
  selectedId?: string | null;
}

export function CompactSubjectGridClient({ subjects, selectedId: serverSelectedId }: CompactSubjectGridClientProps) {
  const pathname = usePathname();
  const [clientSelectedId, setClientSelectedId] = useState<string | null>(serverSelectedId || null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setClientSelectedId(params.get('subject') || serverSelectedId || null);
    };
    syncUrl();
    window.addEventListener('popstate', syncUrl);
    return () => window.removeEventListener('popstate', syncUrl);
  }, [serverSelectedId]);

  const segments = pathname.split('/').filter(Boolean);
  const selectedId = clientSelectedId;

  const getHref = (id: string) => {
    const isTopicPage = segments.length >= 2;
    const targetPathname = isTopicPage ? '/' : pathname;
    return targetPathname + '?subject=' + encodeURIComponent(id);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    window.history.pushState(null, '', href);
    window.dispatchEvent(new Event('popstate'));
    setIsOpen(false);
  };

  return (
    <div 
      className="relative z-50 flex justify-center w-full my-4 sm:my-6"
      onMouseEnter={() => {
        if (!isOpen) soundEngine.playSwoop();
        setIsOpen(true);
      }}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => {
        if (!isOpen) soundEngine.playSwoop();
        setIsOpen(true);
      }}
      onBlur={() => setIsOpen(false)}
      ref={containerRef}
    >
      {/* Idle State: Small Pill */}
      <motion.button 
        className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all outline-none focus:ring-2 focus:ring-blue-500/50 cursor-default"
        whileTap={{ scale: 0.98 }}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Change Subject</span>
        <div className="flex -space-x-2">
          {subjects.slice(0, 4).map((subject, _i) => {
             const iconName = subject.icon.split('-').map((p:string) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
             const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.CircleHelp;
             return (
               <div key={subject.id} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-50 dark:border-zinc-950 flex items-center justify-center text-zinc-600 dark:text-zinc-400 z-[4-i]">
                 <IconComponent className="w-4 h-4" />
               </div>
             )
          })}
          {subjects.length > 4 && (
             <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-50 dark:border-zinc-950 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-[10px] font-bold z-0">
               +{subjects.length - 4}
             </div>
          )}
        </div>
      </motion.button>

      {/* Expanded State: Popover Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 8, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute top-full left-1/2 -translate-x-1/2 w-[95vw] max-w-4xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-6 rounded-3xl shadow-2xl z-50"
          >
            <div className="mb-4 text-center">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Select a Subject</h3>
              <p className="text-xs text-zinc-500">Switching will return you to the generator.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {subjects.map((subject) => {
                const isSelected = selectedId === subject.id;
                const href = getHref(subject.id);
                return (
                  <a
                    key={subject.id}
                    href={href}
                    onClick={(e) => handleClick(e, href)}
                    className="block no-underline outline-none rounded-3xl focus:ring-2 focus:ring-blue-500"
                    role="menuitem"
                  >
                    <SubjectCard
                      id={subject.id as SubjectId}
                      label={subject.label}
                      icon={subject.icon}
                      isSelected={isSelected}
                    />
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
