import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[90vh]',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when sheet is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-md bg-[#FBF8F1] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#E2DDCF] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 ${maxHeight} pb-safe sm:pb-0`}
      >
        {/* Mobile handle indicator */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-4 border-b border-[#E2DDCF] flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id="bottom-sheet-title" className="text-[20px] font-black text-[#1A1A1A] truncate tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[14px] text-[#5B5B5B] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">{children}</div>
      </div>
    </div>
  );
};
