import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onFinalSpeech?: (text: string) => void;
  lang?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  onresult: (event: {
    resultIndex: number;
    results: {
      length: number;
      [key: number]: {
        isFinal: boolean;
        [key: number]: {
          transcript: string;
        };
      };
    };
  }) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

export function useSpeechRecognition({ onFinalSpeech, lang = 'en-US' }: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onFinalSpeechRef = useRef(onFinalSpeech);

  // Keep callback ref fresh to avoid recreating startListening
  useEffect(() => {
    onFinalSpeechRef.current = onFinalSpeech;
  }, [onFinalSpeech]);

  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as unknown as SpeechRecognitionWindow) : null;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    

    setIsSupported(!!SpeechRecognition);
  }, []);

  const clearSpeechTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSpeechTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    setIsListening(false);
  }, [clearSpeechTimeout]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    clearSpeechTimeout();

    const win = typeof window !== 'undefined' ? (window as unknown as SpeechRecognitionWindow) : null;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: { error: string }) => {
        // 'no-speech' can trigger if user is silent, ignore or handle gracefully
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
          setError(event.error);
        }
        setIsListening(false);
        clearSpeechTimeout();
      };

      recognition.onend = () => {
        setIsListening(false);
        clearSpeechTimeout();
      };

      recognition.onresult = (event: {
        resultIndex: number;
        results: {
          length: number;
          [key: number]: {
            isFinal: boolean;
            [key: number]: {
              transcript: string;
            };
          };
        };
      }) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result) {
            if (result.isFinal) {
              finalTranscript += result[0]?.transcript || '';
            } else {
              interimTranscript += result[0]?.transcript || '';
            }
          }
        }

        // We can concatenate both, or take the accumulated result
        const currentText = finalTranscript || interimTranscript;
        
        if (currentText.trim()) {
          setTranscript(currentText);

          // Clear any existing timeout and schedule a new one for 1.5 seconds (1500ms)
          clearSpeechTimeout();
          timeoutRef.current = setTimeout(() => {
            // Stop listening
            try {
              recognition.stop();
            } catch (err) {
              console.error('Error stopping on pause:', err);
            }
            setIsListening(false);
            
            // Call final result callback
            if (onFinalSpeechRef.current) {
              onFinalSpeechRef.current(currentText.trim());
            }
          }, 1500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: unknown) {
      console.error(e);
      setError((e as Error).message || 'Failed to start speech recognition');
      setIsListening(false);
    }
  }, [lang, clearSpeechTimeout]);

  useEffect(() => {
    return () => {
      clearSpeechTimeout();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [clearSpeechTimeout]);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
}
