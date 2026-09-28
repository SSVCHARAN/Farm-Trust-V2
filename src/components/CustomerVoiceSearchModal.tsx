import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Edit3,
  X,
  Volume2,
  Search,
  AlertCircle,
  Keyboard,
  ArrowRight,
  Check
} from 'lucide-react';
import { CustomerVoiceSearchIntent } from '../types';
import { parseCustomerVoiceSearch } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language, translations } from '../data/translations';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface CustomerVoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyIntent: (intent: CustomerVoiceSearchIntent) => void;
  language: Language;
}

export type CustomerVoiceState = 'idle' | 'listening' | 'processing' | 'confirm' | 'edit' | 'error';

export const CustomerVoiceSearchModal: React.FC<CustomerVoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyIntent,
  language,
}) => {
  const t = translations[language];

  // Test mode query params support
  const getInitialState = (): CustomerVoiceState => {
    if (typeof window !== 'undefined') {
      const vs = new URLSearchParams(window.location.search).get('vstate');
      if (vs && ['idle', 'listening', 'processing', 'confirm', 'error'].includes(vs)) {
        return vs as CustomerVoiceState;
      }
    }
    return 'idle';
  };

  const [state, setState] = useState<CustomerVoiceState>(getInitialState);
  const [transcript, setTranscript] = useState<string>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('vstate') === 'confirm') {
      return language === 'te' ? 'తాజా టమాటాలు 40 రూపాయల లోపు కావాలి' : 'Need fresh tomatoes under 40 rupees';
    }
    return '';
  });
  const [manualText, setManualText] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [errorType, setErrorType] = useState<'permission' | 'network' | 'unrecognized' | null>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('vstate') === 'error') {
      return (new URLSearchParams(window.location.search).get('verr') as any) || 'unrecognized';
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');

  // Interpreted Intent
  const [intent, setIntent] = useState<CustomerVoiceSearchIntent | null>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('vstate') === 'confirm') {
      return {
        product: 'Tomatoes',
        productTelugu: 'టమాటాలు',
        quantity: 2,
        unit: 'kg',
        maxPrice: 40,
        rawQuery: language === 'te' ? 'తాజా టమాటాలు 40 రూపాయల లోపు కావాలి' : 'Need fresh tomatoes under 40 rupees',
        interpretation: 'Tomatoes · 2 kg · Up to ₹40/kg',
        interpretationTelugu: 'టమాటాలు · 2 కిలోలు · గరిష్ట ధర ₹40/kg',
      };
    }
    return null;
  });

  // Editable fields
  const [editProduct, setEditProduct] = useState(intent?.product || 'Tomatoes');
  const [editQuantity, setEditQuantity] = useState<number | null>(intent?.quantity || 2);
  const [editUnit, setEditUnit] = useState(intent?.unit || 'kg');
  const [editMaxPrice, setEditMaxPrice] = useState<number | null>(intent?.maxPrice || 40);

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialState();
      setState(initial);
      if (initial !== 'confirm') {
        setTranscript('');
        setIntent(null);
      }
      setManualText('');
      setErrorType(null);
      setErrorMessage(null);
      setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
    }
  }, [isOpen, language]);

  useEffect(() => {
    return () => {
      UniversalVoiceInput.stopListening();
    };
  }, []);

  const startListening = () => {
    setErrorType(null);
    setErrorMessage(null);
    setState('listening');
    setTranscript('');

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1800,
      onInterim: (text) => {
        setTranscript(text);
      },
      onFinal: (text) => {
        setTranscript(text);
        processQuery(text);
      },
      onError: (code, msg) => {
        if (code === 'permission-denied') {
          setErrorType('permission');
          setErrorMessage(
            language === 'te'
              ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్ అడ్రస్ బార్‌లో మైక్ అనుమతి ఇవ్వండి లేదా టైప్ చేయండి.'
              : 'Microphone permission blocked. Please allow mic in browser settings or type below.'
          );
          setState('error');
        } else if (code === 'network') {
          setErrorType('network');
          setErrorMessage(
            language === 'te'
              ? 'వాయిస్ కనెక్ట్ కాలేదు. మళ్ళీ ప్రయత్నించండి.'
              : "Voice couldn't connect. Please check network and try again."
          );
          setState('error');
        } else if (code === 'no-speech') {
          setErrorType('unrecognized');
          setErrorMessage(
            language === 'te'
              ? 'అర్థం కాలేదు. దయచేసి మళ్ళీ చెప్పండి లేదా ఉదాహరణ నొక్కండి.'
              : "Didn't catch that. Please speak again or tap an example below."
          );
          setState('error');
        } else {
          setErrorType('unrecognized');
          setErrorMessage(
            msg ||
              (language === 'te'
                ? 'మాట సరిగ్గా వినపడలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.'
                : 'Could not catch that clearly. Please try again.')
          );
          setState('error');
        }
      },
    });
  };

  const stopListening = () => {
    const textToProcess = (transcript || UniversalVoiceInput.getCurrentTranscript()).trim();
    UniversalVoiceInput.stopListening();
    if (textToProcess) {
      setTranscript(textToProcess);
      processQuery(textToProcess);
    } else {
      setState('idle');
    }
  };

  const processQuery = async (queryText: string) => {
    const textToProcess = queryText.trim();
    if (!textToProcess) {
      setState('idle');
      return;
    }

    setState('processing');
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const extracted = await parseCustomerVoiceSearch(textToProcess, langParam);
      setIntent(extracted);

      setEditProduct(extracted.product);
      setEditQuantity(extracted.quantity);
      setEditUnit(extracted.unit || 'kg');
      setEditMaxPrice(extracted.maxPrice);

      setState('confirm');
    } catch (err) {
      console.error('Error parsing customer query:', err);
      setErrorType('network');
      setErrorMessage(
        language === 'te'
          ? 'వాయిస్ కనెక్ట్ కాలేదు. మళ్ళీ ప్రయత్నించండి.'
          : "Voice couldn't connect. Try again."
      );
      setState('error');
    }
  };

  const handleApply = () => {
    if (!intent) return;
    const finalIntent: CustomerVoiceSearchIntent = {
      ...intent,
      product: editProduct,
      quantity: editQuantity,
      unit: editUnit,
      maxPrice: editMaxPrice,
      interpretation: `${editProduct}${editQuantity ? ` · ${editQuantity} ${editUnit}` : ''}${
        editMaxPrice ? ` · Up to ₹${editMaxPrice}/${editUnit}` : ''
      }`,
      interpretationTelugu: `${editProduct}${editQuantity ? ` · ${editQuantity} ${editUnit}` : ''}${
        editMaxPrice ? ` · గరిష్ట ధర ₹${editMaxPrice}/${editUnit}` : ''
      }`,
    };

    onApplyIntent(finalIntent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-[#E2DDCF] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#1B3D27] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* ─── HEADER ─── */}
        <div className="bg-[#1B3D27] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-black tracking-tight leading-tight">
                {language === 'te' ? 'వాయిస్ శోధన' : 'Voice Search'}
              </h2>
              <p className="text-[12px] text-emerald-100 font-medium">
                {language === 'te' ? 'నోటితో చెప్పి పంటలను కనుగొనండి' : 'Speak naturally to find fresh produce'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── MODAL BODY ─── */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-[#FBF8F1]">
          {/* ═════════════════════════════════════════════════ */}
          {/* STATE 1: IDLE */}
          {/* ═════════════════════════════════════════════════ */}
          {state === 'idle' && (
            <div className="space-y-4 text-center">
              {/* Language pill */}
              <div className="inline-flex items-center gap-1 bg-[#E2DDCF]/50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setVoiceLang('te-IN')}
                  className={`px-3 py-1.5 min-h-[40px] rounded-lg text-[13px] font-black transition-all cursor-pointer ${
                    voiceLang === 'te-IN'
                      ? 'bg-[#1B3D27] text-white shadow-xs'
                      : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
                  }`}
                >
                  తెలుగు (Telugu)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLang('en-IN')}
                  className={`px-3 py-1.5 min-h-[40px] rounded-lg text-[13px] font-black transition-all cursor-pointer ${
                    voiceLang === 'en-IN'
                      ? 'bg-[#1B3D27] text-white shadow-xs'
                      : 'text-[#5B5B5B] hover:text-[#1A1A1A]'
                  }`}
                >
                  English
                </button>
              </div>

              {/* 88px Voice Mic Button */}
              <div className="py-2 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={startListening}
                  className="w-22 h-22 rounded-full bg-[#1B3D27] text-[#F5B800] hover:bg-[#14321D] active:scale-95 transition-all cursor-pointer shadow-lg border-4 border-[#F5B800] flex flex-col items-center justify-center group"
                >
                  <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
                </button>
                <div className="mt-3 space-y-0.5">
                  <p className="text-[17px] font-black text-[#1A1A1A]">
                    {language === 'te' ? 'నొక్కి మాట్లాడండి' : 'Tap to speak'}
                  </p>
                  <p className="text-[13px] text-[#5B5B5B]">
                    {language === 'te'
                      ? 'ఉదాహరణ: "తాజా టమాటాలు 40 రూపాయల లోపు"'
                      : 'E.g., "Fresh tomatoes under 40 rupees"'}
                  </p>
                </div>
              </div>

              {/* 3 Example Chips */}
              <div className="pt-2 text-left space-y-2">
                <span className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#F5B800]" />
                  <span>{language === 'te' ? 'ఉదాహరణలు (నొక్కండి):' : 'Sample searches (tap to try):'}</span>
                </span>

                <div className="space-y-1.5">
                  {[
                    {
                      te: 'తాజా టమాటాలు కావాలి',
                      en: 'Need fresh tomatoes',
                      desc: language === 'te' ? '🍅 తాజా టమాటాలు' : '🍅 Fresh tomatoes',
                    },
                    {
                      te: 'ఆర్గానిక్ పాలకూర',
                      en: 'Organic spinach',
                      desc: language === 'te' ? '🥬 ఆర్గానిక్ పాలకూర' : '🥬 Organic spinach',
                    },
                    {
                      te: 'టమాటాలు 40 లోపు',
                      en: 'Tomatoes under ₹40',
                      desc: language === 'te' ? '💰 టమాటాలు 40 లోపు' : '💰 Tomatoes under ₹40',
                    },
                  ].map((chip, idx) => {
                    const text = language === 'te' ? chip.te : chip.en;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTranscript(text);
                          processQuery(text);
                        }}
                        className="w-full p-3 bg-white hover:bg-[#E6F2EA] border border-[#E2DDCF] hover:border-[#1B3D27] rounded-xl text-left transition-all cursor-pointer flex items-center justify-between min-h-[48px]"
                      >
                        <div>
                          <p className="text-[14px] font-black text-[#1B3D27]">{chip.desc}</p>
                          <p className="text-[12px] text-[#5B5B5B] italic">"{text}"</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#1B3D27] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keyboard Fallback Toggle */}
              <div className="pt-2">
                {!showKeyboard ? (
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(true)}
                    className="text-[13px] font-bold text-[#1B3D27] hover:underline inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>{language === 'te' ? 'టైప్ చేసి శోధించండి' : 'Type instead'}</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder={language === 'te' ? 'ఉదా. టమాటాలు 2 కిలోలు...' : 'E.g. 2 kg tomatoes...'}
                      className="flex-1 px-3.5 min-h-[48px] bg-white border border-[#E2DDCF] rounded-xl text-[16px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualText.trim()) {
                          processQuery(manualText);
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      onClick={() => manualText.trim() && processQuery(manualText)}
                      disabled={!manualText.trim()}
                      className="min-h-[48px] px-4"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STATE 2: LISTENING */}
          {/* ═════════════════════════════════════════════════ */}
          {state === 'listening' && (
            <div className="py-4 space-y-5 text-center">
              {/* Pulsing mint ring + mic */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#1B3D27] text-white flex items-center justify-center ring-8 ring-[#1E7B3F]/30 animate-pulse shadow-xl">
                    <Mic className="w-10 h-10 text-[#F5B800] animate-bounce" />
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-[17px] font-black text-[#1B3D27]">
                    {language === 'te'
                      ? 'తెలుగులో వింటున్నాము...'
                      : 'Listening in Telugu / English...'}
                  </p>
                  <p className="text-[13px] text-[#5B5B5B]">
                    {language === 'te' ? 'స్పష్టంగా మాట్లాడండి' : 'Speak naturally now'}
                  </p>
                </div>
              </div>

              {/* 5-bar animated waveform bars */}
              <div className="flex items-center justify-center gap-1.5 h-8">
                <span className="w-2 bg-[#1B3D27] rounded-full voice-bar-1"></span>
                <span className="w-2 bg-[#1E7B3F] rounded-full voice-bar-2"></span>
                <span className="w-2 bg-[#F5B800] rounded-full voice-bar-3"></span>
                <span className="w-2 bg-[#1E7B3F] rounded-full voice-bar-4"></span>
                <span className="w-2 bg-[#1B3D27] rounded-full voice-bar-5"></span>
              </div>

              {/* Interim Live Heard Transcript */}
              <Card variant="mint" padding="md" className="min-h-[64px] flex items-center justify-center">
                <p className="text-[15px] font-bold text-[#1B3D27] italic">
                  {transcript ? `"${transcript}"` : language === 'te' ? 'మీ మాటల కోసం ఎదురుచూస్తున్నాం...' : 'Waiting for your speech...'}
                </p>
              </Card>

              {/* Done Speaking CTA */}
              <Button
                variant="primary"
                onClick={stopListening}
                className="w-full min-h-[52px] text-[16px] bg-red-700 hover:bg-red-800"
              >
                <MicOff className="w-5 h-5 mr-1.5" />
                <span>{language === 'te' ? 'పూర్తయింది (ఆపండి)' : 'Done Speaking'}</span>
              </Button>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STATE 3: PROCESSING */}
          {/* ═════════════════════════════════════════════════ */}
          {state === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#E2DDCF] border-t-[#1B3D27] animate-spin mx-auto"></div>
              <div className="space-y-1">
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'అర్థం చేసుకుంటున్నాము...' : 'Understanding...'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B]">
                  {language === 'te'
                    ? 'జెమినీ AI మీ శోధనను విశ్లేషిస్తోంది...'
                    : 'Gemini AI is parsing your produce request...'}
                </p>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STATE 4: CONFIRM & EDIT */}
          {/* ═════════════════════════════════════════════════ */}
          {(state === 'confirm' || state === 'edit') && intent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-black text-[#1A1A1A]">
                    {language === 'te' ? 'మేము గ్రహించిన వివరాలు:' : 'What We Understood:'}
                  </h3>
                  <p className="text-[13px] text-[#5B5B5B]">
                    {language === 'te' ? 'సరిచూసి నిర్ధారించండి' : 'Confirm or edit details before searching'}
                  </p>
                </div>
                <Badge variant="mint">AI Parsed</Badge>
              </div>

              {/* Parsed Summary Card */}
              <Card variant="mint" padding="md" className="space-y-3 bg-[#E6F2EA]">
                <div className="flex items-center justify-between text-[15px]">
                  <span className="font-bold text-[#5B5B5B]">{language === 'te' ? 'పంట:' : 'Produce:'}</span>
                  <span className="font-black text-[17px] text-[#1B3D27]">{editProduct}</span>
                </div>

                {editQuantity && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[#5B5B5B]">{language === 'te' ? 'పరిమాణం:' : 'Desired Qty:'}</span>
                    <span className="font-bold text-[#1A1A1A]">
                      {editQuantity} {editUnit}
                    </span>
                  </div>
                )}

                {editMaxPrice && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-[#5B5B5B]">{language === 'te' ? 'గరిష్ట ధర:' : 'Budget Limit:'}</span>
                    <span className="font-black text-[#1E7B3F]">
                      Up to ₹{editMaxPrice} / {editUnit}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#1B3D27]/15 text-center">
                  <p className="text-[13px] text-[#5B5B5B] italic">"{intent.rawQuery}"</p>
                </div>
              </Card>

              {/* Inline Edit Form when in 'edit' substate */}
              {state === 'edit' && (
                <div className="p-3.5 bg-white rounded-xl border border-[#E2DDCF] space-y-3">
                  <div>
                    <label className="text-[13px] font-bold text-[#1A1A1A] block mb-1">
                      {language === 'te' ? 'పంట పేరు' : 'Produce Name'}
                    </label>
                    <input
                      type="text"
                      value={editProduct}
                      onChange={(e) => setEditProduct(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] bg-white border border-[#E2DDCF] rounded-lg text-[16px] text-[#1A1A1A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[13px] font-bold text-[#1A1A1A] block mb-1">
                        {language === 'te' ? 'గరిష్ట ధర (₹)' : 'Max Price (₹)'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editMaxPrice || ''}
                        onChange={(e) => setEditMaxPrice(e.target.value ? Number(e.target.value) : null)}
                        placeholder="e.g. 40"
                        className="w-full px-3 py-2 min-h-[44px] bg-white border border-[#E2DDCF] rounded-lg text-[16px] text-[#1A1A1A]"
                      />
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-[#1A1A1A] block mb-1">
                        {language === 'te' ? 'పరిమాణం (కేజీ)' : 'Quantity (kg)'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editQuantity || ''}
                        onChange={(e) => setEditQuantity(e.target.value ? Number(e.target.value) : null)}
                        placeholder="e.g. 2"
                        className="w-full px-3 py-2 min-h-[44px] bg-white border border-[#E2DDCF] rounded-lg text-[16px] text-[#1A1A1A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  variant="primary"
                  onClick={handleApply}
                  className="w-full min-h-[52px] text-[16px] font-black"
                >
                  <Check className="w-5 h-5 mr-1.5" />
                  <span>{language === 'te' ? 'ఫలితాలు చూపించండి' : 'Show Marketplace Results'}</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setState(state === 'edit' ? 'confirm' : 'edit')}
                    className="min-h-[48px] text-[14px]"
                  >
                    <Edit3 className="w-4 h-4 mr-1.5" />
                    <span>{state === 'edit' ? (language === 'te' ? 'సవరణ పూర్తి' : 'Done Editing') : (language === 'te' ? 'సవరించు' : 'Edit')}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setState('idle');
                      startListening();
                    }}
                    className="min-h-[48px] text-[14px]"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    <span>{language === 'te' ? 'మళ్ళీ మాట్లాడండి' : 'Speak Again'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STATE 5: ERROR HANDLING */}
          {/* ═════════════════════════════════════════════════ */}
          {state === 'error' && (
            <div className="py-2 space-y-4">
              <Card variant="default" padding="md" className="space-y-2 bg-red-50 border-red-300">
                <div className="flex items-center gap-2 text-red-900 font-black text-[15px]">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>
                    {errorType === 'permission'
                      ? (language === 'te' ? 'మైక్రోఫోన్ అనుమతి అవసరం' : 'Microphone Permission Needed')
                      : errorType === 'network'
                      ? (language === 'te' ? 'కనెక్షన్ సమస్య' : 'Connection Error')
                      : (language === 'te' ? 'మాట స్పష్టంగా వినపడలేదు' : 'Speech Not Recognized')}
                  </span>
                </div>
                <p className="text-[14px] text-red-800 leading-relaxed">
                  {errorMessage ||
                    (language === 'te'
                      ? 'వాయిస్ కనెక్ట్ కాలేదు. మళ్ళీ ప్రయత్నించండి.'
                      : "Voice couldn't connect. Try again.")}
                </p>
              </Card>

              {/* Action Buttons based on error type */}
              <div className="space-y-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setState('idle');
                    startListening();
                  }}
                  className="w-full min-h-[52px] text-[16px]"
                >
                  <RotateCcw className="w-5 h-5 mr-1.5" />
                  <span>{language === 'te' ? 'మళ్ళీ ప్రయత్నించండి' : 'Try Again'}</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setState('idle');
                    setShowKeyboard(true);
                  }}
                  className="w-full min-h-[48px] text-[14px]"
                >
                  <Keyboard className="w-4 h-4 mr-1.5" />
                  <span>{language === 'te' ? 'టైప్ చేయడానికి మారండి' : 'Type Instead'}</span>
                </Button>
              </div>

              {/* Example suggestion chips when speech was unrecognized */}
              {errorType === 'unrecognized' && (
                <div className="pt-2 text-left space-y-2">
                  <span className="text-[13px] font-bold text-[#1A1A1A]">
                    {language === 'te' ? 'లేదా ఈ ఉదాహరణ నొక్కండి:' : 'Or tap a sample phrase:'}
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { te: 'తాజా టమాటాలు కావాలి', en: 'Need fresh tomatoes' },
                      { te: 'ఆర్గానిక్ పాలకూర', en: 'Organic spinach' },
                    ].map((s, i) => {
                      const txt = language === 'te' ? s.te : s.en;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setTranscript(txt);
                            processQuery(txt);
                          }}
                          className="w-full p-2.5 bg-white hover:bg-stone-50 border border-[#E2DDCF] rounded-xl text-left text-[14px] font-bold text-[#1B3D27] cursor-pointer"
                        >
                          "{txt}"
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
