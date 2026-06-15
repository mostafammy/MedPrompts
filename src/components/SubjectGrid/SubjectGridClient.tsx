'use client';

import React from 'react';
import { SubjectCard } from './SubjectCard';
import { SubjectId } from '@/lib/types/branded';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface Subject {
  id: string;
  label: string;
  icon: string;
}

export interface SubjectGridClientProps {
  subjects: Subject[];
}

export function SubjectGridClient({ subjects }: SubjectGridClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get('subject');

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('subject', id);
    router.push(pathname + '?' + params.toString());
  };

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl mx-auto"
      aria-label="Select a medical subject"
    >
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          id={subject.id as SubjectId}
          label={subject.label}
          icon={subject.icon}
          isSelected={selectedId === subject.id}
          onSelect={() => handleSelect(subject.id)}
        />
      ))}
    </div>
  );
}
