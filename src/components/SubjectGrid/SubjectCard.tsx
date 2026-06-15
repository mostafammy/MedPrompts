'use client';

import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import React from 'react';

export interface SubjectCardProps {
  id: SubjectId;
  label: string;
  icon: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function SubjectCard({ label, icon, isSelected, onSelect }: SubjectCardProps) {
  // We dynamically render the icon based on the icon name
  const iconName = icon.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.CircleHelp;

  return (
    <div
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      className={`
        flex flex-col items-center justify-center p-4 min-h-[100px] min-w-[100px]
        rounded-2xl border-2 transition-all cursor-pointer
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md text-blue-700' 
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm text-slate-700'
        }
      `}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <IconComponent className={`w-8 h-8 mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
      <span className="text-sm font-medium text-center">{label}</span>
    </div>
  );
}
