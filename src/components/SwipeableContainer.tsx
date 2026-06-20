'use client';

import React, { useState } from 'react';
import { motion, PanInfo, useMotionValue } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Subject } from './SubjectGrid/SubjectGridClient';
import { SwipeIndicator } from './SwipeIndicator';

interface SwipeableContainerProps {
  children: React.ReactNode;
  subjects: Subject[];
  currentSubjectId: string;
  topicSlug: string;
  searchParams?: string;
}

export function SwipeableContainer({ children, subjects, currentSubjectId, topicSlug, searchParams }: SwipeableContainerProps) {
  const router = useRouter();
  const dragX = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const swipeThreshold = 80; // px threshold matching indicator visual trigger

  const currentIndex = subjects.findIndex(s => s.id === currentSubjectId);
  const prevSubject = currentIndex > 0 ? subjects[currentIndex - 1] : null;
  const nextSubject = currentIndex < subjects.length - 1 && currentIndex >= 0 ? subjects[currentIndex + 1] : null;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    // Swipe left (next subject)
    if (info.offset.x < -swipeThreshold) {
      if (nextSubject) {
        router.push(`/${nextSubject.id}/${topicSlug}${searchParams ? `?${searchParams}` : ''}`);
      }
    }
    // Swipe right (previous subject)
    else if (info.offset.x > swipeThreshold) {
      if (prevSubject) {
        router.push(`/${prevSubject.id}/${topicSlug}${searchParams ? `?${searchParams}` : ''}`);
      }
    }
  };

  return (
    <div className="relative w-full">
      {/* Edge navigation indicators */}
      <SwipeIndicator
        dragX={dragX}
        direction="left"
        targetSubject={prevSubject}
        isDragging={isDragging}
      />
      <SwipeIndicator
        dragX={dragX}
        direction="right"
        targetSubject={nextSubject}
        isDragging={isDragging}
      />

      <motion.div
        drag="x"
        style={{ x: dragX }}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className="w-full h-full min-h-[50vh] cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
