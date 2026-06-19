'use client';

import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'card' | 'text' | 'title' | 'prompt' | 'grid';
}

export function SkeletonLoader({ className = '', variant = 'card' }: SkeletonLoaderProps) {
  const baseClass = "relative overflow-hidden bg-zinc-200 dark:bg-zinc-800/80 rounded-2xl";
  
  // Shimmer pulse gradient line
  const shimmerEffect = (
    <div 
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-zinc-700/10"
      style={{
        backgroundSize: '200% 100%'
      }}
    />
  );

  if (variant === 'text') {
    return (
      <div className={`space-y-3.5 w-full ${className}`}>
        <div className={`h-4 w-[90%] ${baseClass}`}>{shimmerEffect}</div>
        <div className={`h-4 w-[95%] ${baseClass}`}>{shimmerEffect}</div>
        <div className={`h-4 w-[75%] ${baseClass}`}>{shimmerEffect}</div>
        <div className={`h-4 w-[85%] ${baseClass}`}>{shimmerEffect}</div>
      </div>
    );
  }

  if (variant === 'title') {
    return (
      <div className={`h-8 w-48 ${baseClass} ${className}`}>
        {shimmerEffect}
      </div>
    );
  }

  if (variant === 'prompt') {
    return (
      <div className={`space-y-6 w-full p-6 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md ${className}`}>
        <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-850/60">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-350 dark:bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-350 dark:bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-350 dark:bg-zinc-700" />
          </div>
          <div className={`h-6 w-24 ${baseClass}`}>{shimmerEffect}</div>
        </div>
        <div className="space-y-3.5 pt-2">
          <div className={`h-4 w-full ${baseClass}`}>{shimmerEffect}</div>
          <div className={`h-4 w-[92%] ${baseClass}`}>{shimmerEffect}</div>
          <div className={`h-4 w-[95%] ${baseClass}`}>{shimmerEffect}</div>
          <div className={`h-4 w-[88%] ${baseClass}`}>{shimmerEffect}</div>
          <div className={`h-4 w-[90%] ${baseClass}`}>{shimmerEffect}</div>
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full max-w-4xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLoader key={i} variant="card" />
        ))}
      </div>
    );
  }

  // Card layout
  return (
    <div className={`p-5 min-h-[120px] flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm rounded-3xl relative overflow-hidden ${className}`}>
      <div className={`w-10 h-10 rounded-2xl mb-3 ${baseClass}`}>{shimmerEffect}</div>
      <div className={`h-3 w-16 ${baseClass}`}>{shimmerEffect}</div>
    </div>
  );
}
