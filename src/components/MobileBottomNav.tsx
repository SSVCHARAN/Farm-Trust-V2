import React from 'react';
import {
  Mic,
  Store,
  ShoppingBag,
  TrendingUp,
  Package,
  CalendarPlus,
  Home,
  Clock
} from 'lucide-react';
import { UserRole } from '../types';
import { Language } from '../data/translations';

interface MobileBottomNavProps {
  role: UserRole;
  language: Language;
  activeOrdersCount: number;
  farmerPendingOrdersCount: number;
  basketCount?: number;
  onOpenVoiceAction: () => void;
  onOpenOrders: () => void;
  onOpenRequestModal: () => void;
  onOpenBasket?: () => void;
  farmerTab: 'home' | 'orders' | 'products' | 'demand' | 'profile';
  setFarmerTab: (tab: 'home' | 'orders' | 'products' | 'demand' | 'profile') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  role,
  language,
  activeOrdersCount,
  farmerPendingOrdersCount,
  basketCount = 0,
  onOpenVoiceAction,
  onOpenOrders,
  onOpenRequestModal,
  onOpenBasket,
  farmerTab,
  setFarmerTab,
}) => {
  return (
    <nav
      aria-label="Mobile navigation bar"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2DDCF] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-safe select-none"
    >
      <div className="flex items-end justify-between max-w-md mx-auto relative px-1">
        
        {role === 'FARMER' ? (
          <>
            {/* 1. Home Tab */}
            <button
              type="button"
              onClick={() => setFarmerTab('home')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[50px] ${
                farmerTab === 'home'
                  ? 'text-[#1B3D27] font-black'
                  : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
              }`}
            >
              <div className={`p-1 rounded-xl ${farmerTab === 'home' ? 'bg-[#E6F2EA]' : ''}`}>
                <Home className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'హోమ్' : 'Home'}
              </span>
            </button>

            {/* 2. Orders Tab */}
            <button
              type="button"
              onClick={() => setFarmerTab('orders')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative min-h-[50px] ${
                farmerTab === 'orders'
                  ? 'text-[#1B3D27] font-black'
                  : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
              }`}
            >
              <div className={`p-1 rounded-xl relative ${farmerTab === 'orders' ? 'bg-[#E6F2EA]' : ''}`}>
                <Clock className="w-5 h-5 stroke-[2.2]" />
                {farmerPendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-[#B3261E] text-white rounded-full text-[11px] font-black leading-none animate-pulse">
                    {farmerPendingOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'ఆర్డర్లు' : 'Orders'}
              </span>
            </button>

            {/* 3. CENTER PROMINENT VOICE BUTTON (64px amber circle) */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-6">
              <button
                type="button"
                onClick={onOpenVoiceAction}
                aria-label="Speak / మాట్లాడండి"
                className="w-16 h-16 rounded-full bg-[#F5B800] text-[#1A1A1A] hover:bg-[#E5AC00] active:scale-95 transition-all shadow-[0_4px_16px_rgba(245,184,0,0.45)] border-4 border-white flex flex-col items-center justify-center cursor-pointer shrink-0"
              >
                <Mic className="w-7 h-7 stroke-[2.5]" />
              </button>
              <span className="text-[11px] font-black text-[#1A1A1A] mt-0.5 tracking-tight whitespace-nowrap">
                {language === 'te' ? 'మాట్లాడండి' : 'Speak'}
              </span>
            </div>

            {/* 4. Produce Tab */}
            <button
              type="button"
              onClick={() => setFarmerTab('products')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[50px] ${
                farmerTab === 'products'
                  ? 'text-[#1B3D27] font-black'
                  : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
              }`}
            >
              <div className={`p-1 rounded-xl ${farmerTab === 'products' ? 'bg-[#E6F2EA]' : ''}`}>
                <Package className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'పంటలు' : 'Produce'}
              </span>
            </button>

            {/* 5. Prices Tab (Merges Demand & Mandi Prices) */}
            <button
              type="button"
              onClick={() => setFarmerTab('demand')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[50px] ${
                farmerTab === 'demand'
                  ? 'text-[#1B3D27] font-black'
                  : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
              }`}
            >
              <div className={`p-1 rounded-xl ${farmerTab === 'demand' ? 'bg-[#E6F2EA]' : ''}`}>
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'ధరలు' : 'Prices'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* 1. Market Home */}
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[50px] text-[#1B3D27] font-black"
            >
              <div className="p-1 rounded-xl bg-[#E6F2EA]">
                <Store className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'అంగడి' : 'Market'}
              </span>
            </button>

            {/* 2. Requests Tab */}
            <button
              type="button"
              onClick={onOpenRequestModal}
              className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[50px] text-[#5B5B5B] hover:text-[#1A1A1A]"
            >
              <div className="p-1 rounded-xl">
                <CalendarPlus className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'రిక్వెస్ట్‌లు' : 'Requests'}
              </span>
            </button>

            {/* 3. CENTER PROMINENT VOICE BUTTON (64px amber circle) */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-6">
              <button
                type="button"
                onClick={onOpenVoiceAction}
                aria-label="Speak / మాట్లాడండి"
                className="w-16 h-16 rounded-full bg-[#F5B800] text-[#1A1A1A] hover:bg-[#E5AC00] active:scale-95 transition-all shadow-[0_4px_16px_rgba(245,184,0,0.45)] border-4 border-white flex flex-col items-center justify-center cursor-pointer shrink-0"
              >
                <Mic className="w-7 h-7 stroke-[2.5]" />
              </button>
              <span className="text-[11px] font-black text-[#1A1A1A] mt-0.5 tracking-tight whitespace-nowrap">
                {language === 'te' ? 'మాట్లాడండి' : 'Speak'}
              </span>
            </div>

            {/* 4. Basket Tab */}
            <button
              type="button"
              onClick={() => {
                if (onOpenBasket) {
                  onOpenBasket();
                } else {
                  onOpenOrders();
                }
              }}
              className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative min-h-[50px] text-[#5B5B5B] hover:text-[#1A1A1A]"
            >
              <div className="p-1 rounded-xl relative">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                {basketCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-[#1B3D27] text-white rounded-full text-[11px] font-black leading-none">
                    {basketCount}
                  </span>
                )}
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'బుట్ట' : 'Basket'}
              </span>
            </button>

            {/* 5. Orders Tab */}
            <button
              type="button"
              onClick={onOpenOrders}
              className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative min-h-[50px] text-[#5B5B5B] hover:text-[#1A1A1A]"
            >
              <div className="p-1 rounded-xl relative">
                <Clock className="w-5 h-5 stroke-[2.2]" />
                {activeOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-[#1E7B3F] text-white rounded-full text-[11px] font-black leading-none">
                    {activeOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[13px] mt-0.5 leading-tight font-bold">
                {language === 'te' ? 'ఆర్డర్లు' : 'Orders'}
              </span>
            </button>
          </>
        )}

      </div>
    </nav>
  );
};
