import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
}) => {
  let variantClasses = '';
  switch (variant) {
    case 'circle':
      variantClasses = 'rounded-full shrink-0';
      break;
    case 'text':
      variantClasses = 'h-4 rounded-md w-full';
      break;
    case 'rect':
      variantClasses = 'rounded-xl w-full';
      break;
  }

  return (
    <div
      className={`animate-pulse bg-[#E2DDCF]/60 ${variantClasses} ${className}`}
      aria-hidden="true"
    />
  );
};
