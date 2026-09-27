import React, { useState } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  MapPin,
  Leaf,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Product, Farmer } from '../types';
import { Language, translations } from '../data/translations';

interface ProductDetailModalProps {
  product: Product | null;
  farmer: Farmer | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderNow: (product: Product, quantity: number) => void;
  onOpenFarmerProfile: (farmer: Farmer) => void;
  language: Language;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  farmer,
  isOpen,
  onClose,
  onOrderNow,
  onOpenFarmerProfile,
  language,
}) => {
  const [quantity, setQuantity] = useState<number>(2);

  if (!isOpen || !product) return null;

  const t = translations[language];
  const totalPrice = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-stone-100 flex justify-center sticky top-0 z-20">
          <div className="w-12 h-1 bg-stone-400/50 rounded-full"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Produce Image Container */}
          <div className="sm:w-1/2 h-52 sm:h-auto relative bg-stone-100 shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.organicClaim && (
              <div className="absolute top-3 left-3 bg-[#1e3a24] text-amber-300 text-xs font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5" />
                <span>{t.organicClaimBadge}</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-bold text-stone-800 shadow-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>{product.harvestDate}</span>
            </div>
          </div>

          {/* Details Column */}
          <div className="sm:w-1/2 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Category & Title */}
              <div className="flex items-center justify-between text-xs text-stone-400 font-semibold mb-1">
                <span className="text-emerald-800 uppercase tracking-wider">{product.category}</span>
                <span className="text-stone-500 font-normal">
                  {product.availableQuantity} {product.unit} available
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight leading-snug">
                {product.name}
              </h2>
              {product.teluguName && product.teluguName !== product.name && (
                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                  {product.teluguName}
                </p>
              )}

              {/* Price Banner */}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                  ₹{product.price}
                </span>
                <span className="text-sm font-semibold text-stone-500">
                  / {product.priceUnit}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-stone-600 mt-2.5 leading-relaxed">
                {product.description}
              </p>

              {/* Trust & Farmer Section */}
              <div className="mt-4 pt-3 border-t border-stone-200">
                <div
                  onClick={() => farmer && onOpenFarmerProfile(farmer)}
                  className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200/60"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={product.farmerAvatar}
                      alt={product.farmerName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-400"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-stone-900">
                          {product.farmerName}
                        </span>
                        {product.farmerVerified ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            {language === 'te' ? 'పరిశీలనలో ఉంది' : 'Verification Pending'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{product.farmerLocation}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                      {product.farmerRating > 0 ? (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{product.farmerRating}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-stone-500 font-medium">
                          {language === 'te' ? 'కొత్త రైతు' : 'New Farmer'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-800 underline font-bold">
                      {language === 'te' ? 'రైతు ప్రొఫైల్' : 'View Profile'}
                    </span>
                  </div>
                </div>

                {/* Trust Verification Box */}
                <div className="mt-3 space-y-2 text-xs">
                  {/* Trust screening alert if review recommended or exaggerated */}
                  {product.trustStatus === 'review_recommended' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>{t.reviewRecommendedClaim}</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {product.trustNote || 'This description contains strong organic declarations that require supporting evidence.'}
                      </p>
                    </div>
                  )}

                  {product.trustStatus === 'potentially_exaggerated' && (
                    <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-red-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-950">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                        <span>{t.potentiallyExaggeratedClaim}</span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-relaxed">
                        {product.trustNote || 'This description contains unverified health claims.'}
                      </p>
                    </div>
                  )}

                  {/* Clear separation: Farmer-Declared vs Platform-Verified */}
                  <div className="bg-stone-50/90 p-2.5 rounded-xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-500">{language === 'te' ? 'పంట వర్గం:' : 'Produce Type:'}</span>
                      <span className="px-2 py-0.5 bg-stone-200/80 rounded font-medium text-stone-800">
                        {product.organicClaim ? t.farmerDeclared : (language === 'te' ? 'సాధారణ పొలం కోత' : 'Standard Field Harvest')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-500">{language === 'te' ? 'ప్లాట్‌ఫారమ్ స్థితి:' : 'Platform Status:'}</span>
                      {product.farmerVerified ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>{language === 'te' ? 'ధృవీకరించబడిన రైతు' : 'Identity Verified Farmer'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>{language === 'te' ? 'పరిశీలనలో ఉంది' : 'Verification Pending'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200 leading-relaxed">
                      {product.trustNote || (product.farmerVerified
                        ? (language === 'te' ? 'ధృవీకరించబడిన రైతు · ప్రత్యక్ష పొలం కోత' : 'Identity verified producer · Direct farm harvest')
                        : (language === 'te' ? 'కొత్త రైతు నమోదు చేసిన వివరాలు' : 'Direct producer listing · Farm details submitted'))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Quantity + Order */}
            <div className="pt-3 border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">{t.selectQuantity}:</span>
                <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-800 font-bold shadow-xs cursor-pointer active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center text-sm font-extrabold text-stone-900">
                    {quantity} {product.unit}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.availableQuantity, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-white hover:bg-stone-200 flex items-center justify-center text-stone-800 font-bold shadow-xs cursor-pointer active:scale-95"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[11px] text-stone-500 block">{t.totalAmount}</span>
                  <span className="text-xl font-black text-emerald-950">₹{totalPrice}</span>
                </div>

                <button
                  onClick={() => onOrderNow(product, quantity)}
                  className="px-6 py-3 bg-[#1e3a24] hover:bg-emerald-900 text-amber-300 font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t.viewAndBuy}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
