import { Suspense } from 'react';
import SubjectGrid from '@/components/SubjectGrid';
import HistoryTray from '@/components/HistoryTray';

function SubjectGridFallback() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mx-auto px-4 py-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white/70 dark:bg-zinc-900/30 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 animate-pulse h-40" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center pt-12 sm:pt-24 px-4 relative">
      <div className="text-center mb-6 max-w-3xl mx-auto animate-fade-in-up">
        {/* Premium Badge */}
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium bg-blue-500/8 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 rounded-full mb-6 border border-blue-500/15 dark:border-blue-500/20 select-none backdrop-blur-md">
          ✨ V1.0 Master Prompt Generator
        </span>
        
        {/* Apple-style gradient heading */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-zinc-950 dark:text-white mb-6">
          Med<span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Prompt</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto font-light leading-relaxed">
          Select a subject below to instantly synthesize a board-exam ready, structured study prompt.
        </p>
      </div>
      
      <div className="w-full animate-fade-in delay-200">
        <Suspense fallback={<SubjectGridFallback />}>
          <SubjectGrid />
        </Suspense>
        <HistoryTray />
      </div>
    </main>
  );
}
