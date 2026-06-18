'use client';

import React, { useEffect, useState, useRef } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { abbreviationNormalizer } from '@/lib/prompts/normalizer/abbreviation';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spotlight } from '@/components/ui/Spotlight';
import { useRouter } from 'next/navigation';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export interface TopicInputProps {
  subjectId: SubjectId | null;
  onGenerate: (topic: string) => void;
}

const TRENDING_TOPICS: Record<string, string[]> = {
  anatomy: ['Asthma', 'Heart', 'Lungs', 'Liver'],
  pathology: ['Tuberculosis', 'Diabetes', 'Hypertension'],
  physiology: ['Action Potential', 'Cardiac Cycle', 'Blood Pressure'],
  pharmacology: ['Antibiotics', 'NSAIDs', 'Beta Blockers'],
  microbiology: ['Gram Stain', 'Viruses', 'Bacteria'],
  biochemistry: ['Glycolysis', 'Krebs Cycle', 'Enzymes'],
};

export function TopicInput({ subjectId, onGenerate }: TopicInputProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTapTimeRef = useRef<number>(0);

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onFinalSpeech: (finalText) => {
      if (subjectId && finalText.trim() !== '' && !isSubmitting) {
        setInputValue(finalText);
        setIsSubmitting(true);
        textareaRef.current?.blur();
        onGenerate(finalText);
      }
    },
  });

  useEffect(() => {
    if (isListening && transcript) {

      setInputValue(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    if (speechError) {
      let message = 'An error occurred with voice input.';
      if (speechError === 'not-allowed') {
        message = 'Microphone access denied. Please enable microphone permission in your browser settings and ensure you are using a secure connection (HTTPS).';
      } else if (speechError === 'audio-capture') {
        message = 'No microphone detected. Please connect a working microphone.';
      } else if (speechError === 'network') {
        message = 'Network error occurred during voice recognition.';
      } else if (speechError === 'service-not-allowed') {
        message = 'Speech service not allowed. Try using Chrome or Safari.';
      } else if (speechError === 'no-speech') {
        return;
      } else {
        message = `Voice error: ${speechError}`;
      }
      toast.error(message);
    }
  }, [speechError]);

  const handleTap = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const lastTap = lastTapTimeRef.current;
    
    // Check if it's a valid double tap (prevent 0ms duplicate events)
    if (lastTap > 0 && now - lastTap < 400) {
      if (subjectId && inputValue.trim() !== '' && !isSubmitting) {
        e.preventDefault();
        // Clear the ref to prevent further triggers
        lastTapTimeRef.current = 0;
        setIsSubmitting(true);
        // Instantly blur to dismiss mobile keyboard and prevent native scroll-to-selection
        textareaRef.current?.blur();
        onGenerate(inputValue);
      }
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  useEffect(() => {
    if (subjectId) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [subjectId]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleApplyHint = (suggestion: string) => {
    setInputValue(suggestion);
    setHint(null);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.trim() === '') {
        setHint(null);
        return;
      }
      if (!subjectId) return;
      
      const result = await abbreviationNormalizer.normalize(inputValue, { subjectId, raw: inputValue });
      if (result.confidence >= 0.9 && result.cleaned !== inputValue) {
        setHint(result.cleaned);
      } else {
        setHint(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, subjectId]);
  const getGhostSuggestion = () => {
    if (!hint || !inputValue || inputValue.length >= hint.length) return '';
    if (hint.toLowerCase().startsWith(inputValue.toLowerCase())) {
      return hint.slice(inputValue.length);
    }
    return '';
  };
  const ghostSuggestion = getGhostSuggestion();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (subjectId && inputValue.trim() !== '' && !isSubmitting) {
        haptics.success();
        setIsSubmitting(true);
        onGenerate(inputValue);
      }
      return;
    }

    // Autocomplete on Tab or on ArrowRight (only if cursor is at the end)
    if (
      (e.key === 'Tab' || (e.key === 'ArrowRight' && e.currentTarget.selectionStart === inputValue.length)) &&
      hint
    ) {
      e.preventDefault();
      setInputValue(hint);
      setHint(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || inputValue.trim() === '' || isSubmitting) return;
    haptics.success();
    setIsSubmitting(true);
    textareaRef.current?.blur();
    onGenerate(inputValue);
  };

  const handleChipClick = (topic: string) => {
    if (!subjectId || isSubmitting) return;
    haptics.success();
    setInputValue(topic);
    setIsSubmitting(true);
    textareaRef.current?.blur();
    onGenerate(topic);
  };

  if (!subjectId) {
    if (!mounted) {
      return (
        <div className="w-full max-w-2xl mx-auto mt-4 p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-md text-center">
          <Icons.HelpCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            No Subject Selected
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-sm mx-auto">
            Please click on one of the core subjects above to unlock the medical prompt generator.
          </p>
        </div>
      );
    }
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-2xl mx-auto mt-4 p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-md text-center"
      >
        <Icons.HelpCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          No Subject Selected
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-sm mx-auto">
          Please click on one of the core subjects above to unlock the medical prompt generator.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:hidden fixed inset-0 z-[60] bg-zinc-900/60 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 25 }}
        className="max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[70] max-sm:mt-0 max-sm:mb-0 max-sm:rounded-t-[2.5rem] max-sm:rounded-b-none max-sm:p-6 max-sm:shadow-[0_-20px_40px_rgba(0,0,0,0.2)] max-sm:border-x-0 max-sm:border-b-0 max-sm:bg-white dark:max-sm:bg-zinc-950 relative z-20 w-full max-w-3xl mx-auto -mt-10 sm:-mt-20 mb-8 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-3xl saturate-200 rounded-3xl sm:rounded-[2rem] p-4 sm:p-10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.15)] sm:shadow-[0_0_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.6)] sm:dark:shadow-[0_0_60px_-15px_rgba(0,0,0,0.6)] transition-all duration-500"
      >
        {/* Mobile Header / Drag Indicator */}
        <div className="sm:hidden flex flex-col items-center mb-6">
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mb-5" />
          <div className="w-full flex justify-between items-center">
            <span className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Specify Topic</span>
            <button type="button" onClick={handleClose} className="p-2.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <Icons.X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <Spotlight className="rounded-[2rem] rounded-b-none sm:rounded-[2rem] h-full w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6 relative z-10">
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label htmlFor="topic-input" className="hidden sm:block text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 ml-1 sm:ml-2">
                Specify Topic
              </label>
            <div className="relative group">
            {/* pointer-events-none prevents overlays from blocking focus clicks */}
            <div className="pointer-events-none absolute left-4 sm:left-6 top-[1.1rem] sm:top-[1.65rem] text-zinc-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors duration-300">
              <Icons.BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            
            {/* Ghost text autocomplete overlay */}
            {ghostSuggestion && (
              <div 
                className="absolute inset-0 pointer-events-none pl-12 sm:pl-16 pr-16 sm:pr-24 py-4 sm:py-6 font-sans text-lg sm:text-2xl leading-relaxed text-zinc-300 dark:text-zinc-700 whitespace-pre-wrap select-none overflow-hidden"
                aria-hidden="true"
              >
                {/* Mirror typed text transparently */}
                <span className="opacity-0">{inputValue}</span>
                {/* Visual suggestion tail */}
                <span className="text-zinc-400 dark:text-zinc-500">{ghostSuggestion}</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              id="topic-input"
              value={inputValue}
              autoCorrect="off"
              spellCheck="false"
              autoComplete="off"
              enterKeyHint="go"
              onChange={(e) => {
                if (isListening) {
                  stopListening();
                }
                const target = e.target;
                let val = target.value;
                if (val.length > 120) {
                  val = val.slice(0, 120);
                }
                setInputValue(val);
              }}
              onKeyDown={handleKeyDown}
              onClick={handleTap}
              aria-describedby="topic-hint"
              rows={2}
              className={`w-full touch-manipulation pl-12 sm:pl-16 pr-16 sm:pr-24 py-4 sm:py-6 rounded-2xl sm:rounded-3xl border bg-white/50 dark:bg-zinc-950/50 text-zinc-900 dark:text-zinc-50 text-lg sm:text-2xl leading-relaxed outline-none transition-all duration-300 resize-none shadow-inner font-sans ${
                isListening
                  ? 'border-red-500/80 dark:border-red-500/80 ring-4 ring-red-500/20 dark:ring-red-500/20'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-500/20'
              }`}
              placeholder={isListening ? 'Listening... Speak now' : 'e.g. Myocardial Infarction...'}
            />
            
            <div className="pointer-events-none absolute right-3 sm:right-6 top-4 sm:top-[1.65rem] text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg backdrop-blur-sm">
              {inputValue.length}/120
            </div>

            {isSpeechSupported && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  haptics.success();
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                className={`absolute right-3 sm:right-6 bottom-3 sm:bottom-4 p-2 sm:p-2.5 rounded-full flex items-center justify-center transition-all duration-300 z-10 cursor-pointer ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 ring-4 ring-red-500/10'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? (
                  <Icons.Mic className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                ) : (
                  <Icons.Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            )}
          </div>
          
          {/* Trending Tap Chips */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0 px-1">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1.5 shrink-0 mr-1">Trending:</span>
            {TRENDING_TOPICS[subjectId] ? TRENDING_TOPICS[subjectId].map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleChipClick(topic)}
                className="shrink-0 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-full transition-colors border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm"
              >
                {topic}
              </button>
            )) : null}
          </div>
        </div>

        <AnimatePresence>
          {hint && (
            <motion.div 
              id="topic-hint" 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl sm:rounded-2xl shadow-inner backdrop-blur-md">
                <div className="p-1.5 sm:p-2 bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl shrink-0">
                  <Icons.Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 font-medium leading-tight">
                  Did you mean <span className="font-bold text-blue-600 dark:text-blue-400">{hint}</span>?
                </div>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button" 
                  onClick={() => handleApplyHint(hint)} 
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-md shadow-blue-500/20 cursor-pointer select-none transition-colors duration-300 flex items-center gap-1 sm:gap-1.5 shrink-0"
                >
                  <Icons.Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Apply
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          <motion.button
            whileTap={{ scale: (inputValue.trim() === '' || isSubmitting) ? 1 : 0.98 }}
            type="submit"
            disabled={inputValue.trim() === '' || isSubmitting}
            className="mt-2 sm:mt-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-zinc-200 disabled:to-zinc-200 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:cursor-not-allowed text-white font-bold py-5 sm:py-5 px-6 sm:px-8 rounded-2xl sm:rounded-2xl transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] disabled:shadow-none hover:shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3 sm:gap-3 text-lg sm:text-lg"
          >
            {isSubmitting ? (
              <>
                <Icons.Loader2 className="w-6 h-6 sm:w-6 sm:h-6 shrink-0 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icons.Sparkles className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                Generate Prompt
              </>
            )}
          </motion.button>
          </form>
        </Spotlight>
      </motion.div>
    </>
  );
}
