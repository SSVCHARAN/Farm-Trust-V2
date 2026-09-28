import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: LucideIcon;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  icon: Icon,
  count,
  children,
  className = '',
  ...props
}) => {
  const activeClasses = active
    ? 'bg-[#1B3D27] text-white border-[#1B3D27] shadow-xs'
    : 'bg-white text-[#1A1A1A] border-[#E2DDCF] hover:border-[#1B3D27]/50 hover:bg-[#E6F2EA]/30';

  return (
    <button
      className={`min-h-[44px] px-4 py-2 rounded-full border text-[14px] font-bold inline-flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 shrink-0 ${activeClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[11px] font-black leading-none ${
            active ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#5B5B5B]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
