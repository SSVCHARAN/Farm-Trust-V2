import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (newValue: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  min = 1,
  max = 999,
  step = 1,
  unit,
  onChange,
  className = '',
}) => {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-[#FBF8F1] border border-[#E2DDCF] p-1.5 rounded-2xl ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="w-12 h-12 rounded-xl bg-white border border-[#E2DDCF] hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white text-[#1A1A1A] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-2xs"
      >
        <Minus className="w-5 h-5" />
      </button>

      <div className="min-w-[64px] px-2 text-center">
        <span className="text-[20px] font-black text-[#1A1A1A] tabular-nums block leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-[12px] font-bold text-[#5B5B5B] uppercase block mt-1 leading-none">
            {unit}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-12 h-12 rounded-xl bg-[#1B3D27] hover:bg-[#14321D] disabled:opacity-40 disabled:hover:bg-[#1B3D27] text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-2xs"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};
