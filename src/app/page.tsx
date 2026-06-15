import { SubjectGrid } from '@/components/SubjectGrid/SubjectGrid';
import { GenerateContainer } from './GenerateContainer';
import { SubjectId } from '@/lib/types/branded';

export const metadata = {
  title: 'MedPrompts — Medical Prompt Library for Students',
  description: 'Generate comprehensive, evidence-based medical study prompts for pathology, anatomy, pharmacology, and more.',
};

export default async function HomePage(props: { searchParams: Promise<{ subject?: string }> }) {
  const searchParams = await props.searchParams;
  const subjectId = (searchParams.subject as SubjectId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Find Your Medical Study Prompt
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Select a subject and enter a topic to generate a comprehensive, structured study prompt powered by AI.
        </p>
      </div>

      <div className="w-full max-w-4xl mb-8">
        <SubjectGrid />
      </div>

      <GenerateContainer subjectId={subjectId} />
    </div>
  );
}
