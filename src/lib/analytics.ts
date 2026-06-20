import { SubjectId, Slug } from './types/branded';

declare global {
  interface Window {
    plausible?: (event: string, options?: { props: Record<string, string | number | boolean> }) => void;
  }
}

export type VersionActivationEvent = {
  subjectId: string;
  oldSemver: string;
  newSemver: string;
  bumpType: string;
  invalidationScope: string;
  durationMs: number;
  success: boolean;
  activatedBy: string;
};

export interface Analytics {
  trackPromptGenerated(subject: SubjectId, slug: Slug, latencyMs: number): void;
  trackPromptCopied(subject: SubjectId, method: string): void;
  trackSharedUrlVisited(subject: SubjectId, source: string): void;
  trackVersionActivation(event: VersionActivationEvent): void;
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
  },

  trackVersionActivation(event: VersionActivationEvent) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Version Activated', { props: event });
    }
  },
};

export const noopAnalytics: Analytics = {
  trackPromptGenerated() {},
  trackPromptCopied() {},
  trackSharedUrlVisited() {},
  trackVersionActivation() {},
};
