'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { SubjectGridClient, Subject } from '@/components/SubjectGrid/SubjectGridClient';
import { GenerateContainer } from './GenerateContainer';

export function HomePageClient({ subjects }: { subjects: Subject[] }) {
  const [selectedId, setSelectedId] = useState<SubjectId | null>(null);

  // Read URL initially if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    if (subject) {
      setSelectedId(subject as SubjectId);
    }
  }, []);

  const handleSelect = useCallback((id: string) => {
    const typedId = id as SubjectId;
    const next = selectedId === typedId ? null : typedId;
    setSelectedId(next);
    
    // Soft URL update — no navigation, no RSC, just bookmarkability
    const url = next ? `/?subject=${encodeURIComponent(next)}` : '/';
    window.history.replaceState(null, '', url);
  }, [selectedId]);

  if (subjects.length === 0) {
    return (
      <div className="w-full text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-zinc-500">
        No subjects found in the database. 
        <br />
        <span className="text-sm mt-2 block">If you are in production, ensure you have run the seed script against your remote Turso database.</span>
      </div>
    );
  }

  return (
    <>
      <section className={`w-full mb-10 transition-all duration-700 ease-in-out ${selectedId ? 'scale-[0.97] opacity-60 blur-[1px] translate-y-[-1rem]' : 'animate-fade-in-up delay-100'}`}>
        <div className="text-center mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            1. Choose a Subject
          </h2>
        </div>
        <SubjectGridClient
          subjects={subjects}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </section>

      <section className="w-full animate-fade-in-up delay-200">
        {selectedId && (
          <div className="text-center mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              2. Enter a Topic
            </h2>
          </div>
        )}
        <GenerateContainer subjectId={selectedId} />
      </section>
    </>
  );
}
