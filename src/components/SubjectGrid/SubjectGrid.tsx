import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubjectGridClient } from './SubjectGridClient';
import { Suspense } from 'react';

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL environment variable is required');
  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
  return drizzle(client, { schema });
}

export async function SubjectGrid() {
  const db = getDb();
  
  // Fetch active subjects ordered by sortOrder
  const subjects = await db.query.subjects.findMany({
    where: eq(schema.subjects.isActive, true),
    orderBy: schema.subjects.sortOrder,
  });

  return (
    <Suspense fallback={<div className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse w-full max-w-4xl mx-auto" />}>
      <SubjectGridClient subjects={subjects} />
    </Suspense>
  );
}
