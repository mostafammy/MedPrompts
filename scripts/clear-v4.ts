import { createDb } from '../src/lib/db/client';
import { promptTemplates, templateVersions } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const db = createDb({
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN } : {}),
  });
  console.log('Finding template row for anatomy v4.0.0...');
  const row = await db.query.promptTemplates.findFirst({
    where: and(
      eq(promptTemplates.subjectId, 'anatomy'),
      eq(promptTemplates.semver, '4.0.0')
    )
  });

  if (!row) {
    console.log('No anatomy v4.0.0 template found in database.');
    process.exit(0);
  }

  console.log(`Found template with ID: ${row.id}`);

  console.log('Deleting template versions referencing this template...');
  await db.delete(templateVersions).where(eq(templateVersions.templateId, row.id));

  console.log('Deleting prompt template row...');
  await db.delete(promptTemplates).where(eq(promptTemplates.id, row.id));

  console.log('Deleted successfully!');
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
