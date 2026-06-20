'use client';

import React from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Subject } from './SubjectGrid/SubjectGridClient';

interface SwipeIndicatorProps {
  dragX: MotionValue<number>;
  direction: 'left' | 'right';
  targetSubject: Subject | null;
  isDragging: boolean;
}

export function SwipeIndicator({ dragX, direction, targetSubject, isDragging }: SwipeIndicatorProps) {
  const THRESHOLD = 80; // px activation threshold
  const isRight = direction === 'right';

  // Map dragX to progress [0, 1] for the threshold gauge
  // dragX < 0 is Swipe Left (reveals Next subject on the right)
  // dragX > 0 is Swipe Right (reveals Prev subject on the left)
  const progress = useTransform(dragX, (value) => {
    if (isRight) {
      // Swiping left (negative dragX)
      const absVal = Math.min(Math.abs(Math.min(value, 0)), THRESHOLD);
      return absVal / THRESHOLD;
    } else {
      // Swiping right (positive dragX)
      const absVal = Math.min(Math.max(value, 0), THRESHOLD);
      return absVal / THRESHOLD;
    }
  });

  // Calculate SVG stroke offset: circumference for r=14 is 2 * PI * 14 = 87.96
  const strokeDashoffset = useTransform(progress, [0, 1], [88, 0]);

  // Opacity: Gradually fades in as user drags.
  // If targetSubject is null, cap opacity lower to look disabled/locked.
  const maxOpacity = targetSubject ? 1.0 : 0.25;
  const opacity = useTransform(dragX, (value) => {
    if (isDragging) {
      if (isRight) {
        if (value >= 0) return 0;
        const absVal = Math.min(Math.abs(value), THRESHOLD);
        return (absVal / THRESHOLD) * maxOpacity;
      } else {
        if (value <= 0) return 0;
        const absVal = Math.min(value, THRESHOLD);
        return (absVal / THRESHOLD) * maxOpacity;
      }
    }
    return 0;
  });

  // Scale: dynamic grow effect
  const scale = useTransform(progress, [0, 1], [0.9, 1.05]);

  // Translation: pull effect inward
  const translateX = useTransform(progress, (p) => {
    const pullOffset = p * 12; // pull 12px inward
    if (isRight) {
      return -pullOffset; // pull left
    } else {
      return pullOffset; // pull right
    }
  });

  // Text container width for slide-out reveal (from 0 to 120px)
  const textWidth = useTransform(progress, [0, 0.45, 1], ['0px', '110px', '130px']);
  const textOpacity = useTransform(progress, [0.2, 0.5], [0, 1]);

  // Handle active states when threshold is crossed
  const isArmed = useTransform(progress, (p) => p >= 1);

  // If not dragging, we show a very subtle, elegant breathing hint on desktop/mobile
  const idleTransition = {
    repeat: Infinity,
    duration: 3,
    ease: 'easeInOut',
  };

  return (
    <motion.div
      style={{
        opacity: isDragging ? opacity : 0,
        scale: isDragging ? scale : 1,
        x: isDragging ? translateX : 0,
      }}
      animate={
        !isDragging
          ? {
              opacity: [0.08, 0.2, 0.08],
              x: isRight ? [0, -3, 0] : [0, 3, 0],
            }
          : {}
      }
      transition={!isDragging ? idleTransition : { type: 'spring', stiffness: 350, damping: 28 }}
      className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none hidden md:flex items-center gap-2.5 p-1.5 pr-3 rounded-full 
        backdrop-blur-xl border shadow-lg transition-all duration-300
        ${isRight ? 'right-4 md:-right-24 flex-row-reverse pl-3 pr-1.5' : 'left-4 md:-left-24 pl-1.5 pr-3'}
        ${
          targetSubject
            ? 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-800 dark:text-zinc-200 shadow-zinc-200/40 dark:shadow-none'
            : 'bg-zinc-100/40 dark:bg-zinc-950/40 border-zinc-200/30 dark:border-zinc-800/30 text-zinc-400 dark:text-zinc-650 shadow-none'
        }
      `}
    >
      {/* SVG Circular Progress Ring & Icon */}
      <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* Background Track */}
          <circle
            cx="18"
            cy="18"
            r="14"
            className="text-zinc-200/50 dark:text-zinc-800/30"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
          />
          {/* Active progress bar */}
          {targetSubject && (
            <motion.circle
              cx="18"
              cy="18"
              r="14"
              style={{ strokeDashoffset }}
              className="text-blue-600 dark:text-blue-500"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray="88"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Central Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {targetSubject ? (
            isRight ? (
              <ChevronRight className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            )
          ) : (
            <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-550" />
          )}
        </div>

        {/* Outer Glow Pulsing Ring (shows when armed/crossed threshold) */}
        {targetSubject && (
          <motion.div
            style={{
              opacity: isArmed ? 1 : 0,
              scale: isArmed ? [1, 1.15, 1] : 1,
            }}
            animate={
              isDragging
                ? {}
                : {
                    scale: 1,
                  }
            }
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full border border-blue-500/50 dark:border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.5)] dark:shadow-[0_0_8px_rgba(96,165,250,0.4)] pointer-events-none"
          />
        )}
      </div>

      {/* Target Subject Label & Icon */}
      <motion.div
        style={{
          width: isDragging ? textWidth : 'auto',
          opacity: isDragging ? textOpacity : 0.8,
        }}
        className="overflow-hidden flex items-center gap-1.5 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wider select-none"
      >
        {targetSubject ? (
          <>
            <span className="text-sm leading-none">{targetSubject.icon}</span>
            <span className="truncate max-w-[90px]">{targetSubject.label}</span>
          </>
        ) : (
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">End of List</span>
        )}
      </motion.div>
    </motion.div>
  );
}
