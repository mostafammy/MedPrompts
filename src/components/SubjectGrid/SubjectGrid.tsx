import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubjectGridClient } from './SubjectGridClient';

function getDb() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });
  return drizzle(client, { schema });
}

export async function SubjectGrid() {
  const db = getDb();
  
  // Fetch active subjects ordered by sortOrder
  const subjects = await db.query.subjects.findMany({
    where: eq(schema.subjects.isActive, true),
    orderBy: schema.subjects.sortOrder,
  });

  return <SubjectGridClient subjects={subjects} />;
}
