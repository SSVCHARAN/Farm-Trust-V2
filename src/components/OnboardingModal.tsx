import React, { useState } from 'react';
import { UserRole } from '../types';
import { Language } from '../data/translations';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Sprout, ShoppingBag, ArrowRight, Check, Globe } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  currentRole: UserRole;
  currentLanguage: Language;
  onComplete: (role: UserRole, language: Language) => void;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  currentRole,
  currentLanguage,
  onComplete,
  onClose,
}) => {
  if (!isOpen) return null;

  // Step 1: Language -> Step 2: Role
  const [step, setStep] = useState<1 | 2>(() => {
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('ostep');
      if (s === '2') return 2;
    }
    return 1;
  });
  const [selectedLang, setSelectedLang] = useState<Language>(currentLanguage);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      localStorage.setItem('ft_onboarded', 'true');
      localStorage.setItem('ft_lang', selectedLang);
      localStorage.setItem('ft_role', selectedRole);
      onComplete(selectedRole, selectedLang);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1B3D27]/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#FBF8F1] rounded-3xl max-w-md w-full shadow-2xl border border-[#E2DDCF] overflow-hidden flex flex-col">
        {/* App Branding Top Strip */}
        <div className="bg-[#1B3D27] text-white p-5 text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center font-black shadow-md mb-2">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-[22px] font-black tracking-tight">Farm Trust</h1>
          <p className="text-[13px] text-emerald-100 font-medium">
            {selectedLang === 'te' ? 'రైతు నుండి కుటుంబానికి నేరుగా' : 'Farm to Family, in Every Language'}
          </p>
        </div>

        {/* Step Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* ═══════════════════════════════════════════════ */}
          {/* SCREEN 1: LANGUAGE SELECTION */}
          {/* ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-150">
              <div className="text-center space-y-1">
                <span className="text-[12px] font-black text-[#1E7B3F] uppercase tracking-wider">
                  Step 1 of 2
                </span>
                <h2 className="text-[20px] font-black text-[#1A1A1A]">
                  భాషను ఎంచుకోండి / Choose Language
                </h2>
                <p className="text-[13px] text-[#5B5B5B]">
                  మీకు సౌకర్యవంతమైన భాషలో మాట్లాడండి
                </p>
              </div>

              <div className="space-y-3">
                {/* Telugu Card */}
                <button
                  type="button"
                  onClick={() => setSelectedLang('te')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between min-h-[76px] ${
                    selectedLang === 'te'
                      ? 'bg-[#E6F2EA] border-[#1B3D27] shadow-sm'
                      : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/50'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-[20px] font-black text-[#1B3D27]">
                      తెలుగు
                    </p>
                    <p className="text-[13px] text-[#5B5B5B]">
                      వాయిస్ మరియు టెక్స్ట్ తెలుగులో
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      selectedLang === 'te'
                        ? 'bg-[#1B3D27] text-white'
                        : 'border-2 border-[#E2DDCF]'
                    }`}
                  >
                    {selectedLang === 'te' && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>

                {/* English Card */}
                <button
                  type="button"
                  onClick={() => setSelectedLang('en')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between min-h-[76px] ${
                    selectedLang === 'en'
                      ? 'bg-[#E6F2EA] border-[#1B3D27] shadow-sm'
                      : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/50'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-[19px] font-black text-[#1A1A1A]">
                      English
                    </p>
                    <p className="text-[13px] text-[#5B5B5B]">
                      Voice & text in English
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      selectedLang === 'en'
                        ? 'bg-[#1B3D27] text-white'
                        : 'border-2 border-[#E2DDCF]'
                    }`}
                  >
                    {selectedLang === 'en' && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>
              </div>

              <Button
                variant="primary"
                onClick={handleNext}
                className="w-full min-h-[52px] text-[16px] font-black mt-2"
              >
                <span>{selectedLang === 'te' ? 'తరువాత' : 'Continue'}</span>
                <ArrowRight className="w-5 h-5 ml-1.5" />
              </Button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* SCREEN 2: ROLE SELECTION */}
          {/* ═══════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-150">
              <div className="text-center space-y-1">
                <span className="text-[12px] font-black text-[#1E7B3F] uppercase tracking-wider">
                  {selectedLang === 'te' ? 'దశ 2 / 2' : 'Step 2 of 2'}
                </span>
                <h2 className="text-[20px] font-black text-[#1A1A1A]">
                  {selectedLang === 'te' ? 'మీ పాత్రను ఎంచుకోండి' : 'Choose Your Role'}
                </h2>
                <p className="text-[13px] text-[#5B5B5B]">
                  {selectedLang === 'te'
                    ? 'మీరు పంట అమ్మాలనుకుంటున్నారా లేదా కొనాలనుకుంటున్నారా?'
                    : 'Are you here to sell produce or buy fresh crops?'}
                </p>
              </div>

              <div className="space-y-3">
                {/* Farmer Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('FARMER')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 min-h-[82px] ${
                    selectedRole === 'FARMER'
                      ? 'bg-[#FFF4D6] border-[#F5B800] shadow-sm'
                      : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1B3D27] text-[#F5B800] flex items-center justify-center shrink-0">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-black text-[#1A1A1A]">
                      {selectedLang === 'te' ? 'రైతు / Farmer' : 'Farmer / రైతు'}
                    </p>
                    <p className="text-[13px] text-[#5B5B5B] leading-snug">
                      {selectedLang === 'te'
                        ? 'నేను పంటను నేరుగా విక్రయించాలనుకుంటున్నాను'
                        : 'I want to sell produce direct without brokers'}
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      selectedRole === 'FARMER'
                        ? 'bg-[#1B3D27] text-white'
                        : 'border-2 border-[#E2DDCF]'
                    }`}
                  >
                    {selectedRole === 'FARMER' && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>

                {/* Buyer Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('CUSTOMER')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 min-h-[82px] ${
                    selectedRole === 'CUSTOMER'
                      ? 'bg-[#E6F2EA] border-[#1B3D27] shadow-sm'
                      : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1E7B3F] text-white flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-black text-[#1A1A1A]">
                      {selectedLang === 'te' ? 'కొనుగోలుదారు / Buyer' : 'Buyer / కొనుగోలుదారు'}
                    </p>
                    <p className="text-[13px] text-[#5B5B5B] leading-snug">
                      {selectedLang === 'te'
                        ? 'నేను తాజా పంటలను నేరుగా కొనాలనుకుంటున్నాను'
                        : 'I want fresh farm produce delivered direct'}
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      selectedRole === 'CUSTOMER'
                        ? 'bg-[#1B3D27] text-white'
                        : 'border-2 border-[#E2DDCF]'
                    }`}
                  >
                    {selectedRole === 'CUSTOMER' && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="w-full min-h-[52px] text-[16px] font-black"
                >
                  <span>{selectedLang === 'te' ? 'ప్రారంభించండి' : 'Get Started'}</span>
                  <ArrowRight className="w-5 h-5 ml-1.5" />
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="w-full min-h-[44px] text-[14px]"
                >
                  <span>{selectedLang === 'te' ? 'వెనుకకు' : 'Back'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
