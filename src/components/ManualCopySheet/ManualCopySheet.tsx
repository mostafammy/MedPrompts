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
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Copy Prompt Manually</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close sheet"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">
            Your browser prevented automatic copying. Please select all the text below and copy it manually (e.g., using <kbd className="bg-slate-100 border border-slate-300 rounded px-1">Ctrl/Cmd + C</kbd>).
          </p>
          <pre className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-slate-800 select-all">
            <code>{textToCopy}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
