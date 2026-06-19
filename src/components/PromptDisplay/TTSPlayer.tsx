'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { soundEngine } from '@/lib/audio';

interface TTSPlayerProps {
  text: string;
  compact?: boolean;
}

export function TTSPlayer({ text, compact = false }: TTSPlayerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  // Stop synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startSpeech = () => {
    if (!isSupported) return;
    
    // Cancel any active speech
    window.speechSynthesis.cancel();
    
    haptics.tap();
    soundEngine.playClick();

    // Clean text: remove markdown symbols and clean up spaces for synthesis
    const cleanText = text
      .replace(/[\*\_\`\#\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Speed rate 1.05 for efficient, natural listening
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      // 'interrupted' or 'canceled' are fired normally when we stop/cancel speech synthesis
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech synthesis error:', e.error || e);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    if (!isSupported) return;
    haptics.tap();
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeech = () => {
    if (!isSupported) return;
    haptics.tap();
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeech = () => {
    if (!isSupported) return;
    haptics.warning();
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!isSupported) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {!isPlaying ? (
          <button
            onClick={startSpeech}
            aria-label="Read prompt aloud"
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-550 dark:text-zinc-400 active:scale-95 cursor-pointer flex items-center justify-center transition-colors duration-200"
          >
            <Icons.Volume2 className="w-5 h-5 text-zinc-400 dark:text-zinc-550 hover:text-blue-500 dark:hover:text-blue-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-400/10 rounded-full p-0.5 border border-blue-500/20">
            {isPaused ? (
              <button
                onClick={resumeSpeech}
                aria-label="Resume speech"
                className="p-1.5 rounded-full hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 cursor-pointer"
              >
                <Icons.Play className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={pauseSpeech}
                aria-label="Pause speech"
                className="p-1.5 rounded-full hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 cursor-pointer"
              >
                <Icons.Pause className="w-4 h-4 animate-pulse" />
              </button>
            )}
            <button
              onClick={stopSpeech}
              aria-label="Stop reading"
              className="p-1.5 rounded-full hover:bg-red-500/20 text-red-500 dark:text-red-400 cursor-pointer"
            >
              <Icons.Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-zinc-950/40 dark:bg-zinc-800/30 border border-zinc-800/60 dark:border-zinc-700/40 rounded-full px-2.5 py-1 text-xs text-zinc-300 backdrop-blur-md">
      {!isPlaying ? (
        <button
          onClick={startSpeech}
          aria-label="Read prompt aloud"
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          <Icons.Volume2 className="w-4 h-4 text-blue-500" />
          <span>Read Aloud</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* Pulsing speech waves */}
          <div className="flex gap-0.5 items-end h-3 px-1 select-none">
            <span className={`w-0.5 h-1.5 bg-blue-500 rounded-full ${!isPaused ? 'animate-pulse' : ''}`} style={{ animationDuration: '0.6s' }} />
            <span className={`w-0.5 h-3 bg-blue-400 rounded-full ${!isPaused ? 'animate-pulse' : ''}`} style={{ animationDuration: '0.4s' }} />
            <span className={`w-0.5 h-2 bg-blue-500 rounded-full ${!isPaused ? 'animate-pulse' : ''}`} style={{ animationDuration: '0.8s' }} />
          </div>
          
          {isPaused ? (
            <button
              onClick={resumeSpeech}
              aria-label="Resume speech"
              className="p-0.5 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              <Icons.Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={pauseSpeech}
              aria-label="Pause speech"
              className="p-0.5 text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              <Icons.Pause className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={stopSpeech}
            aria-label="Stop reading"
            className="p-0.5 text-red-400 hover:text-red-300 transition-colors duration-200 cursor-pointer"
          >
            <Icons.Square className="w-3.5 h-3.5 fill-red-400/20" />
          </button>
        </div>
      )}
    </div>
  );
}
