import React, { useState } from 'react';
import { Sprout, RotateCcw, User, Check, ShieldCheck, ChevronDown } from 'lucide-react';
import { UserRole } from '../types';
import { Language, translations } from '../data/translations';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeOrdersCount: number;
  farmerPendingOrdersCount: number;
  onOpenOrders: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  setRole,
  language,
  setLanguage,
  activeOrdersCount,
  farmerPendingOrdersCount,
  onOpenOrders,
  onResetDemo,
}) => {
  const t = translations[language];
  const [isDemoSheetOpen, setIsDemoSheetOpen] = useState(false);

  // Avatar initials / labels
  const userInitials = role === 'FARMER' ? (language === 'te' ? 'రవి' : 'RK') : (language === 'te' ? 'అన' : 'AS');
  const userName = role === 'FARMER' ? (language === 'te' ? 'రవి కుమార్' : 'Ravi Kumar') : (language === 'te' ? 'అనన్య' : 'Ananya');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2DDCF] shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-14 select-none">
        <div className="max-w-md md:max-w-4xl mx-auto h-full px-4 flex items-center justify-between gap-2">
          
          {/* LEFT: Logo & Brand Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1B3D27] flex items-center justify-center text-[#F5B800] shadow-2xs shrink-0">
              <Sprout className="w-5 h-5 text-[#F5B800]" />
            </div>
            <div className="min-w-0 shrink-0">
              <span className="text-[17px] font-black tracking-tight text-[#1B3D27] leading-tight block whitespace-nowrap">
                {t.appName}
              </span>
              <span className="text-[10px] font-bold text-[#1E7B3F] leading-none block whitespace-nowrap">
                {language === 'te' ? 'రైతు నేరుగా' : 'Farm Direct'}
              </span>
            </div>
          </div>

          {/* RIGHT: Demo Chip + Language Switcher + Avatar */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Small Demo Chip (Opens Role BottomSheet) */}
            <button
              onClick={() => setIsDemoSheetOpen(true)}
              aria-label="Switch Role or Demo options"
              className="min-h-[36px] px-2 py-1 rounded-full bg-[#E6F2EA] text-[#1B3D27] border border-[#1B3D27]/25 flex items-center gap-1 text-[12px] font-bold cursor-pointer hover:bg-[#d8ebdffe] active:scale-95 transition-all"
            >
              <span className="text-[12px]">{role === 'FARMER' ? '🧑‍🌾' : '🛒'}</span>
              <span>
                {role === 'FARMER'
                  ? language === 'te' ? 'రైతు' : 'Farmer'
                  : language === 'te' ? 'కొనుగోలు' : 'Buyer'}
              </span>
              {(role === 'FARMER' ? farmerPendingOrdersCount : activeOrdersCount) > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#B3261E] animate-pulse" />
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Single Segmented Language Switcher (తె | EN) */}
            <div className="inline-flex rounded-xl p-0.5 bg-stone-100 border border-stone-200">
              <button
                type="button"
                onClick={() => setLanguage('te')}
                aria-label="తెలుగు భాషను ఎంచుకోండి"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                  language === 'te'
                    ? 'bg-[#1B3D27] text-white shadow-2xs'
                    : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
                }`}
              >
                తె
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-label="Select English language"
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#1B3D27] text-white shadow-2xs'
                    : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
                }`}
              >
                EN
              </button>
            </div>

            {/* Avatar Pill / Initial */}
            <div
              className="relative w-9 h-9 rounded-full bg-[#E6F2EA] border-2 border-[#1B3D27]/20 flex items-center justify-center text-[#1B3D27] font-black text-[13px] shrink-0 cursor-pointer"
              onClick={() => setIsDemoSheetOpen(true)}
              title={userName}
            >
              <span>{userInitials}</span>
              {role === 'FARMER' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1E7B3F] border-2 border-white" />
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Role Switch & Demo Options BottomSheet */}
      <BottomSheet
        isOpen={isDemoSheetOpen}
        onClose={() => setIsDemoSheetOpen(false)}
        title={language === 'te' ? 'పాత్ర మార్చండి / డెమో' : 'Switch Role & Demo'}
        subtitle={language === 'te' ? 'రైతు లేదా కొనుగోలుదారు వీక్షణను ఎంచుకోండి' : 'Choose Farmer or Buyer perspective'}
      >
        <div className="space-y-4 pt-1">
          
          {/* Farmer Option */}
          <button
            type="button"
            onClick={() => {
              setRole('FARMER');
              setIsDemoSheetOpen(false);
            }}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              role === 'FARMER'
                ? 'bg-[#E6F2EA] border-[#1B3D27] ring-2 ring-[#1B3D27]/20'
                : 'bg-white border-[#E2DDCF] hover:border-stone-400'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#1B3D27] text-[#F5B800] flex items-center justify-center text-2xl shrink-0">
                🧑‍🌾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-black text-[#1A1A1A]">
                    {language === 'te' ? 'రైతు మోడ్' : 'Farmer Mode'}
                  </h3>
                  {farmerPendingOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#B3261E] text-white">
                      {farmerPendingOrdersCount} new
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te'
                    ? 'పంటలు అమ్మండి, ఆర్డర్లు స్వీకరించండి'
                    : 'List harvests, accept direct orders'}
                </p>
              </div>
            </div>
            {role === 'FARMER' && (
              <div className="w-7 h-7 rounded-full bg-[#1B3D27] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Buyer Option */}
          <button
            type="button"
            onClick={() => {
              setRole('CUSTOMER');
              setIsDemoSheetOpen(false);
            }}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              role === 'CUSTOMER'
                ? 'bg-[#E6F2EA] border-[#1B3D27] ring-2 ring-[#1B3D27]/20'
                : 'bg-white border-[#E2DDCF] hover:border-stone-400'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center text-2xl shrink-0">
                🛒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-black text-[#1A1A1A]">
                    {language === 'te' ? 'కొనుగోలుదారు మోడ్' : 'Buyer Mode'}
                  </h3>
                  {activeOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#1E7B3F] text-white">
                      {activeOrdersCount}
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te'
                    ? 'తాజా పంటలు కొనండి, స్థానిక రైతులను కలవండి'
                    : 'Browse marketplace, request harvests'}
                </p>
              </div>
            </div>
            {role === 'CUSTOMER' && (
              <div className="w-7 h-7 rounded-full bg-[#1B3D27] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-[#E2DDCF]">
            <button
              type="button"
              onClick={() => {
                onResetDemo();
                setIsDemoSheetOpen(false);
              }}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-[#5B5B5B] hover:text-[#1A1A1A] flex items-center justify-center gap-2 text-[14px] font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{language === 'te' ? 'డెమో డేటాను ప్రారంభ స్థితికి రీసెట్ చేయండి' : 'Reset Demo Seed Data'}</span>
            </button>
          </div>

        </div>
      </BottomSheet>
    </>
  );
};
