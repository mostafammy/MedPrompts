import { getDb } from '@/lib/db/get-db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubjectGridClient } from './SubjectGridClient';
import { CompactSubjectGridClient } from './CompactSubjectGridClient';
import { Suspense } from 'react';

export interface SubjectGridProps {
  variant?: 'full' | 'compact';
  selectedId?: string | null;
}

export async function SubjectGrid({ variant = 'full', selectedId = null }: SubjectGridProps = {}) {
  const db = getDb();
  
  let subjects;
  try {
    subjects = await db.query.subjects.findMany({
      where: eq(schema.subjects.isActive, true),
      orderBy: schema.subjects.sortOrder,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return (
      <div className="w-full text-center p-8 border border-red-500/50 bg-red-500/10 rounded-2xl text-red-500">
        <h3 className="font-bold mb-2">Database Error</h3>
        <p className="text-sm break-words font-mono">{errorMessage}</p>
      </div>
    );
  }

  return (
    <>
      {subjects.length === 0 ? (
        <div className="w-full text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-zinc-500">
          No subjects found in the database. 
          <br />
          <span className="text-sm mt-2 block">If you are in production, ensure you have run the seed script against your remote Turso database.</span>
        </div>
      ) : variant === 'compact' ? (
        <CompactSubjectGridClient subjects={subjects} selectedId={selectedId} />
      ) : (
        <SubjectGridClient subjects={subjects} selectedId={selectedId} />
      )}
    </>
  );
}
