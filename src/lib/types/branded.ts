import { Result, ok, err } from './result';

declare const brand: unique symbol;

/**
 * @pure Branded type utility
 */
export type Branded<T, B> = T & { readonly [brand]: B };

export type Topic = Branded<string, 'Topic'>;
export type SubjectId = Branded<string, 'SubjectId'>;
export type Slug = Branded<string, 'Slug'>;
export type SanitizedTopic = Branded<string, 'SanitizedTopic'>;

export type ValidationError = {
  code: string;
  message: string;
};

export const Topic = {
  parse(s: string): Result<Topic, ValidationError> {
    const trimmed = s.trim();
    if (trimmed.length < 1) return err({ code: 'TOO_SHORT', message: 'Topic must be at least 1 character' });
    if (trimmed.length > 120) return err({ code: 'TOO_LONG', message: 'Topic must be at most 120 characters' });
    return ok(trimmed as Topic);
  },
  /**
   * @throws Never use in production. Test fixtures only.
   */
  unsafeParse(s: string): Topic {
    return s as Topic;
  }
};

export const SubjectId = {
  parse(s: string): Result<SubjectId, ValidationError> {
    if (/^[a-z][a-z0-9-]*$/.test(s)) {
      return ok(s as SubjectId);
    }
    return err({ code: 'INVALID_FORMAT', message: 'Subject ID must be lowercase alphanumeric with hyphens' });
  },
  unsafeParse(s: string): SubjectId {
    return s as SubjectId;
  }
};

export const Slug = {
  parse(s: string): Result<Slug, ValidationError> {
    if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 74) {
      return ok(s as Slug);
    }
    return err({ code: 'INVALID_FORMAT', message: 'Slug must be valid format and max 74 chars' });
  },
  unsafeParse(s: string): Slug {
    return s as Slug;
  }
};
