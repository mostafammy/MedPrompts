import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { plausibleAnalytics } from '../../src/lib/analytics';
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
});
