import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconClick,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-[14px] font-bold text-[#1A1A1A]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="absolute left-4 pointer-events-none text-[#5B5B5B]">
              <LeftIcon className="w-5 h-5" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full min-h-[56px] ${LeftIcon ? 'pl-12' : 'pl-4'} ${
              RightIcon ? 'pr-12' : 'pr-4'
            } py-3.5 text-[16px] text-[#1A1A1A] placeholder:text-[#5B5B5B] bg-white border ${
              error ? 'border-[#B3261E] focus:ring-red-200' : 'border-[#E2DDCF] focus:border-[#1B3D27]'
            } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]/20 transition-all ${className}`}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className={`absolute right-3 p-2 text-[#5B5B5B] hover:text-[#1A1A1A] transition-colors rounded-lg ${
                onRightIconClick ? 'cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center' : 'pointer-events-none'
              }`}
            >
              <RightIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        {error && <p className="text-[13px] font-semibold text-[#B3261E] mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-[13px] text-[#5B5B5B] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
