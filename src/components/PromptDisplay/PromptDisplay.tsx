'use client';

import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/audio';
import { haptics } from '@/lib/haptics';
import { copyToClipboard } from '@/lib/clipboard';
import { CopyButton } from '../CopyEngine/CopyButton';
import { DeepLinkButton } from './DeepLinkButton';
import { ShareButton } from './ShareButton';
import { SubjectId } from '@/lib/types/branded';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { Spotlight } from '@/components/ui/Spotlight';
import { useRouter } from 'next/navigation';
import { usePullToClear } from '@/hooks/usePullToClear';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { TTSPlayer } from './TTSPlayer';
import { FloatingActionBar } from '../ui/FloatingActionBar';
import { useContainerScrollDirection } from '@/hooks/useContainerScrollDirection';

export interface PromptDisplayProps {
  prompt: string;
  subject: string;
  topic: string;
  wordCount: number;
  fromCache: boolean;
}

export function PromptDisplay({ prompt, subject, topic, wordCount, fromCache: _fromCache }: PromptDisplayProps) {
  const router = useRouter();
  const scrollContainerRef = usePullToClear<HTMLDivElement>(() => {
    soundEngine.playClick();
    haptics.tap();
    router.push(`/${subject}`);
  });
  
  const isBarVisible = useContainerScrollDirection(scrollContainerRef);
  
  const lastTapTimeRef = useRef<number>(0);
  const { toggleBookmark, isBookmarked, addHistoryItem } = usePromptHistory();

  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [fontSizeMounted, setFontSizeMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('medprompts_font_size');
    if (saved === 'sm' || saved === 'md' || saved === 'lg') {
      setFontSize(saved);
    }
    setFontSizeMounted(true);
  }, []);

  const cycleFontSize = () => {
    haptics.tap();
    setFontSize(prev => {
      let next: 'sm' | 'md' | 'lg';
      if (prev === 'sm') next = 'md';
      else if (prev === 'md') next = 'lg';
      else next = 'sm';
      
      localStorage.setItem('medprompts_font_size', next);
      return next;
    });
  };

  // Log to history on mount
  useEffect(() => {
    addHistoryItem({
      subject,
      topic,
      wordCount,
      promptText: prompt
    });
  }, [addHistoryItem, subject, topic, wordCount, prompt]);


  const handleDoubleTap = async (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const lastTap = lastTapTimeRef.current;
    
    if (lastTap > 0 && now - lastTap < 400) {
      // It's a double tap
      e.preventDefault();
      lastTapTimeRef.current = 0;
      
      const success = await copyToClipboard(prompt);
      if (success) {
        soundEngine.playSuccess();
        haptics.success();
        toast.success('Prompt copied via double-tap!');
      }
    } else {
      lastTapTimeRef.current = now;
    }
  };

  return (
    <>
    <motion.article 
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
      aria-label={`${subject} prompt for ${topic}`} 
      className="w-full max-w-4xl mx-auto mt-12 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl saturate-150 rounded-3xl shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden relative"
    >
      <Spotlight className="h-full w-full">
        <div className="relative z-10">
          {/* Terminal Mock Header */}
          <div className="bg-zinc-950/90 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900/50">
        <div className="flex items-center gap-3">
          {/* Window Control Dots */}
          <div className="flex gap-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-inner" />
          </div>
          <div className="h-4 w-[1px] bg-zinc-800 mx-1 hidden sm:block" />
          <div>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <span className="text-blue-400 capitalize drop-shadow-sm">{subject}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-200">{topic}</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end w-full sm:w-auto">
          <div className="hidden sm:flex items-center gap-2">
            <TTSPlayer text={prompt} />
            
            <button
              onClick={() => {
                toggleBookmark({ subject, topic, wordCount, promptText: prompt });
                if (isBookmarked(subject, topic)) {
                  haptics.tap();
                  soundEngine.playSwoop();
                  toast.success('Removed from bookmarks');
                } else {
                  haptics.success();
                  soundEngine.playSuccess();
                  toast.success('Saved to bookmarks!');
                }
              }}
              aria-label={isBookmarked(subject, topic) ? "Remove Bookmark" : "Add Bookmark"}
              className="p-1.5 rounded-full border border-zinc-800 hover:bg-zinc-900 transition-colors group cursor-pointer flex items-center justify-center"
            >
              <Icons.Star
                className={`w-3.5 h-3.5 transition-transform group-active:scale-125 ${
                  isBookmarked(subject, topic)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              />
            </button>

            <button
              onClick={cycleFontSize}
              title={`Change font size (current: ${fontSize})`}
              aria-label="Cycle Font Size"
              className="p-1.5 rounded-full border border-zinc-800 hover:bg-zinc-900 transition-colors text-zinc-500 hover:text-zinc-350 flex items-center gap-1 cursor-pointer"
            >
              <Icons.Type className="w-3.5 h-3.5 shrink-0" />
              {fontSizeMounted && (
                <span className="text-[9px] font-extrabold uppercase select-none px-0.5 min-w-[12px] text-zinc-400">
                  {fontSize}
                </span>
              )}
            </button>
          </div>
          
          <span className="px-2.5 py-1 text-zinc-400 text-xs font-medium flex items-center gap-1.5 select-none border border-zinc-800/60 rounded-full bg-zinc-900/40 shrink-0">
            <Icons.FileText className="w-3.5 h-3.5 text-zinc-500" />
            {wordCount} words
          </span>
          
          {/* Header actions: ChatGPT Deep Link & Copy Button */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative h-9">
              <DeepLinkButton
                textToCopy={prompt}
                subjectId={subject as SubjectId}
                targetApp="chatgpt"
                label="ChatGPT"
                isHeaderInline={true}
                icon={
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.108a4.4735 4.4735 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-2.1466zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829 14.6174 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.809 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4592a.7948.7948 0 0 0-.3927.6813v6.7225zm1.0855-3.0941l2.6086-1.5034 2.6086 1.5034v3.0069l-2.6086 1.5034-2.6086-1.5034v-3.0069z" />
                  </svg>
                }
              />
            </div>
            <div className="relative h-9 sm:w-24">
              <ShareButton subject={subject} topic={topic} isHeaderInline={true} />
            </div>
            <div className="relative h-9 sm:w-24">
              <CopyButton textToCopy={prompt} isHeaderInline={true} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Code / Prompt Body */}
      <div 
        ref={scrollContainerRef}
        className="p-4 sm:p-8 bg-zinc-50/50 dark:bg-zinc-950/50 max-h-[600px] overflow-y-auto relative selection:bg-blue-200 dark:selection:bg-blue-900/50 custom-scrollbar overscroll-y-none"
      >
        <pre 
          onClick={handleDoubleTap}
          className={`whitespace-pre-wrap font-mono text-zinc-800 dark:text-zinc-300 select-text cursor-text ${
            fontSize === 'sm'
              ? 'text-[12px] md:text-[13px] leading-relaxed'
              : fontSize === 'lg'
              ? 'text-base md:text-lg leading-relaxed'
              : 'text-sm md:text-[15px] leading-relaxed'
          }`}
        >
          <code>{prompt}</code>
        </pre>
      </div>

      {/* Action Footer */}
      <div className="hidden sm:flex bg-zinc-100/30 dark:bg-zinc-950/30 px-4 sm:px-6 py-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex-col sm:flex-row gap-4 items-center justify-between backdrop-blur-md">
        <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
          Ready to study? Copy the prompt or open it directly:
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <CopyButton textToCopy={prompt} isHeaderInline={false} />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <DeepLinkButton
              textToCopy={prompt}
              subjectId={subject as SubjectId}
              targetApp="chatgpt"
              label="ChatGPT"
              icon={
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.108a4.4735 4.4735 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-2.1466zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829 14.6174 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.809 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4592a.7948.7948 0 0 0-.3927.6813v6.7225zm1.0855-3.0941l2.6086-1.5034 2.6086 1.5034v3.0069l-2.6086 1.5034-2.6086-1.5034v-3.0069z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
      </div>
      </Spotlight>
    </motion.article>

    {/* Mobile Sticky Floating Action Bar (FAB) */}
    <FloatingActionBar isVisible={isBarVisible} subject={subject}>
      {/* 1. compact TTS player */}
      <TTSPlayer text={prompt} compact={true} />
      
      <div className="w-[1px] h-7 bg-zinc-200 dark:bg-zinc-800/60 rounded-full shrink-0" />
      
      {/* 2. Star Bookmark */}
      <button
        onClick={() => {
          toggleBookmark({ subject, topic, wordCount, promptText: prompt });
          if (isBookmarked(subject, topic)) {
            haptics.tap();
            soundEngine.playSwoop();
            toast.success('Removed from bookmarks');
          } else {
            haptics.success();
            soundEngine.playSuccess();
            toast.success('Saved to bookmarks!');
          }
        }}
        aria-label={isBookmarked(subject, topic) ? "Remove Bookmark" : "Add Bookmark"}
        className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors text-zinc-550 dark:text-zinc-400 active:scale-90 cursor-pointer shrink-0"
      >
        <Icons.Star
          className={`w-5 h-5 transition-transform active:scale-125 ${
            isBookmarked(subject, topic)
              ? 'fill-amber-400 text-amber-400'
              : 'text-zinc-400 dark:text-zinc-550 hover:text-amber-500'
          }`}
        />
      </button>

      <div className="w-[1px] h-7 bg-zinc-200 dark:bg-zinc-800/60 rounded-full shrink-0" />

      {/* 3. Font Size Zoom Cycler */}
      <button
        onClick={cycleFontSize}
        aria-label="Cycle Font Size"
        className="w-11 h-11 flex flex-col items-center justify-center rounded-full hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors text-zinc-550 dark:text-zinc-400 active:scale-90 cursor-pointer shrink-0 py-1"
      >
        <Icons.Type className="w-5 h-5 text-zinc-400 dark:text-zinc-550" />
        {fontSizeMounted && (
          <span className="text-[8px] font-extrabold uppercase select-none min-w-[12px] text-zinc-400 leading-none mt-0.5">
            {fontSize}
          </span>
        )}
      </button>

      <div className="w-[1px] h-7 bg-zinc-200 dark:bg-zinc-800/60 rounded-full shrink-0" />

      {/* 4. Copy Master Prompt */}
      <div className="w-11 h-11 flex items-center justify-center shrink-0">
        <CopyButton textToCopy={prompt} minimal={true} />
      </div>

      <div className="w-[1px] h-7 bg-zinc-200 dark:bg-zinc-800/60 rounded-full shrink-0" />

      {/* 5. Open in ChatGPT */}
      <div className="w-11 h-11 flex items-center justify-center shrink-0">
        <DeepLinkButton
          textToCopy={prompt}
          subjectId={subject as SubjectId}
          targetApp="chatgpt"
          label="ChatGPT"
          minimal={true}
          icon={
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.108a4.4735 4.4735 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-2.1466zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829 14.6174 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.809 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4592a.7948.7948 0 0 0-.3927.6813v6.7225zm1.0855-3.0941l2.6086-1.5034 2.6086 1.5034v3.0069l-2.6086 1.5034-2.6086-1.5034v-3.0069z" />
            </svg>
          }
        />
      </div>

      <div className="w-[1px] h-7 bg-zinc-200 dark:bg-zinc-800/60 rounded-full shrink-0" />

      {/* 6. Native Share */}
      <div className="w-11 h-11 flex items-center justify-center shrink-0">
        <ShareButton subject={subject} topic={topic} minimal={true} />
      </div>
    </FloatingActionBar>
    </>
  );
}
