'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => 
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-amber-500/10 dark:bg-amber-400/8 backdrop-blur-xl border border-amber-500/20 dark:border-amber-400/20 text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-full shadow-[0_10px_30px_rgba(245,158,11,0.04)] dark:shadow-none font-semibold text-xs flex items-center gap-2 select-none">
            <div className="bg-amber-500/15 dark:bg-amber-400/10 p-0.5 rounded-full text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
            </div>
            <span>Viewing Offline — Visited subjects are cached</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
