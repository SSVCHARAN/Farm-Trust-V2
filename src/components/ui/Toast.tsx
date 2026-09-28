import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onDismiss,
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#1B3D27] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#E6F2EA]/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#F5B800] shrink-0" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
        {type === 'info' && <Info className="w-5 h-5 text-emerald-300 shrink-0" />}
        <span className="text-[15px] font-semibold text-white leading-snug telugu-text truncate">
          {message}
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
