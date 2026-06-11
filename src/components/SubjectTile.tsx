import Link from 'next/link';
import { Subject } from '@/lib/subjects';

interface SubjectTileProps {
  subject: Subject;
}

export default function SubjectTile({ subject }: SubjectTileProps) {
  // Simple icon mapping for MVP
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bone': return '🦴';
      case 'microscope': return '🔬';
      case 'heart-pulse': return '🫀';
      case 'bacteria': return '🦠';
      case 'flask': return '🧪';
      case 'bug': return '🪲';
      default: return '📚';
    }
  };

  return (
    <Link 
      href={`/${subject.slug}`}
      className="group block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/20"
      prefetch={true}
    >
      <div className="flex flex-col items-center justify-center text-center gap-4 h-full">
        <div className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">
          {getIcon(subject.icon)}
        </div>
        <h3 className="font-bold text-lg sm:text-xl text-zinc-900 dark:text-zinc-50 tracking-tight">
          {subject.label}
        </h3>
      </div>
    </Link>
  );
}
