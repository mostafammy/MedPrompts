import { describe, it, expect, vi } from 'vitest';
import {
  StubVersionActivator,
  ConcurrentActivationError,
} from '../../src/lib/prompts/version-activator';
import { SemVer } from '../../src/lib/prompts/semver';

describe('ConcurrentActivationError', () => {
  it('creates error with subjectId', () => {
    const error = new ConcurrentActivationError('pathology');
    expect(error.message).toContain('pathology');
    expect(error.subjectId).toBe('pathology');
    expect(error.name).toBe('ConcurrentActivationError');
  });
});

describe('StubVersionActivator', () => {
  it('records activate call parameters', async () => {
    const activator = new StubVersionActivator();
    await activator.activate('tpl-1', 'user-42');

    expect(activator.lastCall.templateId).toBe('tpl-1');
    expect(activator.lastCall.activatedBy).toBe('user-42');
  });

  it('records rollback call parameters', async () => {
    const activator = new StubVersionActivator();
    const target = SemVer.unsafeParse(1, 0, 0);
    await activator.rollback('pathology' as any, target, 'user-42');

    expect(activator.lastCall.subjectId).toBe('pathology');
    expect(activator.lastCall.targetSemver).toBe(target);
    expect(activator.lastCall.activatedBy).toBe('user-42');
  });

  it('returns configured result', async () => {
    const errResult = { ok: false as const, error: { code: 'NOT_FOUND' as const, templateId: 'tpl-1' } };
    const activator = new StubVersionActivator(errResult);

    const result = await activator.activate('tpl-1', 'user-42');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('handles rollback result correctly', async () => {
    const target = SemVer.unsafeParse(1, 0, 0);
    const activator = new StubVersionActivator();
    const result = await activator.rollback('pathology' as any, target, 'admin-1');

    expect(result.ok).toBe(true);
    expect(activator.lastCall.targetSemver?.major).toBe(1);
    expect(activator.lastCall.targetSemver?.minor).toBe(0);
    expect(activator.lastCall.targetSemver?.patch).toBe(0);
  });

  it('handles rollback with NOT_FOUND error', async () => {
    const target = SemVer.unsafeParse(3, 0, 0);
    const errResult = { ok: false as const, error: { code: 'NOT_FOUND' as const, templateId: '3.0.0' } };
    const activator = new StubVersionActivator(errResult);

    const result = await activator.rollback('pathology' as any, target, 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('handles rollback with identity_detected error (checksum mismatch)', async () => {
    const target = SemVer.unsafeParse(2, 0, 0);
    const errResult = { ok: false as const, error: { code: 'IDENTITY_DETECTED' as const, message: 'Checksum mismatch' } };
    const activator = new StubVersionActivator(errResult);

    const result = await activator.rollback('pathology' as any, target, 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IDENTITY_DETECTED');
    }
  });

  it('handles major activation (subject-scoped invalidation)', async () => {
    const activator = new StubVersionActivator();
    const result = await activator.activate('tpl-major', 'user-42');

    expect(result.ok).toBe(true);
    expect(activator.lastCall.templateId).toBe('tpl-major');
    expect(activator.lastCall.activatedBy).toBe('user-42');
  });

  it('handles minor activation (version-scoped invalidation)', async () => {
    const activator = new StubVersionActivator();
    const result = await activator.activate('tpl-minor', 'user-42');

    expect(result.ok).toBe(true);
    expect(activator.lastCall.templateId).toBe('tpl-minor');
    expect(activator.lastCall.activatedBy).toBe('user-42');
  });

  it('handles patch activation (no invalidation)', async () => {
    const activator = new StubVersionActivator();
    const result = await activator.activate('tpl-patch', 'user-42');

    expect(result.ok).toBe(true);
  });

  it('handles concurrent activation error', async () => {
    const errResult = { ok: false as const, error: { code: 'CONCURRENT_ACTIVATION' as const, message: 'Concurrent activation detected' } };
    const activator = new StubVersionActivator(errResult);

    const result = await activator.activate('tpl-conflict', 'user-42');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONCURRENT_ACTIVATION');
    }
  });

  it('handles concurrent activation error on rollback', async () => {
    const target = SemVer.unsafeParse(1, 0, 0);
    const errResult = { ok: false as const, error: { code: 'CONCURRENT_ACTIVATION' as const, message: 'Concurrent activation detected' } };
    const activator = new StubVersionActivator(errResult);

    const result = await activator.rollback('pathology' as any, target, 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONCURRENT_ACTIVATION');
    }
  });
});
