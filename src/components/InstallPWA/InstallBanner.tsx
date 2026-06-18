'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Check if dismissed before
    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    if (isDismissed === 'true') {
      return;
    }

    // 2. Check if already in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    if (isStandalone) {
      return;
    }

    // 3. Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isIOS) {

      setPlatform('ios');
      // Show iOS banner immediately on mobile Safari

      setIsVisible(true);
    } else {
      // Listen for the Chrome/Android install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        deferredPromptRef.current = e as BeforeInstallPromptEvent;

        setPlatform('android');

        setIsVisible(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Trigger standard check if chrome install prompt was already fired/cached
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    haptics.success();
    if (platform === 'android' && deferredPromptRef.current) {
      const promptEvent = deferredPromptRef.current;
      promptEvent.prompt();
      
      try {
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
      }
      
      deferredPromptRef.current = null;
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    haptics.success();
    localStorage.setItem('pwa-install-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !platform) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-50 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Icons.PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Install MedPrompts
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
              {platform === 'ios' ? (
                <span>
                  Tap Share <Icons.Share className="inline w-3 h-3 mx-0.5 text-zinc-500" /> then <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                </span>
              ) : (
                'Access app offline and directly from your home screen'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {platform === 'android' && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
