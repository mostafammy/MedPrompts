'use client';

import { useState, useEffect, useRef } from 'react';

export function useContainerScrollDirection(ref: React.RefObject<HTMLDivElement | null>) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const currentScrollY = el.scrollTop;
      
      // If user scrolled down by more than 15px and is not right at the top
      if (currentScrollY > lastScrollY.current + 15 && currentScrollY > 50) {
        setIsVisible(false);
      } 
      // If user scrolled up by more than 15px or is back near the top
      else if (currentScrollY < lastScrollY.current - 15 || currentScrollY <= 10) {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [ref]);

  return isVisible;
}
