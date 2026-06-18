'use client';

import { useEffect, useRef } from 'react';

export function usePullToClear<T extends HTMLElement>(onClear: () => void) {
  const ref = useRef<T>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && e.touches[0]) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      if (e.touches[0]) {
        currentY.current = e.touches[0].clientY;
      }
      const pullDistance = currentY.current - startY.current;

      // If pulling down when already at top
      if (pullDistance > 0 && el.scrollTop <= 0) {
        // We prevent default to avoid pull-to-refresh on mobile browsers if needed,
        // but since this is passive by default on some browsers, we just track it.
        // We'll let CSS handle overscroll-behavior: none on the container.
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      const pullDistance = currentY.current - startY.current;

      if (pullDistance > 100) {
        onClear();
      }

      isPulling.current = false;
      startY.current = 0;
      currentY.current = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClear]);

  return ref;
}
