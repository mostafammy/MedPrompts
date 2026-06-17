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
    <Suspense fallback={<div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse w-full max-w-4xl mx-auto" />}>
      {variant === 'compact' ? (
        <CompactSubjectGridClient subjects={subjects} />
      ) : (
        <SubjectGridClient subjects={subjects} />
      )}
    </Suspense>
  );
}
