import { getDb } from '@/lib/db/get-db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { HomePageClient } from './HomePageClient';
import * as Icons from 'lucide-react';

export const metadata = {
  title: 'MedPrompts — Board-Exam Master Prompts',
  description: 'Generate comprehensive, evidence-based medical study prompts for pathology, anatomy, pharmacology, and more.',
};

export default async function HomePage() {
  const db = getDb();
  
  let subjects;
  try {
    subjects = await db.query.subjects.findMany({
      where: eq(schema.subjects.isActive, true),
      orderBy: schema.subjects.sortOrder,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center p-8 border border-red-500/50 bg-red-500/10 rounded-2xl text-red-500">
          <h3 className="font-bold mb-2">Database Error</h3>
          <p className="text-sm break-words font-mono">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none animate-blob-float-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/10 dark:bg-emerald-600/5 blur-[120px] pointer-events-none animate-blob-float-2" />
      
      <div className="w-full max-w-4xl flex flex-col items-center relative z-10">
        {/* Brand Header */}
        <header className="flex items-center gap-2.5 mb-8 animate-fade-in group cursor-pointer select-none">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20 transform group-hover:scale-110 group-hover:rotate-[-8deg] transition-transform duration-500 ease-spring">
            <Icons.Stethoscope className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent group-hover:text-zinc-950 dark:group-hover:text-white transition-colors duration-300">
            MedPrompts<span className="text-blue-600 font-extrabold text-xs align-super ml-0.5">V1</span>
          </span>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-12 max-w-2xl animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4">
            Master Medical Boards with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Precision Prompts
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Select a core subject and enter a topic to generate structured, board-exam ready study templates. Copy instantly to supercharge ChatGPT, Gemini, or Claude.
          </p>
        </div>

        <HomePageClient subjects={subjects} />
      </div>
    </div>
  );
}

