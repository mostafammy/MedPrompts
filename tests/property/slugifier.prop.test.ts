import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { slugifyTopic } from '../../src/lib/prompts/slugifier';

describe('slugifyTopic property tests', () => {
  it('should only contain url-safe characters (or be "unknown")', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const slug = slugifyTopic(str);
        expect(slug).toMatch(/^[a-z0-9-]+$/);
      })
    );
  });

  it('should be idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const first = slugifyTopic(str);
        const second = slugifyTopic(first);
        expect(second).toBe(first);
      })
    );
  });

  it('should never exceed 74 characters', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const slug = slugifyTopic(str);
        expect(slug.length).toBeLessThanOrEqual(74);
      })
    );
  });

  it('should have collision resistance for long topics with different endings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 80 }), fc.string({ minLength: 1, maxLength: 5 }), fc.string({ minLength: 1, maxLength: 5 }), (base, ending1, ending2) => {
        if (ending1 !== ending2) {
          const topic1 = base + ending1;
          const topic2 = base + ending2;
          const slug1 = slugifyTopic(topic1);
          const slug2 = slugifyTopic(topic2);
          if (slug1 !== 'unknown' && slug2 !== 'unknown') {
            expect(slug1).not.toBe(slug2);
          }
        }
      })
    );
  });
});
