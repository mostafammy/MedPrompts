'use client';

import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    haptics.tap();
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {
        console.warn('Theme storage failed:', e);
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {
        console.warn('Theme storage failed:', e);
      }
    }
    
    setTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 w-10 h-10 rounded-full border border-zinc-200/50 bg-white/50 opacity-0" />
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      type="button"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 sm:p-3 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-md sm:shadow-lg backdrop-blur-md cursor-pointer transition-colors duration-300 flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Icons.Sun className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-500" />
      ) : (
        <Icons.Moon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-indigo-600" />
      )}
    </motion.button>
  );
}
