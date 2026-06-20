import { describe, it, expect, vi } from 'vitest';
import { DatabaseVersionReader, StubVersionReader } from '../../src/lib/prompts/version-reader';
import type { PromptTemplate, TemplateVersion } from '../../src/lib/db/schema';

vi.mock('../../src/lib/db/client', () => ({
  Database: class {},
}));

describe('DatabaseVersionReader', () => {
  it.skip('requires database integration test', () => {
    // Integration test — requires real database connection
  });
});

describe('StubVersionReader', () => {
  it('returns active template set via withActive', async () => {
    const reader = new StubVersionReader();
    const mockTemplate = { id: 'tpl-1', subjectId: 'pathology', semver: '1.0.0' } as PromptTemplate;
    reader.withActive('pathology', mockTemplate);

    const result = await reader.getActive({} as any, 'pathology' as any);
    expect(result).toBe(mockTemplate);
  });

  it('returns null when no active template is set', async () => {
    const reader = new StubVersionReader();
    const result = await reader.getActive({} as any, 'pathology' as any);
    expect(result).toBeNull();
  });

  it('returns history set via withHistory', async () => {
    const reader = new StubVersionReader();
    const history = [
      { id: 'v1', semver: '2.0.0' },
      { id: 'v2', semver: '1.0.0' },
    ] as TemplateVersion[];
    reader.withHistory('pathology', history);

    const result = await reader.getHistory({} as any, 'pathology' as any);
    expect(result).toHaveLength(2);
    expect(result[0]!.semver).toBe('2.0.0');
  });

  it('returns empty array when no history is set', async () => {
    const reader = new StubVersionReader();
    const result = await reader.getHistory({} as any, 'pathology' as any);
    expect(result).toEqual([]);
  });
});
