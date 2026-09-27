import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Edit3,
  X,
  Volume2,
  Tag,
  IndianRupee,
  Scale,
  Search,
  Filter
} from 'lucide-react';
import { CustomerVoiceSearchIntent } from '../types';
import { parseCustomerVoiceSearch } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language, translations } from '../data/translations';

interface CustomerVoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyIntent: (intent: CustomerVoiceSearchIntent) => void;
  language: Language;
}

export const CustomerVoiceSearchModal: React.FC<CustomerVoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyIntent,
  language,
}) => {
  const t = translations[language];

  // States: 'input' -> 'processing' -> 'confirm' -> 'edit'
  const [step, setStep] = useState<'input' | 'processing' | 'confirm' | 'edit'>('input');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');

  // Interpreted Intent
  const [intent, setIntent] = useState<CustomerVoiceSearchIntent | null>(null);

  // Editable fields
  const [editProduct, setEditProduct] = useState('');
  const [editQuantity, setEditQuantity] = useState<number | null>(null);
  const [editUnit, setEditUnit] = useState('kg');
  const [editMaxPrice, setEditMaxPrice] = useState<number | null>(null);


  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setTranscript('');
      setManualText('');
      setIntent(null);
      setSpeechError(null);
      setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
    }
  }, [isOpen, language]);

  useEffect(() => {
    return () => {
      UniversalVoiceInput.stopListening();
    };
  }, []);

  const startListening = () => {
    setSpeechError(null);
    setIsListening(true);
    setTranscript('');

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1500,
      onInterim: (text) => {
        setTranscript(text);
      },
      onFinal: (text) => {
        setIsListening(false);
        setTranscript(text);
        processQuery(text);
      },
      onError: (code, msg) => {
        setIsListening(false);
        if (code === 'permission-denied') {
          setSpeechError(
            language === 'te'
              ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్ అడ్రస్ బార్‌లో మైక్ అనుమతి ఇవ్వండి.'
              : 'Microphone permission blocked. Please allow microphone access in your browser address bar.'
          );
        } else if (code === 'network') {
          setSpeechError(
            language === 'te'
              ? 'వాయిస్ నెట్‌వర్క్ సమస్య. దయచేసి ఇంటర్నెట్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.'
              : 'Speech service network error. Please check your internet connection.'
          );
        } else if (code !== 'no-speech') {
          setSpeechError(
            msg || (language === 'te'
              ? 'వాయిస్ గుర్తించలేకపోయాము. దయచేసి మళ్ళీ మాట్లాడండి లేదా శాంపిల్ నొక్కండి.'
              : 'Could not catch voice. Try again or tap a sample below.')
          );
        }
      },
    });
  };

  const stopListening = () => {
    UniversalVoiceInput.stopListening();
    setIsListening(false);
    if (transcript.trim()) {
      processQuery(transcript.trim());
    }
  };

  const processQuery = async (queryText: string) => {
    const textToProcess = queryText.trim();
    if (!textToProcess) return;

    setStep('processing');
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const extracted = await parseCustomerVoiceSearch(textToProcess, langParam);
      setIntent(extracted);

      setEditProduct(extracted.product);
      setEditQuantity(extracted.quantity);
      setEditUnit(extracted.unit || 'kg');
      setEditMaxPrice(extracted.maxPrice);

      setStep('confirm');
    } catch (err) {
      console.error('Error parsing customer query:', err);
      setStep('input');
      setSpeechError('Could not interpret voice request. Please try again.');
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
      interpretation: `${editProduct}${editQuantity ? ` · ${editQuantity} ${editUnit}` : ''}${editMaxPrice ? ` · Up to ₹${editMaxPrice}/${editUnit}` : ''}`,
      interpretationTelugu: `${editProduct}${editQuantity ? ` · ${editQuantity} ${editUnit}` : ''}${editMaxPrice ? ` · గరిష్ట ధర ₹${editMaxPrice}/${editUnit}` : ''}`,
    };

    onApplyIntent(finalIntent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {step === 'confirm' ? t.iUnderstood : t.voiceSearchModalTitle}
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                {language === 'te' ? 'కస్టమర్ వాయిస్ శోధన' : 'Search marketplace by speaking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* STEP 1: VOICE INPUT */}
          {step === 'input' && (
            <div className="space-y-4 text-center">
              <p className="text-xs sm:text-sm text-stone-600 font-medium max-w-sm mx-auto">
                {t.voiceSearchInstructions}
              </p>

              {/* Language toggle for voice */}
              <div className="inline-flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
                <span className="text-stone-500 font-medium px-2">Voice:</span>
                <button
                  type="button"
                  onClick={() => setVoiceLang('te-IN')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    voiceLang === 'te-IN'
                      ? 'bg-[#1e3a24] text-amber-300 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  తెలుగు (Telugu)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLang('en-IN')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    voiceLang === 'en-IN'
                      ? 'bg-[#1e3a24] text-amber-300 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  English
                </button>
              </div>

              {/* Big Mic Button */}
              <div className="flex flex-col items-center justify-center py-2">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                    isListening
                      ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse'
                      : 'bg-gradient-to-br from-emerald-700 to-[#1e3a24] text-amber-300 hover:scale-105'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {t.stopSpeaking}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-9 h-9 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {t.pressToSpeak}
                      </span>
                    </>
                  )}
                </button>

                {isListening && (
                  <p className="mt-3 text-xs text-red-600 font-semibold animate-pulse">
                    {t.listening}
                  </p>
                )}

                {transcript && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-stone-800 text-xs w-full">
                    <p className="font-semibold text-amber-800 mb-0.5">Heard:</p>
                    <p className="text-sm font-medium italic">“{transcript}”</p>
                    <button
                      onClick={() => processQuery(transcript)}
                      className="mt-2 px-4 py-1.5 bg-[#1e3a24] text-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Process Request</span>
                    </button>
                  </div>
                )}
              </div>

              {speechError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 text-left">
                  {speechError}
                </div>
              )}

              {/* Sample Preset Buttons for Demo */}
              <div className="pt-2 border-t border-stone-200 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'te' ? 'లేదా డెమో ఉదాహరణ నొక్కండి:' : 'Or tap a sample voice search:'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.searchSample1);
                      processQuery(t.searchSample1);
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🍅 Tomatoes &lt; ₹40/kg</p>
                    <p className="text-stone-500 line-clamp-1">{t.searchSample1}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.searchSample2);
                      processQuery(t.searchSample2);
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🍅 టమాటాలు 40 లోపు</p>
                    <p className="text-stone-500 line-clamp-1">{t.searchSample2}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.searchSample3);
                      processQuery(t.searchSample3);
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🌾 5 kg Sona Masoori</p>
                    <p className="text-stone-500 line-clamp-1">{t.searchSample3}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.searchSample4);
                      processQuery(t.searchSample4);
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🥛 2L Pure Cow Milk</p>
                    <p className="text-stone-500 line-clamp-1">{t.searchSample4}</p>
                  </button>
                </div>
              </div>

              {/* Text fallback */}
              <div className="pt-2 border-t border-stone-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="E.g. 2 kg tomatoes under 40 rupees..."
                    className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg text-stone-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualText.trim()) {
                        processQuery(manualText);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => manualText.trim() && processQuery(manualText)}
                    disabled={!manualText.trim()}
                    className="px-4 py-2 bg-[#1e3a24] text-amber-300 text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-800 animate-spin mx-auto"></div>
              <h3 className="text-sm font-bold text-stone-900">
                {language === 'te' ? 'జెమినీ AI మీ మాటలను అర్థం చేసుకుంటోంది...' : 'Gemini AI is interpreting your search...'}
              </h3>
              <p className="text-xs text-stone-500">
                Extracting target produce, quantity, and price budget...
              </p>
            </div>
          )}

          {/* STEP 3: CONFIRM INTERPRETATION */}
          {(step === 'confirm' || step === 'edit') && intent && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <span>{t.iUnderstood}</span>
                  <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded font-semibold">
                    AI Parsed
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Produce:</span>
                    <span className="text-base font-extrabold text-stone-900">
                      {editProduct}
                    </span>
                  </div>

                  {editQuantity && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Desired Quantity:</span>
                      <span className="font-bold text-stone-800">
                        {editQuantity} {editUnit}
                      </span>
                    </div>
                  )}

                  {editMaxPrice && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Budget Limit:</span>
                      <span className="font-extrabold text-emerald-950">
                        Up to ₹{editMaxPrice} / {editUnit}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-600 italic text-center">
                  “{intent.rawQuery}”
                </p>
              </div>

              {/* Edit form */}
              {step === 'edit' && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                      Produce Name
                    </label>
                    <input
                      type="text"
                      value={editProduct}
                      onChange={(e) => setEditProduct(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Max Price (₹)
                      </label>
                      <input
                        type="number"
                        value={editMaxPrice || ''}
                        onChange={(e) => setEditMaxPrice(e.target.value ? Number(e.target.value) : null)}
                        placeholder="e.g. 40"
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        Quantity ({editUnit})
                      </label>
                      <input
                        type="number"
                        value={editQuantity || ''}
                        onChange={(e) => setEditQuantity(e.target.value ? Number(e.target.value) : null)}
                        placeholder="e.g. 2"
                        className="w-full px-2.5 py-1.5 border border-stone-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.speakAgain}</span>
                </button>

                {step === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => setStep('edit')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.editSearch}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep('confirm')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                  >
                    Done Editing
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApply}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t.showResults}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
