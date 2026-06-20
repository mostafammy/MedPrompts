'use client';

import React, { useState } from 'react';
import { motion, MotionValue, useTransform, useMotionValueEvent } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Subject } from './SubjectGrid/SubjectGridClient';

interface SwipeIndicatorProps {
  dragX: MotionValue<number>;
  direction: 'left' | 'right';
  targetSubject: Subject | null;
  isDragging: boolean;
  isLoading?: boolean;
}

export function SwipeIndicator({ dragX, direction, targetSubject, isDragging, isLoading = false }: SwipeIndicatorProps) {
  const THRESHOLD = 80; // px activation threshold
  const isRight = direction === 'right';

  // Map dragX to progress [0, 1]
  const progress = useTransform(dragX, (value) => {
    if (isRight) {
      const absVal = Math.min(Math.abs(Math.min(value, 0)), THRESHOLD);
      return absVal / THRESHOLD;
    } else {
      const absVal = Math.min(Math.max(value, 0), THRESHOLD);
      return absVal / THRESHOLD;
    }
  });

  // Elastic pill width: Starts as a perfect circle (48px), stretches elastically to a pill (96px)
  const width = useTransform(progress, [0, 1], [48, 96]);
  
  // Opacity: Fades in smoothly as you pull
  const opacity = useTransform(progress, [0, 0.3], [0, 1]);

  // Translation: Pull inward to visually detach from the edge
  const translateX = useTransform(progress, [0, 1], [0, isRight ? -24 : 24]);

  const [isArmed, setIsArmed] = useState(false);
  useMotionValueEvent(progress, 'change', (latest) => {
    setIsArmed(latest >= 1);
  });

  let TargetIcon: any = null;
  if (targetSubject?.icon) {
    const iconName = targetSubject.icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    TargetIcon = (Icons as any)[iconName] || Icons.CircleHelp;
  }

  // Idle breathing animation for discoverability
  const idleTransition = {
    repeat: Infinity,
    duration: 3,
    ease: 'easeInOut' as const,
  };

  const iconX = useTransform(progress, [0, 1], [0, isRight ? -14 : 14]);
  const chevronX = useTransform(progress, [0, 1], [0, isRight ? 14 : -14]);

  return (
    <motion.div
      style={{
        opacity: isLoading ? 1 : (isDragging ? opacity : 0),
        width: isLoading ? 48 : (isDragging ? width : 48),
        x: isLoading ? (isRight ? -24 : 24) : (isDragging ? translateX : 0),
      }}
      animate={
        !isDragging && !isLoading && targetSubject
          ? {
              opacity: [0.15, 0.4, 0.15],
              x: isRight ? [-12, -6, -12] : [12, 6, 12], // Peek inward from the edges
            }
          : {}
      }
      transition={!isDragging && !isLoading ? idleTransition : { type: 'spring', stiffness: 350, damping: 25 }}
      className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none flex items-center justify-center rounded-full 
        backdrop-blur-3xl border shadow-2xl transition-colors duration-300 h-12 overflow-hidden
        ${isRight ? 'right-2 sm:right-6 md:-right-24' : 'left-2 sm:left-6 md:-left-24'}
        ${
          !targetSubject
            ? 'bg-zinc-100/40 dark:bg-zinc-900/40 border-zinc-200/30 dark:border-zinc-800/30 text-zinc-400'
            : isArmed || isLoading
            ? 'bg-gradient-to-tr from-blue-500 to-indigo-500 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-white'
            : 'bg-white/80 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 shadow-zinc-200/50 dark:shadow-none'
        }
      `}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {!targetSubject ? (
          <Lock className="w-5 h-5 opacity-50" />
        ) : isLoading ? (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Stunning spinner ring wrapping the icon */}
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="absolute inset-1 rounded-full border-[2.5px] border-transparent border-t-white/90 border-r-white/90"
            />
            <motion.div 
              animate={{ scale: [0.9, 1.1, 0.9] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="flex items-center justify-center w-6 h-6 filter drop-shadow-sm text-zinc-800 dark:text-white"
            >
              {TargetIcon && <TargetIcon className="w-full h-full" />}
            </motion.div>
          </div>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Center-anchored Icon */}
            <motion.div 
              style={{ x: iconX }}
              className="absolute flex items-center justify-center w-6 h-6 drop-shadow-sm text-zinc-800 dark:text-white"
              animate={isArmed ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {TargetIcon && <TargetIcon className="w-full h-full" />}
            </motion.div>

            {/* Center-anchored Chevron that splits apart */}
            <motion.div
              style={{ x: chevronX, opacity: progress, scale: progress }}
              className="absolute flex items-center justify-center text-zinc-800 dark:text-white"
            >
              <motion.div
                animate={isArmed ? { x: isRight ? [0, 4, 0] : [0, -4, 0] } : {}}
                transition={isArmed ? { repeat: Infinity, duration: 0.8, ease: 'easeOut' } : {}}
              >
                {isRight ? <ChevronRight className="w-6 h-6 stroke-[3]" /> : <ChevronLeft className="w-6 h-6 stroke-[3]" />}
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
