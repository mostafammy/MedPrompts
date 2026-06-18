import { SubjectGrid } from '@/components/SubjectGrid/SubjectGrid';
import { GenerateContainer } from './GenerateContainer';
import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import { Suspense } from 'react';

export const metadata = {
  title: 'MedPrompts — Board-Exam Master Prompts',
  description: 'Generate comprehensive, evidence-based medical study prompts for pathology, anatomy, pharmacology, and more.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage(props: { searchParams: Promise<{ subject?: string }> }) {
  const searchParams = await props.searchParams;
  const subjectId = (searchParams.subject as SubjectId) || null;

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

        {/* Subjects Selector Grid */}
        <section className={`w-full mb-10 transition-all duration-700 ease-in-out ${subjectId ? 'scale-[0.97] opacity-60 blur-[1px] translate-y-[-1rem]' : 'animate-fade-in-up delay-100'}`}>
          <div className="text-center mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              1. Choose a Subject
            </h2>
          </div>
          <SubjectGrid selectedId={subjectId} />
        </section>

        {/* Topic Input & Generation Container */}
        <section className="w-full animate-fade-in-up delay-200">
          {subjectId && (
            <div className="text-center mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                2. Enter a Topic
              </h2>
            </div>
          )}
          <Suspense fallback={null}>
            <GenerateContainer subjectId={subjectId} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

