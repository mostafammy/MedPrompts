import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { promptTemplates } from '../src/lib/db/schema';

export type Env = {
  DB: D1Database;
};

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('Template drift check starting...');

    const { createClient } = await import('@libsql/client');
    const { drizzle } = await import('drizzle-orm/libsql');

    const client = createClient({ url: ':memory:' });
    const db = drizzle(client);

    const templates = await db.select({
      id: promptTemplates.id,
      template: promptTemplates.template,
      checksum: promptTemplates.checksum,
    })
      .from(promptTemplates)
      .where(eq(promptTemplates.isActive, true));

    let driftCount = 0;

    for (const t of templates) {
      const computed = createHash('sha256').update(t.template).digest('hex');
      if (computed !== t.checksum) {
        driftCount++;
        console.error(
          JSON.stringify({
            event: 'template.drift_detected',
            templateId: t.id,
            expectedChecksum: t.checksum,
            actualChecksum: computed,
          })
        );
      }
    }

    if (driftCount === 0) {
      console.log('Template drift check complete: all checksums match');
    } else {
      console.error(`Template drift check complete: ${driftCount} template(s) have checksum mismatches`);
    }
  },
};
