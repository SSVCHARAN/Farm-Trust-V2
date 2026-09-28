import React from 'react';
import { LucideIcon } from 'lucide-react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'mint' | 'neutral' | 'amber';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon: Icon,
  children,
  className = '',
}) => {
  let variantClasses = '';
  switch (variant) {
    case 'success':
      variantClasses = 'bg-[#E6F2EA] text-[#1E7B3F] border border-[#1E7B3F]/20';
      break;
    case 'warning':
      variantClasses = 'bg-[#FFF4D6] text-[#5C4300] border border-[#F5B800]/40';
      break;
    case 'danger':
      variantClasses = 'bg-red-50 text-[#B3261E] border border-red-200';
      break;
    case 'mint':
      variantClasses = 'bg-[#E6F2EA] text-[#1B3D27] border border-[#1B3D27]/20';
      break;
    case 'amber':
      variantClasses = 'bg-[#F5B800] text-[#1A1A1A] font-black';
      break;
    case 'neutral':
      variantClasses = 'bg-stone-100 text-[#5B5B5B] border border-stone-200';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold shrink-0 ${variantClasses} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};
