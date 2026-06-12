import Link from 'next/link';
import { Subject } from '@/lib/subjects';
import { Bone, Microscope, HeartPulse, Dna, FlaskConical, Bug, BookOpen, LucideIcon } from 'lucide-react';

interface SubjectTileProps {
  subject: Subject;
}

const subjectStyles: Record<string, {
  icon: LucideIcon;
  bg: string;
  text: string;
  glow: string;
}> = {
  anatomy: {
    icon: Bone,
    bg: 'bg-orange-500/8 dark:bg-orange-500/12',
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'hover:shadow-orange-500/5 dark:hover:shadow-orange-500/2',
  },
  histology: {
    icon: Microscope,
    bg: 'bg-purple-500/8 dark:bg-purple-500/12',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'hover:shadow-purple-500/5 dark:hover:shadow-purple-500/2',
  },
  physiology: {
    icon: HeartPulse,
    bg: 'bg-red-500/8 dark:bg-red-500/12',
    text: 'text-red-600 dark:text-red-400',
    glow: 'hover:shadow-red-500/5 dark:hover:shadow-red-500/2',
  },
  microbiology: {
    icon: Dna,
    bg: 'bg-emerald-500/8 dark:bg-emerald-500/12',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/2',
  },
  pathology: {
    icon: FlaskConical,
    bg: 'bg-blue-500/8 dark:bg-blue-500/12',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'hover:shadow-blue-500/5 dark:hover:shadow-blue-500/2',
  },
  parasitology: {
    icon: Bug,
    bg: 'bg-amber-500/8 dark:bg-amber-500/12',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'hover:shadow-amber-500/5 dark:hover:shadow-amber-500/2',
  },
};

export default function SubjectTile({ subject }: SubjectTileProps) {
  const style = subjectStyles[subject.id] || {
    icon: BookOpen,
    bg: 'bg-zinc-500/8 dark:bg-zinc-500/12',
    text: 'text-zinc-600 dark:text-zinc-400',
    glow: '',
  };

  const IconComponent = style.icon;

  return (
    <Link 
      href={`/${subject.slug}`}
      className={`group block bg-white/70 dark:bg-zinc-900/30 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-500 ease-spring hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] ${style.glow} focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
      prefetch={true}
    >
      <div className="flex flex-col items-center justify-center text-center gap-5 h-full">
        <div className={`p-4 rounded-2xl ${style.bg} ${style.text} transition-transform duration-500 ease-spring group-hover:scale-110`}>
          <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 stroke-[1.5]" />
        </div>
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
          {subject.label}
        </h3>
      </div>
    </Link>
  );
}
