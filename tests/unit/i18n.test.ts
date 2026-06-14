import { describe, it, expect } from 'vitest';
import { en, ar, t } from '../../src/lib/i18n/messages';

describe('i18n messages', () => {
  it('should return correct english string', () => {
    expect(t(en, 'actions.copy')).toBe('Copy');
  });

  it('should return correct arabic string', () => {
    expect(t(ar, 'actions.copy')).toBe('نسخ');
  });

  it('should interpolate variables if provided', () => {
    const dummyMessages = { ...en, 'errors.generic': 'Error: {{code}}' } as any;
    expect(t(dummyMessages, 'errors.generic', { code: 404 })).toBe('Error: 404');
  });
});
