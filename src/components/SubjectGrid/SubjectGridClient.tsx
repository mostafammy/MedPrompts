'use client';

import React, { useState, useEffect } from 'react';
import { SubjectCard } from './SubjectCard';
import { SubjectId } from '@/lib/types/branded';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

export interface Subject {
  id: string;
  label: string;
  icon: string;
}

export interface SubjectGridClientProps {
  subjects: Subject[];
  selectedId?: string | null;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 24 
    } 
  },
};

export function SubjectGridClient({ subjects, selectedId: serverSelectedId }: SubjectGridClientProps) {
  const pathname = usePathname();
  const [clientSelectedId, setClientSelectedId] = useState<string | null>(serverSelectedId || null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

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
  };

  // SSR / Progressive Fallback: Return a static visible grid before client hydration.
  if (!mounted) {
    return (
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full max-w-4xl mx-auto"
        aria-label="Select a medical subject"
      >
        {subjects.map((subject) => {
          const isSelected = selectedId === subject.id;
          const href = getHref(subject.id);

          return (
            <a
              key={subject.id}
              href={href}
              onClick={(e) => handleClick(e, href)}
              className="block no-underline"
            >
              <SubjectCard
                id={subject.id as SubjectId}
                label={subject.label}
                icon={subject.icon}
                isSelected={isSelected}
              />
            </Link>
          );
        })}
      </div>
    );
  }

  // Hydrated state: Beautiful physics-based cascade
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full max-w-4xl mx-auto"
      aria-label="Select a medical subject"
    >
      {subjects.map((subject) => {
        const isSelected = selectedId === subject.id;
        const href = getHref(subject.id);

        return (
          <motion.div
            key={subject.id}
            variants={itemVariants}
            className="block"
          >
            <a
              href={href}
              onClick={(e) => handleClick(e, href)}
              className="block no-underline"
            >
              <SubjectCard
                id={subject.id as SubjectId}
                label={subject.label}
                icon={subject.icon}
                isSelected={isSelected}
              />
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
