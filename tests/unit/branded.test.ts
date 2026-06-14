import { describe, it, expect } from 'vitest';
import { Topic, SubjectId, Slug } from '../../src/lib/types/branded';
import { isOk, isErr } from '../../src/lib/types/result';

describe('Branded types', () => {
  describe('Topic', () => {
    it('parses valid topics', () => {
      expect(isOk(Topic.parse('Heart Failure'))).toBe(true);
    });
    it('fails empty', () => {
      expect(isErr(Topic.parse('   '))).toBe(true);
    });
    it('fails too long', () => {
      expect(isErr(Topic.parse('A'.repeat(121)))).toBe(true);
    });
  });

  describe('SubjectId', () => {
    it('parses valid', () => {
      expect(isOk(SubjectId.parse('cardiology'))).toBe(true);
      expect(isOk(SubjectId.parse('internal-medicine'))).toBe(true);
    });
    it('fails uppercase', () => {
      expect(isErr(SubjectId.parse('Cardiology'))).toBe(true);
    });
  });

  describe('Slug', () => {
    it('parses valid', () => {
      expect(isOk(Slug.parse('heart-failure'))).toBe(true);
    });
    it('fails invalid chars', () => {
      expect(isErr(Slug.parse('Heart Failure'))).toBe(true);
    });
  });
});
