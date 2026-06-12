export default function Loading() {
  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 animate-pulse select-none pointer-events-none">
      {/* Back button skeleton */}
      <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-6" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800/80 rounded-full" />
          <div className="h-3 w-3 bg-zinc-350 dark:bg-zinc-750 rounded-full" />
          <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800/80 rounded-full" />
        </div>
        <div className="h-10 w-64 bg-zinc-300 dark:bg-zinc-800 rounded-2xl mb-4" />
        <div className="h-5 w-80 bg-zinc-200 dark:bg-zinc-850 rounded-lg" />
      </div>

      {/* Code window container skeleton */}
      <div className="flex-1 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/85 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col mb-6 min-h-[300px]">
        {/* Header dots */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
          <div className="w-16 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
        
        {/* Code text content area */}
        <div className="flex-1 p-6 flex flex-col gap-3">
          <div className="h-4 w-[90%] bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-[95%] bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-[75%] bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-[85%] bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-4 w-[40%] bg-zinc-200 dark:bg-zinc-800/60 rounded-lg" />
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="mt-auto pt-2 flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full h-14 bg-zinc-300 dark:bg-zinc-800 rounded-2xl" />
        <div className="flex w-full gap-4">
          <div className="flex-1 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="flex-1 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
