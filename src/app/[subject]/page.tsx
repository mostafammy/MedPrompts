import { notFound } from 'next/navigation';
import { getSubject, SUBJECTS } from '@/lib/subjects';
import SubjectGrid from '@/components/SubjectGrid';
import TopicInputSheet from '@/components/TopicInputSheet';
import Link from 'next/link';

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({
    subject: s.slug,
  }));
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const resolvedParams = await params;
  const subject = getSubject(resolvedParams.subject);

  if (!subject) {
    notFound();
  }

  return (
    <main className="flex-1 flex flex-col items-center pt-10 sm:pt-20 relative">
      <div className="text-center mb-10 px-4">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
          Med<span className="text-blue-600 dark:text-blue-500">Prompt</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
          Select a subject to generate a board-exam ready prompt.
        </p>
      </div>
      
      {/* Background grid */}
      <div className="opacity-50 pointer-events-none filter blur-[2px] transition-all">
        <SubjectGrid />
      </div>

      {/* The bottom sheet/modal modal for topic input */}
      <div className="fixed inset-0 z-40 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-xs flex items-end sm:items-center sm:justify-center p-4">
        <Link href="/" className="absolute inset-0 cursor-default" aria-label="Close modal" />
        <div className="relative z-50 w-full max-w-md">
          <TopicInputSheet subjectId={subject.id} />
        </div>
      </div>
    </main>
  );
}
