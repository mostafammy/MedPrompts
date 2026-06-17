import { getDb } from '@/lib/db/get-db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubjectGridClient } from './SubjectGridClient';
import { CompactSubjectGridClient } from './CompactSubjectGridClient';
import { Suspense } from 'react';

export interface SubjectGridProps {
  variant?: 'full' | 'compact';
}

export async function SubjectGrid({ variant = 'full' }: SubjectGridProps = {}) {
  const db = getDb();
  
  // Fetch active subjects ordered by sortOrder
  const subjects = await db.query.subjects.findMany({
    where: eq(schema.subjects.isActive, true),
    orderBy: schema.subjects.sortOrder,
  });

  return (
    <Suspense fallback={<div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse w-full max-w-4xl mx-auto flex items-center justify-center text-zinc-500">Loading subjects...</div>}>
      {subjects.length === 0 ? (
        <div className="w-full text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-zinc-500">
          No subjects found in the database. 
          <br />
          <span className="text-sm mt-2 block">If you are in production, ensure you have run the seed script against your remote Turso database.</span>
        </div>
      ) : variant === 'compact' ? (
        <CompactSubjectGridClient subjects={subjects} />
      ) : (
        <SubjectGridClient subjects={subjects} />
      )}
    </Suspense>
  );
}
