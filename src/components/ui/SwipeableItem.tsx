'use client';

import React, { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import * as Icons from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { soundEngine } from '@/lib/audio';

interface SwipeableItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void; // Usually Delete
  onSwipeRight?: () => void; // Usually Bookmark
  leftActionComponent?: React.ReactNode; // Revealed when swiping left (e.g. Delete icon)
  rightActionComponent?: React.ReactNode; // Revealed when swiping right (e.g. Bookmark icon)
  swipeThreshold?: number;
}

export function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionComponent,
  rightActionComponent,
  swipeThreshold = 100,
}: SwipeableItemProps) {
  const controls = useAnimation();
  const [isSwiping, setIsSwiping] = useState(false);

  const handleDragEnd = async (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (onSwipeLeft && (offset < -swipeThreshold || velocity < -500)) {
      haptics.warning();
      soundEngine.playSwoop();
      
      // Animate off screen then trigger action
      await controls.start({ x: -1000, transition: { duration: 0.2 } });
      onSwipeLeft();
    } else if (onSwipeRight && (offset > swipeThreshold || velocity > 500)) {
      haptics.success();
      soundEngine.playClick();
      
      // Animate off screen then trigger action (if it dismisses, or just spring back if it just toggles)
      // Usually bookmarking in recent doesn't remove it from recent, it just adds to saved.
      // So let's just spring back for swipe right
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      onSwipeRight();
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
    
    // Slight delay to prevent clicks firing on drag end
    setTimeout(() => setIsSwiping(false), 50);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      {/* Background layer for Swipe Left (Delete) */}
      {onSwipeLeft && (
        <div className="absolute inset-0 bg-red-500 flex justify-end items-center px-6 rounded-2xl">
          {leftActionComponent || <Icons.Trash2 className="w-6 h-6 text-white" />}
        </div>
      )}

      {/* Background layer for Swipe Right (Bookmark/Action) */}
      {onSwipeRight && (
        <div className="absolute inset-0 bg-blue-500 flex justify-start items-center px-6 rounded-2xl">
          {rightActionComponent || <Icons.Star className="w-6 h-6 text-white" />}
        </div>
      )}

      {/* The Swipable Content Layer */}
      <motion.div
        className="relative z-10 w-full h-full bg-transparent"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsSwiping(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        // Tailwind classes shouldn't override the style transforms applied by motion
        style={{ touchAction: 'pan-y' }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <div className={`pointer-events-${isSwiping ? 'none' : 'auto'} w-full h-full bg-transparent`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
