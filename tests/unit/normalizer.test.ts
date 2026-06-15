import { describe, it, expect } from 'vitest';
import { abbreviationNormalizer } from '../../src/lib/prompts/normalizer/abbreviation';
import { identityNormalizer } from '../../src/lib/prompts/normalizer/identity';
import { SubjectId } from '../../src/lib/types/branded';
import { NormalizerContext, NormalizerEnv } from '../../src/lib/prompts/normalizer/contract';

const dummyContext: NormalizerContext = { subjectId: 'pathology' as SubjectId, raw: '' };
const dummyEnv: NormalizerEnv = { hasApiKey: false, userPlan: 'free' };

describe('abbreviationNormalizer', () => {
  it('should normalize known abbreviations', async () => {
    const result = await abbreviationNormalizer.normalize('mi', dummyContext);
    expect(result.cleaned).toBe('Myocardial Infarction');
    expect(result.confidence).toBe(0.95);
    expect(result.strategy).toBe('abbreviation');
  });

  it('should correct known typos', async () => {
    const result = await abbreviationNormalizer.normalize('alzhimers', dummyContext);
    expect(result.cleaned).toBe("Alzheimer's Disease");
    expect(result.confidence).toBe(0.85);
    expect(result.strategy).toBe('abbreviation');
  });

  it('should pass through unknown text', async () => {
    const result = await abbreviationNormalizer.normalize('Unknown Disease', dummyContext);
    expect(result.cleaned).toBe('Unknown Disease');
    expect(result.confidence).toBe(1.0);
    expect(result.strategy).toBe('unchanged');
  });

  it('should be enabled by default', () => {
    expect(abbreviationNormalizer.isEnabled(dummyEnv)).toBe(true);
  });
});

describe('identityNormalizer', () => {
  it('should trim whitespace and pass through', async () => {
    const result = await identityNormalizer.normalize('  Myocardial  ', dummyContext);
    expect(result.cleaned).toBe('Myocardial');
    expect(result.confidence).toBe(1.0);
    expect(result.strategy).toBe('unchanged');
  });

  it('should be enabled by default', () => {
    expect(identityNormalizer.isEnabled(dummyEnv)).toBe(true);
  });
});
