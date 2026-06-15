import { Database } from '../db/client';
import { promptTemplates, PromptTemplate } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { SubjectId } from '../types/branded';

export async function getActiveTemplate(db: Database, subjectId: SubjectId): Promise<PromptTemplate | null> {
  const result = await db.select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.subjectId, subjectId),
        eq(promptTemplates.isActive, true)
      )
    )
    .limit(1);

  return result[0] || null;
}
