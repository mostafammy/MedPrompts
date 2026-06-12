'use client';

import { SUBJECTS, getSubject } from '@/lib/subjects';
import SubjectTile from './SubjectTile';
import TopicInputSheet from './TopicInputSheet';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function SubjectGrid() {
  const sortedSubjects = [...SUBJECTS].sort((a, b) => a.sortOrder - b.sortOrder);
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedSubjectId = searchParams.get('subject');
  const selectedSubject = selectedSubjectId ? getSubject(selectedSubjectId) : undefined;

  useEffect(() => {
    if (!selectedSubject) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/', { scroll: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSubject, router]);

  return (
    <div className="w-full relative">
      <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mx-auto px-4 py-8 transition-all duration-500 ${selectedSubject ? 'opacity-40 blur-[2px] pointer-events-none' : ''}`}>
        {sortedSubjects.map((subject, index) => (
          <div
            key={subject.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <SubjectTile subject={subject} />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-xs flex items-end sm:items-center sm:justify-center p-4"
          >
            <div 
              onClick={() => router.push('/', { scroll: false })} 
              className="absolute inset-0 cursor-default" 
              aria-label="Close modal" 
            />
            <div className="relative z-50 w-full max-w-md">
              <TopicInputSheet subjectId={selectedSubject.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
