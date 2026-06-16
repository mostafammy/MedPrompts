'use client';

import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

export interface SubjectCardProps {
  id: SubjectId;
  label: string;
  icon: string;
  isSelected: boolean;
}

export function SubjectCard({ id: _id, label, icon, isSelected }: SubjectCardProps) {
  const iconName = icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.CircleHelp;

  // Parallax motion tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Map coordinate range relative to card center to degree rotation bounds
  const rotateX = useTransform(mouseY, [-60, 60], [8, -8]);
  const rotateY = useTransform(mouseX, [-60, 60], [-8, 8]);

  // Spring smoothing for natural organic inertia
  const springX = useSpring(rotateX, { stiffness: 200, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    // Calculate cursor displacement relative to center
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
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
        rounded-3xl border transition-colors duration-300 select-none cursor-pointer
        ${isSelected 
          ? 'border-blue-500/50 bg-blue-50/80 dark:bg-blue-900/30 shadow-xl shadow-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 backdrop-blur-xl' 
          : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 backdrop-blur-md hover:shadow-lg'
        }
      `}
    >
      {/* Ambient background glow tracking hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-colors duration-500" />

      <motion.div 
        style={{ transform: 'translateZ(25px)' }}
        className={`p-3 rounded-2xl mb-3 transition-colors duration-300 ${
          isSelected 
            ? 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400' 
            : 'bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
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
