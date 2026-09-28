import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="py-12 px-6 text-center bg-white rounded-2xl border border-[#E2DDCF] shadow-xs space-y-4 max-w-md mx-auto my-4">
      <div className="w-16 h-16 rounded-full bg-[#E6F2EA] text-[#1B3D27] flex items-center justify-center mx-auto shadow-xs">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[20px] font-black text-[#1A1A1A] tracking-tight">{title}</h3>
        <p className="text-[15px] text-[#5B5B5B] max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction} icon={actionIcon}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
