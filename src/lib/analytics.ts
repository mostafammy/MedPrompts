import { SubjectId, Slug } from './types/branded';

declare global {
  interface Window {
    plausible?: (event: string, options?: { props: Record<string, string | number | boolean> }) => void;
  }
}

export interface Analytics {
  trackPromptGenerated(subject: SubjectId, slug: Slug, latencyMs: number): void;
  trackPromptCopied(subject: SubjectId, method: string): void;
  trackSharedUrlVisited(subject: SubjectId, source: string): void;
}

export const plausibleAnalytics: Analytics = {
  trackPromptGenerated(subject: SubjectId, slug: Slug, latencyMs: number) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Prompt Generated', {
        props: { subject, slug, latencyMs }
      });
    }
  },
  
  trackPromptCopied(subject: SubjectId, method: string) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Prompt Copied', {
        props: { subject, method }
      });
    }
  },
  
  trackSharedUrlVisited(subject: SubjectId, source: string) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Shared URL Visited', {
        props: { subject, source }
      });
    }
  }
};

export const noopAnalytics: Analytics = {
  trackPromptGenerated() {},
  trackPromptCopied() {},
  trackSharedUrlVisited() {}
};
