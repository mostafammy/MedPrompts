'use client';

import React, { useState, useEffect } from 'react';
import { SubjectCard } from './SubjectCard';
import { SubjectId } from '@/lib/types/branded';
import { motion, Variants } from 'framer-motion';

export interface Subject {
  id: string;
  label: string;
  icon: string;
}

export interface SubjectGridClientProps {
  subjects: Subject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
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

export function SubjectGridClient({ subjects, selectedId: serverSelectedId, onSelect }: SubjectGridClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const selectedId = serverSelectedId || null;

  const renderCard = (subject: Subject, isSelected: boolean) => {
    const cardElement = (
      <SubjectCard
        id={subject.id as SubjectId}
        label={subject.label}
        icon={subject.icon}
        isSelected={isSelected}
      />
    );

    return (
      <button 
        type="button"
        onClick={() => {
          if (onSelect) onSelect(subject.id);
        }}
        className="block w-full text-left appearance-none bg-transparent border-none p-0 m-0 outline-none cursor-pointer"
      >
        {cardElement}
      </button>
    );
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

          return (
            <React.Fragment key={subject.id}>
              {renderCard(subject, isSelected)}
            </React.Fragment>
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

        return (
          <motion.div
            key={subject.id}
            variants={itemVariants}
            className="block"
          >
            {renderCard(subject, isSelected)}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
