import React from 'react';
import { useFocusTrap } from './useFocusTrap';
import * as Icons from 'lucide-react';

export interface ManualCopySheetProps {
  isOpen: boolean;
  onClose: () => void;
  textToCopy: string;
}

export function ManualCopySheet({ isOpen, onClose, textToCopy }: ManualCopySheetProps) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="Copy prompt manually"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div 
        ref={containerRef}
        className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icons.Copy className="w-5 h-5 text-blue-500" />
            Copy Prompt Manually
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
            aria-label="Close sheet"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
            Your browser prevented automatic copying. Please select all the text below and copy it manually (e.g., using <kbd className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">Ctrl/Cmd + C</kbd>).
          </p>
          <pre className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200 select-all max-h-[400px]">
            <code>{textToCopy}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
