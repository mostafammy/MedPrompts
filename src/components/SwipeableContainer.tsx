'use client';

import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Subject } from './SubjectGrid/SubjectGridClient';

interface SwipeableContainerProps {
  children: React.ReactNode;
  subjects: Subject[];
  currentSubjectId: string;
  topicSlug: string;
  searchParams?: string;
}

export function SwipeableContainer({ children, subjects, currentSubjectId, topicSlug, searchParams }: SwipeableContainerProps) {
  const router = useRouter();

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50; // px
    
    // Swipe left (next)
    if (info.offset.x < -swipeThreshold) {
      const currentIndex = subjects.findIndex(s => s.id === currentSubjectId);
      if (currentIndex >= 0 && currentIndex < subjects.length - 1) {
        const nextSubject = subjects[currentIndex + 1];
        if (nextSubject) router.push(`/${nextSubject.id}/${topicSlug}${searchParams ? `?${searchParams}` : ''}`);
      }
    }
    // Swipe right (previous)
    else if (info.offset.x > swipeThreshold) {
      const currentIndex = subjects.findIndex(s => s.id === currentSubjectId);
      if (currentIndex > 0) {
        const prevSubject = subjects[currentIndex - 1];
        if (prevSubject) router.push(`/${prevSubject.id}/${topicSlug}${searchParams ? `?${searchParams}` : ''}`);
      }
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="w-full h-full min-h-[50vh] cursor-grab active:cursor-grabbing touch-pan-y"
    >
      {children}
    </motion.div>
  );
}
