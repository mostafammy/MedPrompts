import { describe, it, expect, beforeAll } from 'vitest';
import { Database } from '../../src/lib/db/client';
import { getActiveTemplate } from '../../src/lib/prompts/loader';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../src/lib/db/schema';
import { SubjectId } from '../../src/lib/types/branded';

describe('getActiveTemplate', () => {
  let db: Database;

  beforeAll(async () => {
    const client = createClient({ url: 'file:test-loader.db' });
    db = drizzle(client, { schema });
    
    // Create tables
    await client.execute('CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, label TEXT NOT NULL, icon TEXT NOT NULL, sort_order INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS prompt_templates (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, template TEXT NOT NULL, version INTEGER NOT NULL, semver TEXT NOT NULL DEFAULT \'1.0.0\', version_major INTEGER NOT NULL DEFAULT 1, version_minor INTEGER NOT NULL DEFAULT 0, version_patch INTEGER NOT NULL DEFAULT 0, checksum TEXT NOT NULL DEFAULT \'\', is_active INTEGER NOT NULL DEFAULT 0, changelog TEXT, created_at INTEGER NOT NULL, is_interactive INTEGER NOT NULL DEFAULT 0, required_variables TEXT NOT NULL DEFAULT \'[]\', FOREIGN KEY (subject_id) REFERENCES subjects(id))');
    await client.execute('CREATE TABLE IF NOT EXISTS template_versions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, semver TEXT NOT NULL, template TEXT NOT NULL, checksum TEXT NOT NULL, changelog TEXT, parent_semver TEXT, activated_by TEXT NOT NULL, activated_at INTEGER NOT NULL, deactivated_at INTEGER, FOREIGN KEY (template_id) REFERENCES prompt_templates(id))');
    
    // Seed
    await client.execute("INSERT OR REPLACE INTO subjects (id, label, icon, sort_order, created_at) VALUES ('pathology', 'Pathology', 'microscope', 1, 0)");
    await client.execute("INSERT OR REPLACE INTO prompt_templates (id, subject_id, template, version, semver, version_major, version_minor, version_patch, checksum, is_active, created_at) VALUES ('tmpl-1', 'pathology', 'Template V1', 1, '1.0.0', 1, 0, 0, '', 0, 0)");
    await client.execute("INSERT OR REPLACE INTO prompt_templates (id, subject_id, template, version, semver, version_major, version_minor, version_patch, checksum, is_active, created_at) VALUES ('tmpl-2', 'pathology', 'Template V2', 2, '2.0.0', 2, 0, 0, '', 1, 0)");
  });

  it('should return the active template for a known subject', async () => {
    const result = await getActiveTemplate(db, 'pathology' as SubjectId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('tmpl-2');
    expect(result?.isActive).toBe(true);
  });

  it('should return null for an unknown subject', async () => {
    const result = await getActiveTemplate(db, 'unknown' as SubjectId);
    expect(result).toBeNull();
  });
});
