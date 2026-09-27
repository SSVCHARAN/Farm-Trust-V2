import React from 'react';
import { Sprout, Globe, UserCheck, ShoppingBag, RotateCcw } from 'lucide-react';
import { UserRole } from '../types';
import { Language, translations } from '../data/translations';

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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      {/* Top Bar / Clean Account & Role Switcher */}
      <div className="bg-[#1b3d27] text-white px-3 sm:px-6 py-1.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 border-b border-emerald-900/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-emerald-200/90 font-bold text-[11px] sm:text-xs hidden md:inline">
            {language === 'te' ? 'యాక్టివ్ ఖాతా:' : 'Active Account:'}
          </span>
          <div className="inline-flex rounded-lg p-0.5 bg-black/25 border border-white/10 shrink-0">
            <button
              onClick={() => setRole('FARMER')}
              className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs transition-all font-bold flex items-center gap-1 cursor-pointer ${
                role === 'FARMER'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>🧑‍🌾</span>
              <span>{language === 'te' ? 'రైతు' : 'Farmer'}</span>
              <span className="hidden sm:inline">{language === 'te' ? 'వీక్షణ' : 'View'}</span>
              <span className="hidden lg:inline font-normal opacity-85 text-[11px]">
                ({language === 'te' ? 'రవి కుమార్' : 'Ravi Kumar'})
              </span>
              {farmerPendingOrdersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-black animate-pulse">
                  {farmerPendingOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setRole('CUSTOMER')}
              className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs transition-all font-bold flex items-center gap-1 cursor-pointer ${
                role === 'CUSTOMER'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>🛒</span>
              <span>{language === 'te' ? 'కొనుగోలు' : 'Buyer'}</span>
              <span className="hidden sm:inline">{language === 'te' ? 'దారు' : 'View'}</span>
              <span className="hidden lg:inline font-normal opacity-85 text-[11px]">
                ({language === 'te' ? 'అనన్య' : 'Ananya'})
              </span>
              {activeOrdersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-700 text-amber-200 rounded-full text-[10px] font-black">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center gap-0.5 bg-black/25 border border-white/10 rounded-md p-0.5">
            <Globe className="w-3.5 h-3.5 text-emerald-300 ml-1 hidden sm:inline" />
            <button
              onClick={() => setLanguage('te')}
              className={`px-1.5 sm:px-2 py-0.5 text-xs rounded transition-all cursor-pointer ${
                language === 'te'
                  ? 'bg-white text-stone-900 font-bold shadow-2xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              తెలుగు
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-1.5 sm:px-2 py-0.5 text-xs rounded transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-stone-900 font-bold shadow-2xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button
            onClick={onResetDemo}
            title={language === 'te' ? 'డేటా రీసెట్' : 'Reset demo seed data'}
            className="flex items-center gap-1 text-[11px] text-emerald-300/70 hover:text-white transition-colors px-1.5 py-1 rounded cursor-pointer opacity-75 hover:opacity-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{language === 'te' ? 'రీసెట్' : 'Reset Data'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-green-950 flex items-center justify-center text-amber-300 shadow-sm border border-emerald-700/30 shrink-0">
            <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-950 truncate">
                {t.appName}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 hidden sm:inline-block">
                {language === 'te' ? 'ప్రత్యక్ష రైతు అంగడి' : 'Direct Farm Direct'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {role === 'CUSTOMER' && (
            <button
              onClick={onOpenOrders}
              className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-emerald-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>{t.myOrders}</span>
              {activeOrdersCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white bg-emerald-700 rounded-full">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          )}

          {role === 'FARMER' && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-xs font-medium text-amber-900">
              <UserCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">
                {language === 'te' ? 'రవి కుమార్' : 'Ravi Kumar'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
