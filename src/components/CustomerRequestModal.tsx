import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  Calendar,
  MapPin,
  Scale,
  Send,
  RotateCcw
} from 'lucide-react';
import { CustomerRequest } from '../types';
import { parseCustomerRequestVoice } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { DEMO_CUSTOMER } from '../data/mockData';
import { Language, translations } from '../data/translations';

interface CustomerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostRequest: (request: CustomerRequest) => void;
  language: Language;
}

export const CustomerRequestModal: React.FC<CustomerRequestModalProps> = ({
  isOpen,
  onClose,
  onPostRequest,
  language,
}) => {
  const t = translations[language];

  const [step, setStep] = useState<'input' | 'processing' | 'confirm'>('input');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');

  // Extracted fields
  const [product, setProduct] = useState('Country Tomatoes');
  const [productTelugu, setProductTelugu] = useState('నాటు టమాటాలు');
  const [quantity, setQuantity] = useState(5);
  const [unit, setUnit] = useState('kg');
  const [neededBy, setNeededBy] = useState('Tomorrow morning');
  const [location, setLocation] = useState('Visakhapatnam');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setTranscript('');
      setManualText('');
      setIsListening(false);
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
        processRequest(text);
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
    if (transcript.trim()) {
      processRequest(transcript.trim());
    }
  };

  const processRequest = async (text: string) => {
    const q = text.trim();
    if (!q) return;

    setStep('processing');
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const extracted = await parseCustomerRequestVoice(q, langParam);

      setProduct(extracted.product);
      setProductTelugu(extracted.productTelugu);
      setQuantity(extracted.quantity || 5);
      setUnit(extracted.unit || 'kg');
      setNeededBy(extracted.neededBy || 'Tomorrow');
      setLocation(extracted.location || 'Visakhapatnam');

      setStep('confirm');
    } catch (e) {
      console.error(e);
      setStep('input');
    }
  };

  const handlePost = () => {
    const newReq: CustomerRequest = {
      id: `req-${Date.now()}`,
      customerId: DEMO_CUSTOMER.id,
      customerName: DEMO_CUSTOMER.name,
      product,
      productTelugu,
      quantity,
      unit,
      neededBy,
      location,
      status: 'OPEN',
      createdAt: 'Just now',
    };

    onPostRequest(newReq);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">{t.requestProductTitle}</h2>
              <p className="text-xs text-emerald-200 font-medium">
                {language === 'te' ? 'స్థానిక రైతులకు నేరుగా ఆర్డర్ రిక్వెస్ట్ పంపండి' : 'Broadcast harvest demand to local farmers'}
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
          
          {step === 'input' && (
            <div className="space-y-4 text-center">
              <p className="text-xs sm:text-sm text-stone-600 font-medium max-w-sm mx-auto">
                {t.requestProductSub}
              </p>

              {/* Language toggle */}
              <div className="inline-flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
                <span className="text-stone-500 font-medium px-2">Language:</span>
                <button
                  type="button"
                  onClick={() => setVoiceLang('te-IN')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    voiceLang === 'te-IN' ? 'bg-[#1e3a24] text-amber-300' : 'text-stone-600'
                  }`}
                >
                  తెలుగు
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLang('en-IN')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    voiceLang === 'en-IN' ? 'bg-[#1e3a24] text-amber-300' : 'text-stone-600'
                  }`}
                >
                  English
                </button>
              </div>

              {/* Push mic */}
              <div className="flex flex-col items-center justify-center py-2">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                    isListening
                      ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse'
                      : 'bg-gradient-to-br from-emerald-700 to-[#1e3a24] text-amber-300 hover:scale-105'
                  }`}
                >
                  {isListening ? <MicOff className="w-8 h-8 mb-1" /> : <Mic className="w-8 h-8 mb-1" />}
                  <span className="text-[10px] font-bold uppercase">
                    {isListening ? t.stopSpeaking : t.pressToSpeak}
                  </span>
                </button>

                {transcript && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-stone-800 text-xs w-full">
                    <p className="font-semibold text-amber-800 mb-0.5">Heard:</p>
                    <p className="text-sm font-medium italic">“{transcript}”</p>
                    <button
                      onClick={() => processRequest(transcript)}
                      className="mt-2 px-4 py-1.5 bg-[#1e3a24] text-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract Request</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sample presets */}
              <div className="pt-2 border-t border-stone-200 text-left space-y-2">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Volume2 className="w-4 h-4 text-emerald-800" />
                  <span>Tap a sample request to test:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('I need 5 kg of tomatoes tomorrow.');
                      processRequest('I need 5 kg of tomatoes tomorrow.');
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🍅 5 kg Tomatoes Tomorrow</p>
                    <p className="text-stone-500">“I need 5 kg of tomatoes tomorrow.”</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('నాకు రేపు 5 కిలోల టమాటాలు కావాలి.');
                      processRequest('నాకు రేపు 5 కిలోల టమాటాలు కావాలి.');
                    }}
                    className="p-2 bg-stone-50 hover:bg-emerald-50 border border-stone-200 rounded-xl text-left cursor-pointer"
                  >
                    <p className="font-bold text-emerald-950">🍅 రేపు 5 కిలోల టమాటాలు (Telugu)</p>
                    <p className="text-stone-500">“నాకు రేపు 5 కిలోల టమాటాలు కావాలి.”</p>
                  </button>
                </div>
              </div>

              {/* Text fallback */}
              <div className="pt-2 border-t border-stone-200 flex gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type: e.g. 5 kg tomatoes needed tomorrow..."
                  className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg text-stone-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualText.trim()) {
                      processRequest(manualText);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => manualText.trim() && processRequest(manualText)}
                  disabled={!manualText.trim()}
                  className="px-4 py-2 bg-[#1e3a24] text-amber-300 text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Extract
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-800 animate-spin mx-auto"></div>
              <h3 className="text-sm font-bold text-stone-900">Understanding local demand request...</h3>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
                  <span>CUSTOMER REQUEST PREVIEW</span>
                  <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded font-semibold">
                    Local Demand
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Produce:</span>
                    <span className="text-base font-extrabold text-stone-900">{product}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Required Quantity:</span>
                    <span className="font-bold text-stone-800">{quantity} {unit}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Needed By:</span>
                    <span className="font-bold text-emerald-900">{neededBy}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Area:</span>
                    <span className="font-medium text-stone-700">{location}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Speak Again
                </button>
                <button
                  type="button"
                  onClick={handlePost}
                  className="px-6 py-2.5 bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t.postRequestBtn}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
