'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Subject } from '@/lib/subjects';
import { Bone, Microscope, HeartPulse, Dna, FlaskConical, Bug, BookOpen, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubjectTileProps {
  subject: Subject;
  index?: number;
}

const subjectStyles: Record<string, {
  icon: LucideIcon;
  bg: string;
  text: string;
  glow: string;
  spotlightGlow: string;
}> = {
  anatomy: {
    icon: Bone,
    bg: 'bg-orange-500/8 dark:bg-orange-500/12',
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'sm:hover:shadow-orange-500/5 sm:dark:hover:shadow-orange-500/2',
    spotlightGlow: 'rgba(249, 115, 22, 0.08)',
  },
  histology: {
    icon: Microscope,
    bg: 'bg-purple-500/8 dark:bg-purple-500/12',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'sm:hover:shadow-purple-500/5 sm:dark:hover:shadow-purple-500/2',
    spotlightGlow: 'rgba(168, 85, 247, 0.08)',
  },
  physiology: {
    icon: HeartPulse,
    bg: 'bg-red-500/8 dark:bg-red-500/12',
    text: 'text-red-600 dark:text-red-400',
    glow: 'sm:hover:shadow-red-500/5 sm:dark:hover:shadow-red-500/2',
    spotlightGlow: 'rgba(239, 68, 68, 0.08)',
  },
  microbiology: {
    icon: Dna,
    bg: 'bg-emerald-500/8 dark:bg-emerald-500/12',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'sm:hover:shadow-emerald-500/5 sm:dark:hover:shadow-emerald-500/2',
    spotlightGlow: 'rgba(16, 185, 129, 0.08)',
  },
  pathology: {
    icon: FlaskConical,
    bg: 'bg-blue-500/8 dark:bg-blue-500/12',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'sm:hover:shadow-blue-500/5 sm:dark:hover:shadow-blue-500/2',
    spotlightGlow: 'rgba(59, 130, 246, 0.08)',
  },
  parasitology: {
    icon: Bug,
    bg: 'bg-amber-500/8 dark:bg-amber-500/12',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'sm:hover:shadow-amber-500/5 sm:dark:hover:shadow-amber-500/2',
    spotlightGlow: 'rgba(245, 158, 11, 0.08)',
  },
};

export default function SubjectTile({ subject, index }: SubjectTileProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const style = subjectStyles[subject.id] || {
    icon: BookOpen,
    bg: 'bg-zinc-500/8 dark:bg-zinc-500/12',
    text: 'text-zinc-600 dark:text-zinc-400',
    glow: '',
    spotlightGlow: 'rgba(120, 120, 120, 0.05)',
  };

  const IconComponent = style.icon;

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div layoutId={`subject-card-${subject.id}`} className="h-full">
      <Link 
        href={`/?subject=${subject.slug}`}
        scroll={false}
        onMouseMove={handleMouseMove}
        className={`group block relative overflow-hidden bg-white/70 dark:bg-zinc-900/30 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 shadow-sm sm:hover:shadow-xl sm:hover:border-zinc-300 sm:dark:hover:border-zinc-700 transition-all duration-500 ease-spring sm:hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] ${style.glow} focus:outline-none focus:ring-4 focus:ring-blue-500/10 h-full`}
        prefetch={true}
      >
        {/* Subtle keyboard shortcut indicator badge */}
        {index !== undefined && (
          <span className="absolute top-4 right-4 text-[9px] font-mono font-bold bg-zinc-200/40 dark:bg-zinc-800/30 text-zinc-450 dark:text-zinc-400 px-1.5 py-0.5 rounded-md border border-zinc-200/10 dark:border-zinc-850/10 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 select-none">
            {index + 1}
          </span>
        )}
        {/* Premium Mouse Spotlight Glow */}
        <div 
          className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0"
          style={{
            background: `radial-gradient(180px circle at ${mousePosition.x}px ${mousePosition.y}px, ${style.spotlightGlow}, transparent 80%)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-5 h-full">
          <div className={`p-4 rounded-2xl ${style.bg} ${style.text} transition-transform duration-500 ease-spring sm:group-hover:scale-110`}>
            <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 stroke-[1.5]" />
          </div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
            {subject.label}
          </h3>
        </div>
      </Link>
    </motion.div>
  );
}
