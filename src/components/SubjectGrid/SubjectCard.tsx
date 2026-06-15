'use client';

import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import React from 'react';

export interface SubjectCardProps {
  id: SubjectId;
  label: string;
  icon: string;
  isSelected: boolean;
}

export function SubjectCard({ label, icon, isSelected }: SubjectCardProps) {
  // We dynamically render the icon based on the icon name
  const iconName = icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.CircleHelp;

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-5 min-h-[120px]
        rounded-2xl border transition-all duration-300 ease-spring select-none
        ${isSelected 
          ? 'border-blue-500 bg-gradient-to-b from-blue-50/50 to-blue-500/10 dark:from-blue-950/30 dark:to-blue-900/30 shadow-md shadow-blue-500/5 dark:shadow-blue-500/10 text-blue-600 dark:text-blue-400 scale-[1.03] ring-1 ring-blue-500/20' 
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:-translate-y-1 text-zinc-700 dark:text-zinc-300'
        }
      `}
    >
      <div className={`p-3 rounded-xl mb-3 transition-colors duration-300 ${
        isSelected 
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
          : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400'
      }`}>
        <IconComponent className="w-6 h-6" />
      </div>
      <span className="text-sm font-semibold text-center tracking-tight">{label}</span>
    </div>
  );
}
