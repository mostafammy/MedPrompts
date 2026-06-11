import SubjectGrid from '@/components/SubjectGrid';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center pt-10 sm:pt-20">
      <div className="text-center mb-10 px-4">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
          Med<span className="text-blue-600 dark:text-blue-500">Prompt</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
          Select a subject to generate a board-exam ready prompt.
        </p>
      </div>
      
      <SubjectGrid />
    </main>
  );
}
