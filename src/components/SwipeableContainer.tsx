'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Subject } from './SubjectGrid/SubjectGridClient';
import { SwipeIndicator } from './SwipeIndicator';
import { soundEngine } from '@/lib/audio';
import { haptics } from '@/lib/haptics';

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
  const [isPending, startTransition] = useTransition();
  const [loadingDir, setLoadingDir] = useState<'left' | 'right' | null>(null);

  const swipeThreshold = 80; // px threshold matching indicator visual trigger

  const currentIndex = subjects.findIndex(s => s.id === currentSubjectId);
  const prevSubject = (currentIndex > 0 ? subjects[currentIndex - 1] : null) ?? null;
  const nextSubject = (currentIndex < subjects.length - 1 && currentIndex >= 0 ? subjects[currentIndex + 1] : null) ?? null;

  // Visual Transforms for the dragged card (Apple stack pick-up tilt)
  const rotate = useTransform(dragX, [-400, 400], [-3, 3]);
  const cardScale = useTransform(dragX, [-400, 0, 400], [0.97, 1, 0.97]);

  // Screen Edge Aura Opacity Transforms
  const leftGlowOpacity = useTransform(dragX, [0, swipeThreshold], [0, 0.45]);
  const rightGlowOpacity = useTransform(dragX, [-swipeThreshold, 0], [0.45, 0]);

  // Tactile Haptic Trigger ref
  const hasTriggeredHaptic = useRef(false);

  const handleDrag = (event: any, info: PanInfo) => {
    const absOffset = Math.abs(info.offset.x);
    if (absOffset >= swipeThreshold) {
      if (!hasTriggeredHaptic.current) {
        // Ensure there is a target subject in the drag direction before playing feedback
        const isDraggingLeft = info.offset.x < 0;
        const hasTarget = isDraggingLeft ? !!nextSubject : !!prevSubject;
        
        if (hasTarget) {
          haptics.tap();
          soundEngine.playClick();
          hasTriggeredHaptic.current = true;
        }
      }
    } else {
      if (hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = false;
      }
    }
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    hasTriggeredHaptic.current = false;

    // Swipe left (next subject) -> Fly off-screen leftwards
    if (info.offset.x < -swipeThreshold) {
      if (nextSubject) {
        soundEngine.playSwoop();
        setLoadingDir('right');
        // Flyout transition to the left (matching iOS page stack push)
        await animate(dragX, -window.innerWidth, {
          type: 'spring',
          stiffness: 220,
          damping: 24,
          restDelta: 1
        });
        startTransition(() => {
          router.push(`/${nextSubject.id}/${topicSlug}${searchParams ? `?${searchParams}&dir=next` : '?dir=next'}`);
        });
        return;
      }
    }
    // Swipe right (previous subject) -> Fly off-screen rightwards
    else if (info.offset.x > swipeThreshold) {
      if (prevSubject) {
        soundEngine.playSwoop();
        setLoadingDir('left');
        // Flyout transition to the right (matching iOS page stack pop)
        await animate(dragX, window.innerWidth, {
          type: 'spring',
          stiffness: 220,
          damping: 24,
          restDelta: 1
        });
        startTransition(() => {
          router.push(`/${prevSubject.id}/${topicSlug}${searchParams ? `?${searchParams}&dir=prev` : '?dir=prev'}`);
        });
        return;
      }
    }

    // Default: spring back to normal if threshold wasn't crossed
    animate(dragX, 0, { type: 'spring', stiffness: 300, damping: 25 });
  };

  // Onboard Coach-Mark Bounce Sequence (Once per session)
  useEffect(() => {
    const hasShown = sessionStorage.getItem('medprompts_swipe_bounce_shown');
    if (hasShown) return;

    sessionStorage.setItem('medprompts_swipe_bounce_shown', 'true');

    const runSequence = async () => {
      // Small delay after mount for a clean start
      await new Promise((resolve) => setTimeout(resolve, 800));

      setIsDragging(true);

      // Peek Next (slide left)
      if (nextSubject) {
        await animate(dragX, -45, { type: 'spring', stiffness: 180, damping: 18 });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      
      // Peek Prev (slide right)
      if (prevSubject) {
        await animate(dragX, 45, { type: 'spring', stiffness: 180, damping: 18 });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Settle back to center
      await animate(dragX, 0, { type: 'spring', stiffness: 260, damping: 24 });

      setIsDragging(false);
    };

    runSequence();
  }, [dragX, nextSubject, prevSubject]);

  return (
    <div className="relative w-full">
      {/* Edge Navigation Glow Halos */}
      {prevSubject && (
        <motion.div
          style={{ opacity: leftGlowOpacity }}
          className="fixed inset-y-0 left-0 w-[12%] bg-gradient-to-r from-blue-500/15 via-indigo-500/5 to-transparent blur-2xl pointer-events-none z-30"
        />
      )}
      {nextSubject && (
        <motion.div
          style={{ opacity: rightGlowOpacity }}
          className="fixed inset-y-0 right-0 w-[12%] bg-gradient-to-l from-blue-500/15 via-indigo-500/5 to-transparent blur-2xl pointer-events-none z-30"
        />
      )}

      {/* Edge navigation indicators */}
      <SwipeIndicator
        dragX={dragX}
        direction="left"
        targetSubject={prevSubject}
        isDragging={isDragging || loadingDir === 'left'}
        isLoading={loadingDir === 'left'}
      />
      <SwipeIndicator
        dragX={dragX}
        direction="right"
        targetSubject={nextSubject}
        isDragging={isDragging || loadingDir === 'right'}
        isLoading={loadingDir === 'right'}
      />

      <motion.div
        drag={!isPending ? "x" : false}
        style={{ x: dragX, rotate, scale: cardScale }}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="w-full h-full min-h-[50vh] cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
