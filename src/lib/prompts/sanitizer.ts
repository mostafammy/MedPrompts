import { Result, ok, err } from '../types/result';
import { SanitizedTopic } from '../types/branded';

export type SanitizationError = 
  | { code: 'EMPTY_INPUT'; message: string }
  | { code: 'TOO_LONG'; message: string }
  | { code: 'INVALID_CHARACTERS'; message: string }
  | { code: 'INJECTION_PATTERN_DETECTED'; message: string };

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /you are now/i,
  /pretend to be/i,
  /system prompt/i,
  /reveal your/i,
  /disregard/i,
  /DAN/i,
  /jailbreak/i
];

const ALLOWED_CHARS = /^[\p{L}\p{N}\s\-,.'!?&()]+$/u;

/**
 * @pure
 * @throws Never
 */
export function sanitizeTopic(input: string): Result<SanitizedTopic, SanitizationError> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return err({ code: 'EMPTY_INPUT', message: 'Input cannot be empty' });
  if (trimmed.length > 120) return err({ code: 'TOO_LONG', message: 'Input exceeds 120 characters' });

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return err({ code: 'INJECTION_PATTERN_DETECTED', message: 'Suspicious pattern detected' });
    }
  }

  if (!ALLOWED_CHARS.test(trimmed)) {
    return err({ code: 'INVALID_CHARACTERS', message: 'Input contains invalid characters' });
  }

  return ok(trimmed as SanitizedTopic);
}
