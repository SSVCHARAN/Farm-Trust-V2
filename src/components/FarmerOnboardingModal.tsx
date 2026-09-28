import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  User,
  MapPin,
  Trees,
  Sprout,
  ArrowRight,
  RefreshCw,
  Phone
} from 'lucide-react';
import { Farmer, FarmerOnboardingData } from '../types';
import { parseVoiceOnboarding } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language, translations } from '../data/translations';

interface FarmerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFarmerRegistered: (farmer: Farmer) => void;
  language: Language;
}

export const FarmerOnboardingModal: React.FC<FarmerOnboardingModalProps> = ({
  isOpen,
  onClose,
  onFarmerRegistered,
  language,
}) => {
  const t = translations[language];

  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');
  const [onboardingData, setOnboardingData] = useState<FarmerOnboardingData | null>(null);

  // Form field state for post-voice editing
  const [formName, setFormName] = useState('');
  const [formTeluguName, setFormTeluguName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAcres, setFormAcres] = useState<number>(3);
  const [formCrops, setFormCrops] = useState('');
  const [formPhone, setFormPhone] = useState('9876543210');

  useEffect(() => {
    if (isOpen) {
      setSpokenText('');
      setIsListening(false);
      setIsAnalyzing(false);
      setOnboardingData(null);
      setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
    }
  }, [isOpen, language]);

  useEffect(() => {
    return () => {
      UniversalVoiceInput.stopListening();
    };
  }, []);

  const startListening = () => {
    setIsListening(true);
    setSpokenText('');

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1500,
      onInterim: (text) => {
        setSpokenText(text);
      },
      onFinal: (text) => {
        setIsListening(false);
        setSpokenText(text);
        handleProcessSpeech(text);
      },
      onError: (code) => {
        setIsListening(false);
        if (code === 'permission-denied') {
          alert('Microphone permission blocked. Please enable microphone permissions in your browser.');
        }
      },
    });
  };

  const stopListening = () => {
    UniversalVoiceInput.stopListening();
    setIsListening(false);
    if (spokenText.trim()) {
      handleProcessSpeech(spokenText.trim());
    }
  };

  const handleProcessSpeech = async (textToProcess: string) => {
    const text = textToProcess.trim();
    if (!text) return;

    setIsAnalyzing(true);
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const extracted = await parseVoiceOnboarding(text, langParam);
      setOnboardingData(extracted);

      setFormName(extracted.farmerName || 'Lakshmi Devi');
      setFormTeluguName(extracted.farmerTeluguName || 'లక్ష్మి దేవి');
      setFormLocation(extracted.location || 'Sabbavaram, Visakhapatnam');
      setFormAcres(extracted.acres || 3);
      setFormCrops((extracted.crops || ['Tomatoes', 'Chillies']).join(', '));
      setFormPhone(extracted.phone || '9876543210');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegister = () => {
    if (!formName) return;

    const newFarmerId = `farmer-${Date.now()}`;
    const cropsArray = formCrops.split(',').map((c) => c.trim()).filter(Boolean);

    const newFarmer: Farmer = {
      id: newFarmerId,
      name: formName,
      teluguName: formTeluguName || formName,
      avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300',
      phone: formPhone,
      location: formLocation || 'Sabbavaram, Visakhapatnam',
      district: onboardingData?.district || 'Visakhapatnam',
      state: 'Andhra Pradesh',
      acres: Number(formAcres) || 3,
      experienceYears: onboardingData?.experienceYears || 12,
      rating: 0,
      reviewCount: 0,
      farmName: onboardingData?.farmName || `${formName}'s Farm`,
      farmNameTelugu: onboardingData?.farmNameTelugu || `${formTeluguName || formName} వ్యవసాయ క్షేత్రం`,
      joinedYear: new Date().getFullYear().toString(),
      identityVerified: false,
      communityRated: false,
      organicCertified: false,
      bio: `Farmer from ${formLocation} cultivating ${cropsArray.join(', ')}.`,
      bioTelugu: `${formLocation} ప్రాంతానికి చెందిన రైతు, ${cropsArray.join(', ')} సాగు చేస్తున్నారు.`,
      verifiedBadges: [
        {
          id: 'v1',
          label: 'Identity Verification Pending',
          labelTelugu: 'గుర్తింపు పరిశీలనలో ఉంది',
          description: 'Farmer voice onboarding details submitted. Platform verification pending.',
          verified: false,
        },
        {
          id: 'v2',
          label: 'Farm Details Submitted',
          labelTelugu: 'పొలం వివరాలు సమర్పించబడ్డాయి',
          description: 'Acreage and crop patterns declared by farmer.',
          verified: true,
        }
      ],
      orderCompletionRate: undefined,
      totalCompletedOrders: 0,
    };

    onFarmerRegistered(newFarmer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2 pb-1 bg-[#1b3d27] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="bg-[#1b3d27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Sprout className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">{t.voiceOnboardTitle}</h2>
              <p className="text-xs text-emerald-100 font-medium">{t.voiceOnboardSub}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 min-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Step 1: Voice Recording Area */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-stone-600">Language:</span>
              <div className="inline-flex bg-stone-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setVoiceLang('te-IN')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all min-touch-target ${
                    voiceLang === 'te-IN' ? 'bg-[#1b3d27] text-amber-300 shadow-xs' : 'text-stone-700'
                  }`}
                >
                  తెలుగు (Telugu)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLang('en-IN')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all min-touch-target ${
                    voiceLang === 'en-IN' ? 'bg-[#1b3d27] text-amber-300 shadow-xs' : 'text-stone-700'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white shadow-lg transition-all cursor-pointer min-touch-target ${
                  isListening
                    ? 'bg-red-600 animate-mic-ring scale-105'
                    : 'bg-[#1b3d27] hover:bg-[#244f34] text-amber-300'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-8 h-8 animate-pulse" />
                    <span className="text-xs font-bold mt-1 text-white">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8" />
                    <span className="text-xs font-bold mt-1 text-amber-300">Speak</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-stone-600 font-medium leading-relaxed">
              {isListening
                ? (language === 'te' ? 'వింటున్నాము... దయచేసి మీ పేరు, గ్రామం మరియు పంటలు చెప్పండి' : 'Listening... please tell us your name, village, and crops')
                : (language === 'te' ? 'మైక్రోఫోన్ నొక్కి వివరాలు మాట్లాడండి' : 'Tap the microphone to speak your details')}
            </p>

            {/* Live speech transcription */}
            {spokenText && (
              <div className="p-3 bg-white rounded-xl border border-stone-300 text-left text-xs font-medium text-stone-800">
                <span className="text-xs uppercase font-bold text-stone-600 block mb-1">
                  {language === 'te' ? 'మీరు చెప్పినది:' : 'You said:'}
                </span>
                <p className="italic leading-relaxed">{spokenText}</p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleProcessSpeech(spokenText)}
                    disabled={isAnalyzing}
                    className="px-3 py-1 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer min-touch-target"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'వివరాలు పొందండి' : 'Extract Details'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sample Prompts */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-emerald-800" />
              <span>{language === 'te' ? 'లేదా ఈ క్రింది ఉదాహరణ నొక్కండి:' : 'Or tap a sample sentence to test:'}</span>
            </span>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSpokenText(t.onboardSample2);
                  handleProcessSpeech(t.onboardSample2);
                }}
                className="p-2.5 text-left bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl transition-colors cursor-pointer min-touch-target"
              >
                <p className="font-bold text-emerald-950">🌾 రాము - ఆనందపురం (Telugu)</p>
                <p className="text-stone-600 text-xs truncate">{t.onboardSample2}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSpokenText(t.onboardSample1);
                  handleProcessSpeech(t.onboardSample1);
                }}
                className="p-2.5 text-left bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl transition-colors cursor-pointer min-touch-target"
              >
                <p className="font-bold text-emerald-950">🌾 Lakshmi - Sabbavaram (English)</p>
                <p className="text-stone-600 text-xs truncate">{t.onboardSample1}</p>
              </button>
            </div>
          </div>

          {/* AI Analyzing Indicator */}
          {isAnalyzing && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center gap-2 text-xs text-emerald-950 font-bold animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-700 animate-spin" />
              <span>{language === 'te' ? 'రైతు వివరాలు సంగ్రహిస్తున్నాం...' : 'Extracting farmer profile with AI...'}</span>
            </div>
          )}

          {/* Extracted Structured Profile Form */}
          {onboardingData && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'te' ? 'గుర్తించిన వివరాలు (సరిచూసుకోండి):' : 'AI Extracted Details (Review & Confirm):'}</span>
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  100% Free
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.farmerNameLabel} (English)
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-2">
                    <User className="w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    రైతు పేరు (Telugu)
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-2">
                    <User className="w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="text"
                      value={formTeluguName}
                      onChange={(e) => setFormTeluguName(e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.villageLocationLabel}
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-transparent focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.acresLabel}
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-2">
                    <Trees className="w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="number"
                      value={formAcres}
                      onChange={(e) => setFormAcres(Number(e.target.value))}
                      className="w-full bg-transparent focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.cropsLabel}
                  </label>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-2.5 py-2">
                    <Sprout className="w-3.5 h-3.5 text-stone-600" />
                    <input
                      type="text"
                      value={formCrops}
                      onChange={(e) => setFormCrops(e.target.value)}
                      placeholder="e.g. Tomatoes, Chillies, Brinjal"
                      className="w-full bg-transparent focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardingData(null)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 rounded-xl border border-stone-300 cursor-pointer min-touch-target"
                >
                  {language === 'te' ? 'మళ్ళీ చెప్పండి' : 'Start Over'}
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="px-5 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer min-touch-target"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>{t.registerAsFarmer}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
