import { describe, it, expect, beforeAll } from 'vitest';
import { Database } from '../../src/lib/db/client';
import { activateTemplate } from '../../src/lib/prompts/repository';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('activateTemplate', () => {
  let db: Database;

  beforeAll(async () => {
    const client = createClient({ url: 'file:test-repo.db' });
    db = drizzle(client, { schema });
    
    await client.execute('CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, label TEXT NOT NULL, icon TEXT NOT NULL, sort_order INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS prompt_templates (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, template TEXT NOT NULL, version INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 0, changelog TEXT, created_at INTEGER NOT NULL, is_interactive INTEGER NOT NULL DEFAULT 0, required_variables TEXT NOT NULL DEFAULT \'[]\', FOREIGN KEY (subject_id) REFERENCES subjects(id))');
    
    await client.execute("INSERT OR REPLACE INTO subjects (id, label, icon, sort_order, created_at) VALUES ('pathology', 'Pathology', 'microscope', 1, 0)");
    await client.execute("INSERT OR REPLACE INTO prompt_templates (id, subject_id, template, version, is_active, created_at) VALUES ('tmpl-1', 'pathology', 'Template V1', 1, 1, 0)");
    await client.execute("INSERT OR REPLACE INTO prompt_templates (id, subject_id, template, version, is_active, created_at) VALUES ('tmpl-2', 'pathology', 'Template V2', 2, 0, 0)");
  });

  it('should deactivate old and activate new template', async () => {
    const result = await activateTemplate(db, null, 'tmpl-2');
    expect(result.ok).toBe(true);

    const templates = await db.select().from(schema.promptTemplates);
    const tmpl1 = templates.find(t => t.id === 'tmpl-1');
    const tmpl2 = templates.find(t => t.id === 'tmpl-2');

    expect(tmpl1?.isActive).toBe(false);
    expect(tmpl2?.isActive).toBe(true);
  });

  it('should return NOT_FOUND error if template does not exist', async () => {
    const result = await activateTemplate(db, null, 'tmpl-999');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
