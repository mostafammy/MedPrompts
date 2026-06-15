import { describe, it, expect } from 'vitest';
import { createDb } from '../../src/lib/db/client';

describe('createDb', () => {
  it('should create independent database instances', () => {
    const env = { TURSO_DATABASE_URL: 'libsql://dummy.turso.io', TURSO_AUTH_TOKEN: 'dummy' };
    const db1 = createDb(env);
    const db2 = createDb(env);
    expect(db1).not.toBe(db2);
  });
});
