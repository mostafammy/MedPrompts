'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, duration = 2000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 400); // Wait for spring slide out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div 
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-spring ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
      }`}
      role="alert"
    >
      <div className="bg-zinc-900/90 dark:bg-zinc-100/95 backdrop-blur-md text-white dark:text-zinc-950 px-5 py-2.5 rounded-full shadow-xl shadow-zinc-950/10 dark:shadow-none border border-zinc-800/10 dark:border-zinc-200/20 font-semibold text-sm flex items-center gap-2 select-none">
        <div className="bg-emerald-500/15 dark:bg-emerald-500/10 p-0.5 rounded-full text-emerald-500 dark:text-emerald-600">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <span>{message}</span>
      </div>
    </div>
  );
}
