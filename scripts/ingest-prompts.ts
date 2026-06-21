import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createDb } from '../src/lib/db/client';
import { DatabaseVersionWriter } from '../src/lib/prompts/version-writer';
import { DatabaseVersionActivator } from '../src/lib/prompts/version-activator';
import { SemanticInvalidationStrategy } from '../src/lib/prompts/cache-invalidation-strategy';
import { createInMemoryCache } from '../src/lib/prompts/cache';
import { noopAnalytics } from '../src/lib/analytics';
import { SubjectId } from '../src/lib/types/branded';
import { eq, and } from 'drizzle-orm';
import { promptTemplates } from '../src/lib/db/schema';
import { SemVer } from '../src/lib/prompts/semver';


dotenv.config({ path: '.env.local' });

async function ingest() {
  console.log('Scanning prompts/ directory for templates to ingest...');

  const db = createDb({
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  const writer = new DatabaseVersionWriter(db);
  const activator = new DatabaseVersionActivator(
    db,
    createInMemoryCache(), // Direct DB updates propagate versions; edge KV resolves on next request
    new SemanticInvalidationStrategy(),
    noopAnalytics
  );

  const promptsDir = path.resolve(__dirname, '../prompts');
  
  try {
    const subjects = readdirSync(promptsDir);

    for (const subject of subjects) {
      const subjectPath = path.join(promptsDir, subject);
      if (!statSync(subjectPath).isDirectory()) continue;

      const versions = readdirSync(subjectPath);
      for (const version of versions) {
        const versionPath = path.join(subjectPath, version);
        if (!statSync(versionPath).isDirectory()) continue;

        const templatePath = path.join(versionPath, 'template.md');
        const metadataPath = path.join(versionPath, 'metadata.json');

        const template = readFileSync(templatePath, 'utf8');
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

        console.log(`Checking ${subject} ${metadata.semver}...`);

        // Check if this version is already active with identical content to avoid unnecessary updates
        const activeRow = await db.query.promptTemplates.findFirst({
          where: and(
            eq(promptTemplates.subjectId, subject),
            eq(promptTemplates.isActive, true)
          ),
        });

        if (activeRow) {
          const activeSv = SemVer.parse(activeRow.semver);
          const localSv = SemVer.parse(metadata.semver);
          if (activeSv.ok && localSv.ok) {
            if (activeSv.value.compare(localSv.value) >= 0) {
              console.log(`  Version ${metadata.semver} is older than or equal to active version ${activeRow.semver}. Skipping.`);
              continue;
            }
          }
        }


        // 1. Create/Register the version as a draft template (isActive = false)
        const writeResult = await writer.createVersion(db, {
          subjectId: subject as SubjectId,
          template,
          semver: metadata.semver,
          changelog: metadata.changelog,
          isInteractive: metadata.isInteractive,
          requiredVariables: metadata.requiredVariables,
        });

        if (!writeResult.ok) {
          if (writeResult.error.code === 'CHECKSUM_IDENTITY') {
            console.log(`  Version ${metadata.semver} is identical to the currently active version. Skipping.`);
            continue;
          } else if (writeResult.error.code === 'DUPLICATE_VERSION') {
            // Check if it's already active, if so we don't need to reactivate it
            if (activeRow && activeRow.semver === metadata.semver) {
              console.log(`  Version ${metadata.semver} is already active. Skipping.`);
              continue;
            }
            console.log(`  Version ${metadata.semver} already exists in database as an inactive draft.`);
          } else {
            console.error(`  Failed to write version: ${writeResult.error.message}`);
            continue;
          }
        }

        // 2. Fetch the template row we just wrote (or was already present as an inactive draft) to activate it
        const targetRow = await db.query.promptTemplates.findFirst({
          where: and(
            eq(promptTemplates.subjectId, subject),
            eq(promptTemplates.semver, metadata.semver)
          ),
        });

        if (targetRow) {
          console.log(`  Activating ${subject} ${metadata.semver}...`);
          const actResult = await activator.activate(targetRow.id, 'system:ingest');
          if (actResult.ok) {
            console.log(`  Successfully activated!`);
          } else {
            console.error(`  Activation failed: ${actResult.error.code}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Ingestion process encountered an error:', err.message);
    process.exit(1);
  }

  console.log('\nIngestion pipeline finished.');
  process.exit(0);
}

ingest().catch((err) => {
  console.error('Unhandled rejection during ingestion:', err);
  process.exit(1);
});
