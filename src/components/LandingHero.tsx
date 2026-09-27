import React from 'react';
import {
  Mic,
  Sprout,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  HeartHandshake
} from 'lucide-react';
import { Language, translations } from '../data/translations';

interface LandingHeroProps {
  language: Language;
  onExploreProducts: () => void;
  onFarmerStart: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  language,
  onExploreProducts,
  onFarmerStart,
}) => {
  const t = translations[language];

  return (
    <div className="bg-gradient-to-b from-[#1b3d27] via-[#244f34] to-[#faf8f5] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {language === 'te'
                ? 'వాయిస్ ఆధారిత వ్యవసాయ విప్లవం'
                : 'Voice-First Agricultural Marketplace'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight sm:leading-tight">
            {language === 'te'
              ? 'స్వచ్ఛమైన ఆహారం. సరసమైన ధరలు. నేరుగా రైతుల నుండి.'
              : 'Pure Food. Fair Prices. Direct from Farmers.'}
          </h1>

          <p className="text-sm sm:text-lg text-emerald-100/90 font-medium max-w-2xl mx-auto leading-relaxed">
            {language === 'te'
              ? 'రైతులు నోటితో చెప్పి అమ్ముకోవచ్చు. కుటుంబాలు నోటితో చెప్పి కొనుగోలు చేయవచ్చు. AI ఇరువైపులా అనుసంధానిస్తుంది.'
              : 'Farmers can sell by speaking. Families can buy by speaking. AI helps both sides communicate, discover produce, and build trust.'}
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onExploreProducts}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-stone-950" />
              <span>{t.exploreProducts}</span>
            </button>

            <button
              onClick={onFarmerStart}
              className="px-6 py-3 bg-white/15 hover:bg-white/25 text-white font-extrabold text-sm rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Mic className="w-4 h-4 text-amber-300" />
              <span>{t.iamFarmer} ({language === 'te' ? 'వాయిస్ ద్వారా చేర్చండి' : 'Add by Voice'})</span>
            </button>
          </div>
        </div>

        {/* 4 Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 text-white space-y-1.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold mb-3 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">
              {language === 'te' ? 'వాయిస్ ద్వారా సులభంగా' : 'Voice in Your Language'}
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {language === 'te'
                ? 'టైప్ చేయనవసరం లేదు. తెలుగు లేదా ఇంగ్లీషులో మాట్లాడి పంటను సులభంగా అమ్మండి.'
                : 'Speak naturally instead of typing. Vernacular speech understanding with intelligent crop extraction.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 text-white space-y-1.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-emerald-400 text-stone-950 flex items-center justify-center font-bold mb-3 shadow-xs">
              <Sprout className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">
              {language === 'te' ? 'నేరుగా రైతుల నుండి' : 'Direct From Farmers'}
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {language === 'te'
                ? 'మధ్యవర్తులు లేరు. రైతుకు న్యాయమైన ధర, కుటుంబానికి పొలం నుండి తాజా పంట.'
                : 'Zero broker margins. Fair farmgate prices for producers and crisp morning harvest for families.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 text-white space-y-1.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold mb-3 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">
              {language === 'te' ? 'పారదర్శకమైన నమ్మకం' : 'Transparent Trust'}
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {language === 'te'
                ? 'గుర్తింపు ధృవీకరణ మరియు ప్రజల నిజమైన సమీక్షలతో స్పష్టమైన విశ్వాసం.'
                : 'Farmer Trust Passport, evidence-based claims, and delivered-only community ratings.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 text-white space-y-1.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-emerald-400 text-stone-950 flex items-center justify-center font-bold mb-3 shadow-xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold tracking-tight">
              {language === 'te' ? 'సమగ్ర మార్కెట్ అనుసంధానం' : 'Direct to Doorstep'}
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {language === 'te'
                ? 'కనుగొనండి → పోల్చండి → ఆర్డర్ చేయండి → OTP తో స్వీకరించండి.'
                : 'Discover → Request → 1-Click Offer → 2-Way OTP Delivery Handshake.'}
            </p>
          </div>
        </div>

        {/* How Farm Trust Works - Value Chain Visual Story */}
        <div className="bg-stone-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-emerald-500/30 text-xs sm:text-sm text-stone-300 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                {language === 'te' ? 'ఫార్మ్‌ట్రస్ట్ ఎలా పనిచేస్తుంది?' : 'How Farm Trust Works'}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              {language === 'te' ? 'రైతు నుండి కుటుంబానికి' : 'Direct Farm-to-Fork Loop'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs">1</span>
                <strong className="text-amber-300 font-bold">
                  {language === 'te' ? 'రైతు స్వరం (Speak to Sell)' : 'Farmer Speaks Naturally'}
                </strong>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {language === 'te'
                  ? 'రైతులు తెలుగు లేదా ఇంగ్లీషులో మాట్లాడగానే, AI పంట, పరిమాణం, ధరను గుర్తించి తక్షణమే లిస్టింగ్ తయారుచేస్తుంది.'
                  : 'Farmers speak naturally in Telugu or English. AI extracts crop, quantity, and price for 1-tap confirmation.'}
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-stone-950 font-black flex items-center justify-center text-xs">2</span>
                <strong className="text-emerald-300 font-bold">
                  {language === 'te' ? 'స్థానిక డిమాండ్ (Direct Match)' : 'Local Demand Matching'}
                </strong>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {language === 'te'
                  ? 'కస్టమర్ల అవసరాలు రైతు లైవ్ డిమాండ్ బోర్డుపై కనిపిస్తాయి. రైతు ఒకే ట్యాప్‌తో తన పంటను ఆఫర్ చేయవచ్చు.'
                  : 'Customer requests surface on the farmer’s live Demand Board. Farmers respond with instant 1-click offers.'}
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs">3</span>
                <strong className="text-amber-300 font-bold">
                  {language === 'te' ? 'నమ్మకమైన డెలివరీ (Verified Handshake)' : 'Two-Way Verified Handshake'}
                </strong>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {language === 'te'
                  ? '4-అంకెల డెలివరీ OTP నిర్ధారణతో మాత్రమే ఆర్డర్ పూర్తవుతుంది. డెలివరీ తర్వాత మాత్రమే సమీక్ష ఇవ్వడం సాధ్యమవుతుంది.'
                  : 'Orders complete via 4-digit buyer OTP verification. Authentic reviews unlock only after confirmed receipt.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
