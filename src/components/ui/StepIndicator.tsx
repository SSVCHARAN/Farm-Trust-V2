import React from 'react';
import { Check, LucideIcon } from 'lucide-react';

export interface StepItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface StepIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number; // 0-indexed
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStepIndex,
  className = '',
}) => {
  return (
    <div className={`w-full py-2 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Progress track */}
        <div className="absolute top-5 left-6 right-6 h-1 bg-[#E2DDCF] -z-0" />
        <div
          className="absolute top-5 left-6 h-1 bg-[#1B3D27] -z-0 transition-all duration-300"
          style={{
            width: `${(currentStepIndex / Math.max(steps.length - 1, 1)) * 88}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] transition-all border-2 ${
                  isDone
                    ? 'bg-[#1B3D27] text-white border-[#1B3D27]'
                    : isCurrent
                    ? 'bg-[#E6F2EA] text-[#1B3D27] border-[#1B3D27] ring-4 ring-[#E6F2EA]'
                    : 'bg-white text-[#5B5B5B] border-[#E2DDCF]'
                }`}
              >
                {isDone ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : StepIcon ? (
                  <StepIcon className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[12px] font-bold mt-1.5 text-center max-w-[76px] leading-tight ${
                  isCurrent ? 'text-[#1B3D27]' : isDone ? 'text-[#1A1A1A]' : 'text-[#5B5B5B]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
