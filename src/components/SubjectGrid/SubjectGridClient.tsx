'use client';

import React from 'react';
import { SubjectCard } from './SubjectCard';
import { SubjectId } from '@/lib/types/branded';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export interface Subject {
  id: string;
  label: string;
  icon: string;
}

export interface SubjectGridClientProps {
  subjects: Subject[];
}

export function SubjectGridClient({ subjects }: SubjectGridClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get('subject');

  const getHref = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('subject', id);
    return pathname + '?' + params.toString();
  };

  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full max-w-4xl mx-auto"
      aria-label="Select a medical subject"
    >
      {subjects.map((subject) => {
        const isSelected = selectedId === subject.id;
        const href = getHref(subject.id);

        return (
          <Link
            key={subject.id}
            href={href}
            scroll={false}
            className="block no-underline"
          >
            <SubjectCard
              id={subject.id as SubjectId}
              label={subject.label}
              icon={subject.icon}
              isSelected={isSelected}
            />
          </Link>
        );
      })}
    </div>
  );
}
