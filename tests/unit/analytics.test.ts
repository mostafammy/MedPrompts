import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { plausibleAnalytics, noopAnalytics } from '../../src/lib/analytics';
import type { VersionActivationEvent } from '../../src/lib/analytics';
import { SubjectId, Slug } from '../../src/lib/types/branded';

describe('plausibleAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { plausible: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should track prompt generated', () => {
    plausibleAnalytics.trackPromptGenerated('pathology' as SubjectId, 'mi' as Slug, 150);
    expect(window.plausible).toHaveBeenCalledWith('Prompt Generated', {
      props: { subject: 'pathology', slug: 'mi', latencyMs: 150 }
    });
  });

  it('should track prompt copied', () => {
    plausibleAnalytics.trackPromptCopied('pathology' as SubjectId, 'navigator');
    expect(window.plausible).toHaveBeenCalledWith('Prompt Copied', {
      props: { subject: 'pathology', method: 'navigator' }
    });
  });

  it('should track shared url visited', () => {
    plausibleAnalytics.trackSharedUrlVisited('pathology' as SubjectId, 'twitter');
    expect(window.plausible).toHaveBeenCalledWith('Shared URL Visited', {
      props: { subject: 'pathology', source: 'twitter' }
    });
  });

  it('should track version activation with all fields', () => {
    const event: VersionActivationEvent = {
      subjectId: 'pathology',
      oldSemver: '1.0.0',
      newSemver: '2.0.0',
      bumpType: 'major',
      invalidationScope: 'SUBJECT',
      durationMs: 150,
      success: true,
      activatedBy: 'user-42',
    };

    plausibleAnalytics.trackVersionActivation(event);
    expect(window.plausible).toHaveBeenCalledWith('Version Activated', { props: event });
  });

  it('should track version activation with activation failure', () => {
    const event: VersionActivationEvent = {
      subjectId: 'pathology',
      oldSemver: '1.0.0',
      newSemver: '1.0.1',
      bumpType: 'patch',
      invalidationScope: 'NONE',
      durationMs: 50,
      success: false,
      activatedBy: 'user-42',
    };

    plausibleAnalytics.trackVersionActivation(event);
    expect(window.plausible).toHaveBeenCalledWith('Version Activated', { props: event });
  });

  it('should track minor activation with version-scoped invalidation', () => {
    const event: VersionActivationEvent = {
      subjectId: 'cardiology',
      oldSemver: '1.1.0',
      newSemver: '1.2.0',
      bumpType: 'minor',
      invalidationScope: 'VERSION',
      durationMs: 200,
      success: true,
      activatedBy: 'prompt-eng-1',
    };

    plausibleAnalytics.trackVersionActivation(event);
    expect(window.plausible).toHaveBeenCalledWith('Version Activated', { props: event });
  });

  it('should include rollback telemetry with old/new semver', () => {
    const event: VersionActivationEvent = {
      subjectId: 'neurology',
      oldSemver: '3.0.0',
      newSemver: '2.1.5',
      bumpType: 'major',
      invalidationScope: 'SUBJECT',
      durationMs: 300,
      success: true,
      activatedBy: 'admin-1',
    };

    plausibleAnalytics.trackVersionActivation(event);
    expect(window.plausible).toHaveBeenCalledWith('Version Activated', { props: event });
  });

  it('should handle missing window.plausible gracefully', () => {
    vi.stubGlobal('window', undefined);
    const event: VersionActivationEvent = {
      subjectId: 'pathology',
      oldSemver: '1.0.0',
      newSemver: '1.0.1',
      bumpType: 'patch',
      invalidationScope: 'NONE',
      durationMs: 100,
      success: true,
      activatedBy: 'user-42',
    };

    expect(() => plausibleAnalytics.trackVersionActivation(event)).not.toThrow();
  });
});

describe('noopAnalytics', () => {
  it('should not throw on trackVersionActivation', () => {
    const event: VersionActivationEvent = {
      subjectId: 'pathology',
      oldSemver: '1.0.0',
      newSemver: '2.0.0',
      bumpType: 'major',
      invalidationScope: 'SUBJECT',
      durationMs: 150,
      success: true,
      activatedBy: 'user-42',
    };

    expect(() => noopAnalytics.trackVersionActivation(event)).not.toThrow();
  });

  it('should not throw on trackVersionActivation with failure event', () => {
    const event: VersionActivationEvent = {
      subjectId: 'pathology',
      oldSemver: '1.0.0',
      newSemver: '1.0.1',
      bumpType: 'patch',
      invalidationScope: 'NONE',
      durationMs: 50,
      success: false,
      activatedBy: 'system',
    };

    expect(() => noopAnalytics.trackVersionActivation(event)).not.toThrow();
  });
});
