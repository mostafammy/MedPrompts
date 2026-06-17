'use client';

import * as Icons from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/audio';
import { haptics } from '@/lib/haptics';

interface ShareButtonProps {
  subject: string;
  topic: string;
  isHeaderInline?: boolean;
}

export function ShareButton({ subject, topic, isHeaderInline = false }: ShareButtonProps) {
  // Lazy initialisers run once on mount — browser APIs are safe here
  // because this is a 'use client' component and never runs on the server.
  const [url] = useState(() =>
    typeof window !== 'undefined' ? window.location.href : ''
  );
  const [canShare] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );

  const handleShare = async () => {
    soundEngine.playClick();
    haptics.tap();

    const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} in ${subject} | MedPrompts`;
    const text = `Check out this highly structured study prompt for ${topic} on MedPrompts!`;

    if (canShare) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        soundEngine.playSuccess();
        haptics.success();
      } catch (err: unknown) {
        // User aborted share or it failed
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed', err);
        }
      }
    } else {
      // Fallback: Copy URL to clipboard
      try {
        await navigator.clipboard.writeText(url);
        soundEngine.playSuccess();
        haptics.success();
        toast.success('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
        toast.error('Failed to copy link');
      }
    }
  };

  const buttonClasses = isHeaderInline
    ? "h-full w-full px-3 py-1.5 flex items-center justify-center gap-1.5 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200/50 dark:border-blue-800/50 transition-all duration-300 backdrop-blur-sm"
    : "w-full py-2.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all duration-300";

  return (
    <button onClick={handleShare} className={buttonClasses}>
      <Icons.Share2 className={isHeaderInline ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
      <span className={isHeaderInline ? "hidden lg:inline" : ""}>
        Share Link
      </span>
    </button>
  );
}
