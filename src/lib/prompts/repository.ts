import { Database } from '../db/client';
import { promptTemplates } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Result, ok, err } from '../types/result';
import { PromptCache } from './cache';
import { SubjectId } from '../types/branded';

export type ActivationError = { code: 'NOT_FOUND'; templateId: string };

export async function activateTemplate(
  db: Database,
  cache: PromptCache | null,
  templateId: string
): Promise<Result<void, ActivationError>> {
  return await db.transaction(async (tx) => {
    const template = await tx.select().from(promptTemplates).where(eq(promptTemplates.id, templateId)).limit(1);
    
    if (template.length === 0) {
      return err({ code: 'NOT_FOUND', templateId });
    }

    const subjectId = template[0]!.subjectId as SubjectId;

    await tx.update(promptTemplates)
      .set({ isActive: false })
      .where(eq(promptTemplates.subjectId, subjectId));

    await tx.update(promptTemplates)
      .set({ isActive: true })
      .where(eq(promptTemplates.id, templateId));

    if (cache) {
      await cache.delete(subjectId);
    }

    return ok(undefined);
  });
}
