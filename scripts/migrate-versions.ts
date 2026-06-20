import { createHash, randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { createDb } from '../src/lib/db/client';
import { promptTemplates, templateVersions } from '../src/lib/db/schema';

dotenv.config({ path: '.env.local' });

async function migrateVersions(): Promise<void> {
  console.log('Starting version migration: integer → semver...');

  const db = createDb({
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  const templates = await db.select().from(promptTemplates);

  if (templates.length === 0) {
    console.log('No templates found. Nothing to migrate.');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const t of templates) {
    if (t.semver && t.semver !== '1.0.0') {
      skipped++;
      continue;
    }

    const semver = `${t.version}.0.0`;
    const checksum = createHash('sha256').update(t.template).digest('hex');

    await db.transaction(async (tx) => {
      await tx.update(promptTemplates)
        .set({ semver, versionMajor: t.version, versionMinor: 0, versionPatch: 0, checksum })
        .where(eq(promptTemplates.id, t.id));

      const existing = await tx.select()
        .from(templateVersions)
        .where(
          sql`${templateVersions.templateId} = ${t.id} AND ${templateVersions.semver} = ${semver}`
        )
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(templateVersions).values({
          id: randomUUID(),
          templateId: t.id,
          semver,
          template: t.template,
          checksum,
          changelog: t.changelog,
          parentSemver: null,
          activatedBy: 'system:migration',
          activatedAt: t.createdAt,
          deactivatedAt: t.isActive ? null : new Date(),
        });
      }
    });

    migrated++;
    console.log(`  Migrated template ${t.id}: version=${t.version} → ${semver}`);
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} already migrated`);
}

migrateVersions().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
