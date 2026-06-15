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
    // Mirrors slugifyTopic's normalization to derive the canonical body oracle.
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    fc.assert(
      fc.property(fc.string({ minLength: 80 }), fc.string({ minLength: 1, maxLength: 5 }), fc.string({ minLength: 1, maxLength: 5 }), (base, ending1, ending2) => {
        if (ending1 !== ending2) {
          const topic1 = base + ending1;
          const topic2 = base + ending2;
          const slug1 = slugifyTopic(topic1);
          const slug2 = slugifyTopic(topic2);

          if (slug1 !== 'unknown' && slug2 !== 'unknown' && slug1 !== slug2) {
            // Different slugs must originate from different normalized bodies —
            // verifies the hash is doing real collision-resistance work.
            const body1 = normalize(topic1);
            const body2 = normalize(topic2);
            expect(body1).not.toBe(body2);
          } else if (slug1 !== 'unknown' && slug2 !== 'unknown' && slug1 === slug2) {
            // Equal slugs are only valid when normalization collapsed the raw
            // inputs to the same body (e.g. ' ' vs '!' both strip away).
            // Compare the source bodies directly — NOT re-extracted from equal slugs.
            const body1 = normalize(topic1);
            const body2 = normalize(topic2);
            expect(body1).toBe(body2);
          }
        }
      })
    );
  });
});
