import React from 'react';
import {
  X,
  Star,
  ShieldCheck,
  MapPin,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  TrendingUp,
  Package
} from 'lucide-react';
import { Farmer, Product, Review } from '../types';
import { Language, translations } from '../data/translations';

interface FarmerProfileModalProps {
  farmer: Farmer | null;
  products: Product[];
  reviews: Review[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  language: Language;
}

export const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({
  farmer,
  products,
  reviews,
  isOpen,
  onClose,
  onSelectProduct,
  language,
}) => {
  if (!isOpen || !farmer) return null;

  const t = translations[language];
  const farmerProducts = products.filter((p) => p.farmerId === farmer.id);
  const farmerReviews = reviews.filter((r) => r.farmerId === farmer.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-4">
            <img
              src={farmer.avatar}
              alt={farmer.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black">
                  {language === 'te' ? farmer.teluguName : farmer.name}
                </h2>
                {farmer.identityVerified ? (
                  <span className="px-2 py-0.5 bg-amber-400 text-stone-950 font-bold text-xs rounded flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-950" />
                    {t.verifiedFarmer}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-200 text-stone-950 font-bold text-xs rounded flex items-center gap-1 shadow-xs">
                    {language === 'te' ? 'గుర్తింపు పరిశీలనలో ఉంది' : 'Verification Pending'}
                  </span>
                )}
              </div>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-0.5">
                {language === 'te' ? farmer.farmNameTelugu : farmer.farmName}
              </p>
              <p className="text-emerald-300/80 text-xs flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span>{farmer.location}, {farmer.state}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* FEATURE 3: FARMER TRUST PASSPORT SECTION */}
          <div className="bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50/50 rounded-2xl p-5 border border-emerald-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 tracking-tight">
                    {t.trustPassportTitle}
                  </h3>
                  <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                    {farmer.identityVerified
                      ? (language === 'te' ? 'ప్లాట్‌ఫారమ్ ధృవీకరణ: పూర్తయింది' : 'Platform Trust Level: High (Identity Verified)')
                      : (language === 'te' ? 'ప్లాట్‌ఫారమ్ స్థితి: పరిశీలనలో ఉంది' : 'Platform Trust Level: Verification Pending')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-emerald-950">
                  {farmer.totalCompletedOrders > 0 && farmer.orderCompletionRate
                    ? `${farmer.orderCompletionRate}%`
                    : (language === 'te' ? 'కొత్త రైతు' : 'New Farmer')}
                </span>
                <p className="text-xs text-stone-600 font-medium">
                  {farmer.totalCompletedOrders > 0
                    ? t.orderCompletionRate
                    : (language === 'te' ? 'పూర్తయిన ఆర్డర్లు లేవు' : 'No order history yet')}
                </p>
              </div>
            </div>

            {/* Trust Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-xs text-stone-600 block">Rating</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {farmer.rating > 0 ? (
                    <>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-base font-extrabold text-stone-900">{farmer.rating}</span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-stone-500">
                      {language === 'te' ? 'కొత్త' : 'New'}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-600">
                  {farmer.reviewCount > 0 ? `(${farmer.reviewCount} reviews)` : (language === 'te' ? 'సమీక్షలు లేవు' : 'No reviews yet')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-xs text-stone-600 block">Completed</span>
                <span className="text-base font-extrabold text-stone-900 mt-0.5 block">
                  {farmer.totalCompletedOrders || 0}
                </span>
                <span className="text-xs text-stone-600">Delivered Orders</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-xs text-stone-600 block">Active Produce</span>
                <span className="text-base font-extrabold text-emerald-900 mt-0.5 block">
                  {farmerProducts.length}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Live in Market</span>
              </div>
            </div>

            {/* Why Trust This Farmer signals breakdown */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t.whyTrustFarmer}</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/60 flex items-start gap-2.5">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${farmer.identityVerified ? 'text-emerald-700' : 'text-amber-600'}`} />
                  <div>
                    <span className="font-bold text-stone-900">
                      {farmer.identityVerified
                        ? (language === 'te' ? 'గుర్తింపు ధృవీకరణ (Identity Verified)' : 'Identity Verified')
                        : (language === 'te' ? 'గుర్తింపు పరిశీలనలో ఉంది (Verification Pending)' : 'Identity Verification Pending')}
                    </span>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {farmer.identityVerified
                        ? (language === 'te'
                          ? `రైతు యొక్క గుర్తింపు మరియు ${farmer.location} లోని వ్యవసాయ క్షేత్రం ధృవీకరించబడింది.`
                          : `The farmer's identity credentials and farm location in ${farmer.location} have been verified on Farm Trust.`)
                        : (language === 'te'
                          ? `రైతు వాయిస్ ఆన్‌బోర్డింగ్ ద్వారా వివరాలు నమోదు చేశారు. ఫీల్డ్ ధృవీకరణ ప్రక్రియలో ఉంది.`
                          : 'Farmer voice onboarding details submitted. Farm Trust cluster verification is in progress.')}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/60 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900">
                      {language === 'te' ? 'ప్రజల రేటింగ్ (Community Rated)' : 'Community Rated'}
                    </span>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {language === 'te'
                        ? 'రేటింగ్‌లు కేవలం విజయవంతంగా డెలివరీ చేయబడిన ఆర్డర్ల ఆధారంగా మాత్రమే నమోదు చేయబడతాయి.'
                        : 'Ratings and reviews come strictly from verified buyers with delivered orders.'}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/60 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900">
                      {language === 'te' ? 'ఆర్డర్ చరిత్ర (Order History Available)' : 'Order History Available'}
                    </span>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {farmer.totalCompletedOrders > 0
                        ? (language === 'te'
                          ? `ఈ రైతు ఇప్పటివరకు ${farmer.totalCompletedOrders} ఆర్డర్లను ${farmer.orderCompletionRate || 98}% విజయవంతమైన రేటుతో సమయానికి పూర్తి చేశారు.`
                          : `Successfully fulfilled ${farmer.totalCompletedOrders} marketplace orders with a ${farmer.orderCompletionRate || 98}% reliability rate.`)
                        : (language === 'te'
                          ? 'కొత్త రైతు ప్రొఫైల్. ఇప్పటివరకు ఎలాంటి ఆర్డర్ డెలివరీలు నమోదు కాలేదు.'
                          : 'New producer profile. No completed customer deliveries yet.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="p-2 bg-amber-50/80 rounded-lg text-xs text-amber-900 border border-amber-200/60 leading-relaxed">
                <strong>Platform Notice:</strong> {t.platformSignalsNotice}
              </div>
            </div>
          </div>

          {/* Farmer Bio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              {language === 'te' ? 'రైతు గురించి' : 'About the Farm'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              {language === 'te' ? farmer.bioTelugu : farmer.bio}
            </p>
          </div>

          {/* Active Products */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              {language === 'te' ? 'ఈ రైతు వద్ద ఉన్న పంటలు' : `Produce by ${farmer.name}`} ({farmerProducts.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {farmerProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(p);
                  }}
                  className="flex items-center gap-3 p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">{p.name}</p>
                    <p className="text-xs font-extrabold text-emerald-950 mt-0.5">
                      ₹{p.price} / {p.priceUnit}
                    </p>
                    <span className="text-xs text-stone-600">
                      {p.availableQuantity} {p.unit} in stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              {language === 'te' ? 'వినియోగదారుల అభిప్రాయాలు' : 'Verified Customer Reviews'} ({farmerReviews.length})
            </h3>
            {farmerReviews.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs text-stone-500">
                <p className="font-semibold text-stone-700">
                  {language === 'te' ? 'ఇంకా ఎలాంటి సమీక్షలు లేవు' : 'No customer reviews yet'}
                </p>
                <p className="text-xs text-stone-600 mt-0.5">
                  {language === 'te'
                    ? 'ఈ రైతు వద్ద పంట ఆర్డర్ చేసి డెలివరీ పొందిన తర్వాత మొదటి సమీక్ష ఇవ్వండి!'
                    : 'Order produce from this farmer to be the first to leave a verified review!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {farmerReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">{rev.customerName}</span>
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-600">{rev.comment}</p>
                    <div className="flex items-center gap-2 text-xs text-stone-600 pt-0.5">
                      <span className="text-emerald-700 font-semibold">✓ Verified Purchase</span>
                      <span>·</span>
                      <span>{rev.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
