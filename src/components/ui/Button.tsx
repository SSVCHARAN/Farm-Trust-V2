import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'mic' | 'ghost' | 'chip';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-bold transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses =
        'min-h-[56px] px-6 py-3.5 bg-[#1B3D27] text-white hover:bg-[#14321D] rounded-xl text-[16px] shadow-sm';
      break;
    case 'secondary':
      variantClasses =
        'min-h-[56px] px-6 py-3.5 bg-transparent text-[#1B3D27] border-2 border-[#1B3D27] hover:bg-[#E6F2EA] rounded-xl text-[16px]';
      break;
    case 'danger':
      variantClasses =
        'min-h-[48px] px-4 py-2.5 text-[#B3261E] hover:bg-red-50 rounded-xl text-[14px]';
      break;
    case 'mic':
      variantClasses =
        'min-h-[56px] px-6 py-3.5 bg-[#F5B800] text-[#1A1A1A] hover:bg-[#E5AC00] rounded-full text-[16px] font-black shadow-[0_4px_16px_rgba(245,184,0,0.4)]';
      break;
    case 'ghost':
      variantClasses =
        'min-h-[48px] px-4 py-2.5 text-[#5B5B5B] hover:text-[#1A1A1A] hover:bg-stone-100 rounded-xl text-[16px]';
      break;
    case 'chip':
      variantClasses =
        'min-h-[44px] px-4 py-2 bg-white text-[#1A1A1A] border border-[#E2DDCF] hover:border-[#1B3D27] rounded-full text-[14px] shadow-xs';
      break;
  }

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-5 h-5 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-5 h-5 shrink-0" />}
        </>
      )}
    </button>
  );
};
