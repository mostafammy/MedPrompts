'use client';

import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { haptics } from '@/lib/haptics';

export interface SubjectCardProps {
  id: SubjectId;
  label: string;
  icon: string;
  isSelected: boolean;
  onSelect?: () => void;
}

interface SubjectTheme {
  glowFrom: string;
  glowTo: string;
  selectedCard: string;
  selectedIcon: string;
  hoverIcon: string;
  hoverBorder: string;
  hoverScale: number;
  spring: {
    stiffness: number;
    damping: number;
  };
}

const pathologyTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-red-500/5',
  glowTo: 'group-hover:to-rose-500/5',
  selectedCard: 'border-red-500/50 bg-red-50/80 dark:bg-red-950/20 shadow-xl shadow-red-500/10 text-red-650 dark:text-red-400 ring-1 ring-red-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-red-100/80 dark:bg-red-900/60 text-red-650 dark:text-red-400',
  hoverIcon: 'group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400',
  hoverBorder: 'hover:border-red-300 dark:hover:border-red-800/80 hover:shadow-red-500/5 dark:hover:shadow-red-500/5',
  hoverScale: 1.03,
  spring: { stiffness: 240, damping: 18 }
};

const anatomyTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-blue-500/5',
  glowTo: 'group-hover:to-cyan-500/5',
  selectedCard: 'border-blue-500/50 bg-blue-50/80 dark:bg-blue-950/20 shadow-xl shadow-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',
  hoverIcon: 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400',
  hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-800/80 hover:shadow-blue-500/5 dark:hover:shadow-blue-500/5',
  hoverScale: 1.02,
  spring: { stiffness: 120, damping: 28 }
};

const physiologyTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-emerald-500/5',
  glowTo: 'group-hover:to-teal-500/5',
  selectedCard: 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20 shadow-xl shadow-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
  hoverIcon: 'group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-800/80 hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/5',
  hoverScale: 1.05,
  spring: { stiffness: 350, damping: 15 }
};

const pharmacologyTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-purple-500/5',
  glowTo: 'group-hover:to-fuchsia-500/5',
  selectedCard: 'border-purple-500/50 bg-purple-50/80 dark:bg-purple-950/20 shadow-xl shadow-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-purple-100/80 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400',
  hoverIcon: 'group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 dark:group-hover:text-purple-400',
  hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-800/80 hover:shadow-purple-500/5 dark:hover:shadow-purple-500/5',
  hoverScale: 1.04,
  spring: { stiffness: 220, damping: 12 }
};

const microbiologyTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-amber-500/5',
  glowTo: 'group-hover:to-orange-500/5',
  selectedCard: 'border-amber-500/50 bg-amber-50/80 dark:bg-amber-950/20 shadow-xl shadow-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400',
  hoverIcon: 'group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30 group-hover:text-amber-600 dark:group-hover:text-amber-400',
  hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-800/80 hover:shadow-amber-500/5 dark:hover:shadow-amber-500/5',
  hoverScale: 1.03,
  spring: { stiffness: 180, damping: 14 }
};

const biochemistryTheme: SubjectTheme = {
  glowFrom: 'group-hover:from-teal-500/5',
  glowTo: 'group-hover:to-indigo-500/5',
  selectedCard: 'border-teal-500/50 bg-teal-50/80 dark:bg-teal-950/20 shadow-xl shadow-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20 backdrop-blur-xl',
  selectedIcon: 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400',
  hoverIcon: 'group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 dark:group-hover:text-teal-400',
  hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-800/80 hover:shadow-teal-500/5 dark:hover:shadow-teal-500/5',
  hoverScale: 1.03,
  spring: { stiffness: 160, damping: 20 }
};

const THEMES: Record<string, SubjectTheme> = {
  pathology: pathologyTheme,
  anatomy: anatomyTheme,
  physiology: physiologyTheme,
  pharmacology: pharmacologyTheme,
  microbiology: microbiologyTheme,
  biochemistry: biochemistryTheme
};

const DEFAULT_THEME = anatomyTheme;

export function SubjectCard({ id, label, icon, isSelected, onSelect }: SubjectCardProps) {
  const iconName = icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.CircleHelp;

  const theme = THEMES[id] || DEFAULT_THEME;

  const { orientation, permission, requestPermission } = useDeviceOrientation();

  // Unified Motion Values driven by Mouse or Gyroscope
  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);

  // Spring smoothing using subject-specific kinetic weights
  const springX = useSpring(rotateXValue, theme.spring);
  const springY = useSpring(rotateYValue, theme.spring);

  useEffect(() => {
    if (orientation.beta !== null && orientation.gamma !== null) {
      // Natural hand-held angle baseline for phones (around 50-60 deg)
      const baselineBeta = 55;
      const diffBeta = orientation.beta - baselineBeta;
      const diffGamma = orientation.gamma;

      // Adjust multiplier for sensitivity and clamp values
      const rotX = Math.max(-10, Math.min(10, diffBeta * 0.45));
      const rotY = Math.max(-10, Math.min(10, diffGamma * 0.45));

      rotateXValue.set(-rotX); // Invert pitch to match device inclination
      rotateYValue.set(rotY);
    }
  }, [orientation, rotateXValue, rotateYValue]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (orientation.beta !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    // Calculate cursor displacement relative to center
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    const rotX = (y / (height / 2)) * -8;
    const rotY = (x / (width / 2)) * 8;
    rotateXValue.set(rotX);
    rotateYValue.set(rotY);
  };

  const handleMouseLeave = () => {
    if (orientation.beta !== null) return;
    rotateXValue.set(0);
    rotateYValue.set(0);
  };

  return (
    <motion.div
      whileHover={{ scale: theme.hoverScale }}
      whileTap={{ scale: 0.97 }}
      onClick={async () => {
        haptics.tap();
        if (permission === 'default') {
          await requestPermission();
        }
        onSelect?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          haptics.tap();
          if (permission === 'default') {
            await requestPermission();
          }
          onSelect?.();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: 'preserve-3d',
        transformPerspective: 800,
      }}
      className={`
        relative group overflow-hidden flex flex-col items-center justify-center p-5 min-h-[120px]
        rounded-3xl border transition-all duration-300 select-none cursor-pointer
        ${isSelected 
          ? theme.selectedCard
          : `border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-300 backdrop-blur-md hover:shadow-lg ${theme.hoverBorder}`
        }
      `}
    >
      {/* Ambient background glow tracking hover with subject-specific gradients */}
      <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent ${theme.glowFrom} ${theme.glowTo} transition-colors duration-500`} />

      <motion.div 
        style={{ transform: 'translateZ(25px)' }}
        className={`p-3 rounded-2xl mb-3 transition-colors duration-300 ${
          isSelected 
            ? theme.selectedIcon
            : `bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 ${theme.hoverIcon}`
        }`}
      >
        <IconComponent className="w-6 h-6" />
      </motion.div>
      <motion.span 
        style={{ transform: 'translateZ(15px)' }}
        className="text-sm font-semibold text-center tracking-tight z-10"
      >
        {label}
      </motion.span>
    </motion.div>
  );
}
