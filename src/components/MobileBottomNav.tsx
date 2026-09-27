import React from 'react';
import {
  Mic,
  Store,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Package,
  CalendarPlus,
  LayoutDashboard
} from 'lucide-react';
import { UserRole } from '../types';
import { Language } from '../data/translations';

interface MobileBottomNavProps {
  role: UserRole;
  language: Language;
  activeOrdersCount: number;
  farmerPendingOrdersCount: number;
  onOpenVoiceAction: () => void;
  onOpenAssistant: () => void;
  onOpenOrders: () => void;
  onOpenRequestModal: () => void;
  farmerTab: 'orders' | 'products' | 'demand' | 'profile';
  setFarmerTab: (tab: 'orders' | 'products' | 'demand' | 'profile') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  role,
  language,
  activeOrdersCount,
  farmerPendingOrdersCount,
  onOpenVoiceAction,
  onOpenAssistant,
  onOpenOrders,
  onOpenRequestModal,
  farmerTab,
  setFarmerTab,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        
        {role === 'FARMER' ? (
          <>
            {/* Orders Tab */}
            <button
              onClick={() => setFarmerTab('orders')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
                farmerTab === 'orders' ? 'text-emerald-900 font-bold' : 'text-stone-500'
              }`}
            >
              <div className="relative">
                <LayoutDashboard className="w-5 h-5" />
                {farmerPendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-black animate-pulse">
                    {farmerPendingOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">
                {language === 'te' ? 'ఆర్డర్లు' : 'Orders'}
              </span>
            </button>

            {/* Products Tab */}
            <button
              onClick={() => setFarmerTab('products')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                farmerTab === 'products' ? 'text-emerald-900 font-bold' : 'text-stone-500'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">
                {language === 'te' ? 'పంటలు' : 'Produce'}
              </span>
            </button>

            {/* CENTER PROMINENT VOICE BUTTON */}
            <div className="flex-1 flex justify-center -mt-5">
              <button
                onClick={onOpenVoiceAction}
                aria-label="Add Produce by Voice"
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1b3d27] to-[#2e6843] text-amber-300 shadow-xl border-4 border-white flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
              >
                <Mic className="w-6 h-6 animate-pulse text-amber-300" />
                <span className="text-[8px] font-black uppercase text-amber-200 tracking-tight leading-none mt-0.5">
                  {language === 'te' ? 'వాయిస్' : 'Speak'}
                </span>
              </button>
            </div>

            {/* Assistant Tab */}
            <button
              onClick={onOpenAssistant}
              className="flex-1 flex flex-col items-center justify-center py-1 text-stone-500 hover:text-emerald-900 rounded-xl transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] mt-0.5 font-medium">
                {language === 'te' ? 'సహాయకుడు' : 'Assistant'}
              </span>
            </button>

            {/* Demand Tab */}
            <button
              onClick={() => setFarmerTab('demand')}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
                farmerTab === 'demand' ? 'text-emerald-900 font-bold' : 'text-stone-500'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">
                {language === 'te' ? 'డిమాండ్' : 'Demand'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Marketplace Home */}
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 flex flex-col items-center justify-center py-1 text-emerald-900 font-bold rounded-xl transition-all cursor-pointer"
            >
              <Store className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">
                {language === 'te' ? 'అంగడి' : 'Market'}
              </span>
            </button>

            {/* Request Produce */}
            <button
              onClick={onOpenRequestModal}
              className="flex-1 flex flex-col items-center justify-center py-1 text-stone-500 hover:text-emerald-900 rounded-xl transition-all cursor-pointer"
            >
              <CalendarPlus className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">
                {language === 'te' ? 'రిక్వెస్ట్' : 'Request'}
              </span>
            </button>

            {/* CENTER PROMINENT VOICE SEARCH BUTTON */}
            <div className="flex-1 flex justify-center -mt-5">
              <button
                onClick={onOpenVoiceAction}
                aria-label="Voice Search"
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1b3d27] to-[#2e6843] text-amber-300 shadow-xl border-4 border-white flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
              >
                <Mic className="w-6 h-6 animate-pulse text-amber-300" />
                <span className="text-[8px] font-black uppercase text-amber-200 tracking-tight leading-none mt-0.5">
                  {language === 'te' ? 'వాయిస్' : 'Search'}
                </span>
              </button>
            </div>

            {/* Customer Orders */}
            <button
              onClick={onOpenOrders}
              className="flex-1 flex flex-col items-center justify-center py-1 text-stone-500 hover:text-emerald-900 rounded-xl transition-all cursor-pointer relative"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {activeOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[9px] font-bold">
                    {activeOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">
                {language === 'te' ? 'ఆర్డర్లు' : 'Orders'}
              </span>
            </button>
          </>
        )}

      </div>
    </nav>
  );
};
