'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface GradientColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

function AmbientBackgroundInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check pathname (e.g. /pathology/topic -> pathology)
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && segments[0] !== 'subject') {
      setActiveSubject(segments[0] || null);
      return;
    }

    // 2. Check search params (e.g. ?subject=anatomy)
    const querySubject = searchParams.get('subject');
    if (querySubject) {
      setActiveSubject(querySubject);
      return;
    }

    // 3. Fallback to default
    setActiveSubject(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    // 4. Custom event listener for interactive dashboard clicks
    const handleSubjectChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setActiveSubject(customEvent.detail);
    };

    window.addEventListener('medprompts-subject-change', handleSubjectChange);
    return () => {
      window.removeEventListener('medprompts-subject-change', handleSubjectChange);
    };
  }, []);

  const colors = getThemeColors(activeSubject);

  return (
    <div className="absolute inset-0 -z-50 overflow-hidden pointer-events-none bg-zinc-50 dark:bg-zinc-950 transition-colors duration-1000">
      {/* Aurora Orb 1 */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.15] dark:opacity-[0.08] filter blur-[100px] transition-all duration-1000 animate-[pulse_8s_ease-in-out_infinite] will-change-[transform,opacity]"
        style={{
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`
        }}
      />
      {/* Aurora Orb 2 */}
      <div 
        className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-[0.15] dark:opacity-[0.06] filter blur-[100px] transition-all duration-1000 animate-[pulse_12s_ease-in-out_infinite] will-change-[transform,opacity] delay-1000"
        style={{
          background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)`
        }}
      />
      {/* Aurora Orb 3 */}
      <div 
        className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-[0.12] dark:opacity-[0.05] filter blur-[100px] transition-all duration-1000 animate-[pulse_10s_ease-in-out_infinite] will-change-[transform,opacity] delay-2000"
        style={{
          background: `radial-gradient(circle, ${colors.tertiary} 0%, transparent 70%)`
        }}
      />
    </div>
  );
}

function getThemeColors(subject: string | null): GradientColors {
  switch (subject?.toLowerCase()) {
    case 'pathology':
      return { primary: '#f43f5e', secondary: '#ec4899', tertiary: '#fda4af' }; // rose / pink
    case 'anatomy':
      return { primary: '#3b82f6', secondary: '#06b6d4', tertiary: '#93c5fd' }; // blue / cyan
    case 'physiology':
      return { primary: '#10b981', secondary: '#14b8a6', tertiary: '#6ee7b7' }; // emerald / teal
    case 'pharmacology':
      return { primary: '#8b5cf6', secondary: '#d946ef', tertiary: '#c084fc' }; // purple / fuchsia
    case 'microbiology':
      return { primary: '#f59e0b', secondary: '#f97316', tertiary: '#fde047' }; // amber / orange
    case 'biochemistry':
      return { primary: '#14b8a6', secondary: '#6366f1', tertiary: '#818cf8' }; // teal / indigo
    default:
      // Neutral glowing white/zinc gradient if no subject is active
      return { primary: '#cbd5e1', secondary: '#e2e8f0', tertiary: '#f1f5f9' };
  }
}

export function AmbientBackground() {
  return (
    <Suspense fallback={null}>
      <AmbientBackgroundInner />
    </Suspense>
  );
}
