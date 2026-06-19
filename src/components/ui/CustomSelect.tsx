'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { soundEngine } from '@/lib/audio';

interface CustomSelectProps {
  label: string;
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export function CustomSelect({ label, value, options, onChange, icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    soundEngine.playClick();
    haptics.tap();
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: string) => {
    soundEngine.playSuccess();
    haptics.tap();
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col gap-1.5 select-none">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none pl-1">
        {label}
      </span>
      
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 backdrop-blur-md cursor-pointer ${
          isOpen
            ? 'bg-zinc-150/80 dark:bg-zinc-800/80 border-blue-500/50 text-zinc-900 dark:text-white shadow-lg shadow-blue-500/5'
            : 'bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-150/40 dark:hover:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{icon}</span>}
          <span className="truncate">{value}</span>
        </div>
        <Icons.ChevronDown
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-[calc(100%+4px)] left-0 w-full z-50 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-lg shadow-xl shadow-black/10 dark:shadow-black/30 max-h-60 overflow-y-auto custom-scrollbar"
          >
            {options.map((option) => {
              const isSelected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/10 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-150/60 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {isSelected && <Icons.Check className="w-4 h-4 shrink-0 text-blue-500" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
