import { describe, it, expect, vi } from 'vitest';
import { StubVersionWriter } from '../../src/lib/prompts/version-writer';
import { ok, err } from '../../src/lib/types/result';
import type { PromptTemplate } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/client', () => ({
  Database: class {},
}));

describe('DatabaseVersionWriter', () => {
  it.skip('requires database integration test', () => {
    // Integration test — requires real database connection
  });
});

describe('StubVersionWriter', () => {
  it('returns configured success result', async () => {
    const mockTemplate = { id: 'tpl-1', semver: '1.0.0' } as PromptTemplate;
    const writer = new StubVersionWriter(ok(mockTemplate));

    const result = await writer.createVersion({} as any, {
      subjectId: 'pathology' as any,
      template: 'test template',
      semver: '1.0.0',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('tpl-1');
    }
  });

  it('returns configured error result', async () => {
    const writer = new StubVersionWriter(err({ code: 'INVALID_SEMVER', message: 'Bad version' }));

    const result = await writer.createVersion({} as any, {
      subjectId: 'pathology' as any,
      template: 'test template',
      semver: 'invalid',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_SEMVER');
    }
  });
});
