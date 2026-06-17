import React from 'react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline | MedPrompts',
};

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 text-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-zinc-500/10 blur-[80px] pointer-events-none" />

      <div className="z-10 flex flex-col items-center max-w-md">
        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-200 dark:border-zinc-800">
          <Icons.WifiOff className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight">
          You are Offline
        </h1>
        
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your connection. We cannot generate new prompts while you are offline, but you can still access cached pages if you previously visited them.
        </p>

        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <Icons.RefreshCcw className="w-4 h-4" />
          Try Again
        </Link>
      </div>
    </main>
  );
}
