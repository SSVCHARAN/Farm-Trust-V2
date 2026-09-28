import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'mint' | 'warning' | 'forest';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  let variantClasses = '';
  switch (variant) {
    case 'default':
      variantClasses = 'bg-white border border-[#E2DDCF] text-[#1A1A1A]';
      break;
    case 'mint':
      variantClasses = 'bg-[#E6F2EA] border border-[#1B3D27]/20 text-[#1B3D27]';
      break;
    case 'warning':
      variantClasses = 'bg-[#FFF4D6] border border-[#F5B800]/50 text-[#5C4300]';
      break;
    case 'forest':
      variantClasses = 'bg-[#1B3D27] border border-[#14321D] text-white';
      break;
  }

  let paddingClasses = '';
  switch (padding) {
    case 'none':
      paddingClasses = 'p-0';
      break;
    case 'sm':
      paddingClasses = 'p-3';
      break;
    case 'md':
      paddingClasses = 'p-4 sm:p-5';
      break;
    case 'lg':
      paddingClasses = 'p-5 sm:p-6';
      break;
  }

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:shadow-md hover:border-[#1B3D27]/40 active:scale-[0.99] transition-all'
    : 'shadow-[0_2px_8px_rgba(0,0,0,0.04)]';

  return (
    <div
      className={`rounded-2xl ${variantClasses} ${paddingClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
