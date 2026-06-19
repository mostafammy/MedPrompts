'use client';

import React from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

export default function Loading() {
  return (
    <main className="min-h-[100dvh] p-4 sm:p-8 md:p-24 pt-12 max-w-7xl mx-auto flex flex-col items-center overflow-x-hidden">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4 transition-colors">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
            Promptica
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 font-medium max-w-2xl mx-auto balance-text">
          Synthesizing Medical Prompt...
        </p>
      </div>

      {/* Subject selection grid skeleton placeholder */}
      <div className="w-full max-w-4xl mb-8">
        <SkeletonLoader variant="grid" />
      </div>

      {/* Prompt container skeleton */}
      <div className="w-full max-w-4xl mx-auto mt-12">
        <SkeletonLoader variant="prompt" />
      </div>
    </main>
  );
}
