import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  X,
  ShieldCheck,
  Tag,
  Scale,
  IndianRupee,
  Leaf,
  Volume2,
  Camera,
  Upload
} from 'lucide-react';
import { Product, VoiceExtractionResult, ProductCategory } from '../types';
import { parseVoiceProductInput, analyzeProductDescription } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language, translations } from '../data/translations';

interface VoiceProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  language: Language;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  farmerRating: number;
  farmerAvatar: string;
  farmerVerified?: boolean;
}

// Representative high-res produce images
const PRODUCE_IMAGE_MAP: Record<string, string> = {
  tomatoes: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
  mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
  chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
  okra: 'https://images.unsplash.com/photo-1628773822503-930a84d9f0f9?auto=format&fit=crop&w=600&q=80',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80',
  grains: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
  dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  organic: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
};

function getProduceImage(name: string, category: string): string {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(PRODUCE_IMAGE_MAP)) {
    if (lower.includes(key)) return url;
  }
  const catKey = category.toLowerCase();
  return PRODUCE_IMAGE_MAP[catKey] || PRODUCE_IMAGE_MAP.vegetables;
}

export const VoiceProductModal: React.FC<VoiceProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  language,
  farmerId,
  farmerName,
  farmerLocation,
  farmerRating,
  farmerAvatar,
  farmerVerified = true,
}) => {
  const t = translations[language];

  // Steps: 'input' -> 'processing' -> 'preview' -> 'manual-edit'
  const [step, setStep] = useState<'input' | 'processing' | 'preview' | 'manual-edit'>('input');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');

  // Custom photo upload state
  const [customImage, setCustomImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Extracted Result
  const [extracted, setExtracted] = useState<VoiceExtractionResult | null>(null);

  // Editable Form fields for manual review
  const [editName, setEditName] = useState('');
  const [editTeluguName, setEditTeluguName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('Vegetables');
  const [editQuantity, setEditQuantity] = useState<number>(10);
  const [editUnit, setEditUnit] = useState('kg');
  const [editPrice, setEditPrice] = useState<number>(30);
  const [editPriceUnit, setEditPriceUnit] = useState('kg');
  const [editDescription, setEditDescription] = useState('');
  const [editOrganic, setEditOrganic] = useState(false);
  const [trustScreeningNote, setTrustScreeningNote] = useState('');
  const [trustStatus, setTrustStatus] = useState<
    'verified' | 'review_recommended' | 'standard' | 'potentially_exaggerated'
  >('verified');

  // Sync language selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setTranscript('');
      setManualText('');
      setExtracted(null);
      setSpeechError(null);
      setCustomImage(null);
      setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
    }
  }, [isOpen, language]);

  // Clean up recognition
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
        processUtterance(text);
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
              ? 'వాయిస్ గుర్తించలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా శాంపిల్ నొక్కండి.'
              : 'Could not catch voice. Try again or tap a sample preset.')
          );
        }
      },
    });
  };

  const stopListening = () => {
    UniversalVoiceInput.stopListening();
    setIsListening(false);
    if (transcript.trim()) {
      processUtterance(transcript.trim());
    }
  };

  const processUtterance = async (inputText: string) => {
    const textToProcess = inputText.trim();
    if (!textToProcess) return;

    setStep('processing');
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const result = await parseVoiceProductInput(textToProcess, langParam);
      setExtracted(result);

      // Populate editable fields
      setEditName(result.productName);
      setEditTeluguName(result.productNameTelugu || result.productName);
      setEditCategory(result.category);
      setEditQuantity(result.quantity || 10);
      setEditUnit(result.unit || 'kg');
      setEditPrice(result.price || 30);
      setEditPriceUnit(result.priceUnit || 'kg');
      setEditDescription(result.description);
      setEditOrganic(result.organicClaim);
      setTrustScreeningNote(result.trustScreening.note);
      setTrustStatus(
        result.trustScreening.status === 'flagged' ? 'review_recommended' : 'verified'
      );

      setStep('preview');
    } catch (err) {
      console.error('Error extracting product info:', err);
      setStep('input');
      setSpeechError('Failed to process harvest information. Please try again.');
    }
  };

  const handleConfirmListing = () => {
    if (!editName.trim()) {
      setSpeechError(language === 'te' ? 'దయచేసి పంట పేరు నమోదు చేయండి' : 'Please provide product name');
      setStep('manual-edit');
      return;
    }
    if (isNaN(Number(editPrice)) || Number(editPrice) <= 0 || Number(editPrice) > 50000) {
      setSpeechError(language === 'te' ? 'సరైన ధరను నమోదు చేయండి (₹1 - ₹50,000)' : 'Please enter a valid price (₹1 - ₹50,000)');
      setStep('manual-edit');
      return;
    }
    if (isNaN(Number(editQuantity)) || Number(editQuantity) <= 0 || Number(editQuantity) > 10000) {
      setSpeechError(language === 'te' ? 'సరైన పంట నిల్వ పరిమాణం నమోదు చేయండి' : 'Please enter a valid quantity (1 - 10,000)');
      setStep('manual-edit');
      return;
    }

    const finalImage = customImage || getProduceImage(editName, editCategory);

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      farmerId,
      farmerName,
      farmerLocation,
      farmerRating,
      farmerAvatar,
      farmerVerified: Boolean(farmerVerified),
      name: editName,
      teluguName: editTeluguName || editName,
      category: editCategory,
      price: Number(editPrice),
      unit: editUnit,
      priceUnit: editPriceUnit,
      availableQuantity: Number(editQuantity),
      image: finalImage,
      description: editDescription,
      harvestDate: language === 'te' ? 'ఈ రోజే కోసినది' : 'Freshly harvested today',
      organicClaim: editOrganic,
      organicDetails: editOrganic ? 'Zero synthetic chemicals · Direct from field' : undefined,
      trustStatus,
      trustNote: trustScreeningNote || 'Farmer verified · Fresh harvest',
      createdAt: Date.now(),
    };

    onProductCreated(newProduct);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header Bar */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight">
                {step === 'preview' ? t.productPreviewTitle : t.voiceModalTitle}
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                {language === 'te' ? 'రైతు సులభ వాయిస్ అసిస్టెంట్' : 'AI-assisted voice listing for farmers'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body based on current step */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* STEP 1: VOICE / TEXT INPUT */}
          {step === 'input' && (
            <div className="space-y-5">
              <div className="text-center py-2">
                <p className="text-sm sm:text-base text-stone-700 font-medium">
                  {t.voiceInstructions}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
                  <span className="text-stone-500 font-medium px-2">
                    {language === 'te' ? 'వాయిస్ భాష:' : 'Speaking language:'}
                  </span>
                  <button
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
              </div>

              {/* Big Microphone Push Button */}
              <div className="flex flex-col items-center justify-center my-3">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                    isListening
                      ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse'
                      : 'bg-gradient-to-br from-emerald-600 to-[#1e3a24] text-amber-300 hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-10 h-10 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {t.stopSpeaking}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-11 h-11 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {t.pressToSpeak}
                      </span>
                    </>
                  )}
                </button>

                {isListening && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-red-600 font-semibold animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    {t.listening}
                  </div>
                )}

                {/* Live Transcript Display */}
                {transcript && (
                  <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-stone-800 text-sm w-full text-center font-medium">
                    <p className="text-xs text-amber-700 font-semibold mb-1">
                      {language === 'te' ? 'మీరు చెప్పినది:' : 'You said:'}
                    </p>
                    <p className="text-base italic">“{transcript}”</p>
                    <button
                      onClick={() => processUtterance(transcript)}
                      className="mt-3 px-4 py-2 bg-[#1e3a24] hover:bg-emerald-900 text-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {t.extractDetails}
                    </button>
                  </div>
                )}
              </div>

              {speechError && (
                <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{speechError}</span>
                </div>
              )}

              {/* Sample Voice Presets for Instant 1-Click Demo Evaluation */}
              <div className="pt-2 border-t border-stone-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                  <span>{t.trySampleVoice}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.sample1);
                      processUtterance(t.sample1);
                    }}
                    className="p-2.5 text-left text-xs bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-emerald-950 flex items-center gap-1 mb-0.5">
                      🍅 {language === 'te' ? 'నాటు టమాటాలు (10 కిలోలు)' : 'Tomatoes (10 kg @ ₹30)'}
                    </div>
                    <p className="text-stone-600 line-clamp-2">{t.sample1}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.sample2);
                      processUtterance(t.sample2);
                    }}
                    className="p-2.5 text-left text-xs bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-emerald-950 flex items-center gap-1 mb-0.5">
                      🌾 {language === 'te' ? 'సోనా మసూరి బియ్యం (25 కిలోలు)' : 'Sona Masoori Rice (25 kg)'}
                    </div>
                    <p className="text-stone-600 line-clamp-2">{t.sample2}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.sample3);
                      processUtterance(t.sample3);
                    }}
                    className="p-2.5 text-left text-xs bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-emerald-950 flex items-center gap-1 mb-0.5">
                      🥭 {language === 'te' ? 'బంగనపల్లి మామిడి (20 కిలోలు)' : 'Mangoes (20 kg @ ₹90)'}
                    </div>
                    <p className="text-stone-600 line-clamp-2">{t.sample3}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(t.sample4);
                      processUtterance(t.sample4);
                    }}
                    className="p-2.5 text-left text-xs bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-emerald-950 flex items-center gap-1 mb-0.5">
                      🥛 {language === 'te' ? 'ఆవు పాలు (50 లీటర్లు)' : 'Cow Milk (50 Liters @ ₹60)'}
                    </div>
                    <p className="text-stone-600 line-clamp-2">{t.sample4}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const testClaim = language === 'te'
                        ? 'నా దగ్గర 15 కిలోల 100% సేంద్రీయ టమాటాలు ఉన్నాయి, అనేక రోగాలను నయం చేస్తాయి, కిలో 40 రూపాయలు.'
                        : 'I have 15 kg of 100% organic tomatoes that cure many diseases, 40 rupees per kg.';
                      setTranscript(testClaim);
                      processUtterance(testClaim);
                    }}
                    className="p-2.5 text-left text-xs bg-amber-50 hover:bg-amber-100/90 border border-amber-300 rounded-xl transition-colors cursor-pointer sm:col-span-2"
                  >
                    <div className="font-semibold text-amber-950 flex items-center gap-1 mb-0.5">
                      ⚠️ {language === 'te' ? 'క్లెయిమ్ టెస్ట్: 100% ఆర్గానిక్ & రోగాల నివారణ (AI స్క్రీనింగ్)' : 'Test AI Trust Screening: "100% organic & cures diseases"'}
                    </div>
                    <p className="text-amber-800 line-clamp-1">
                      {language === 'te' ? '“100% సేంద్రీయ టమాటాలు, అనేక రోగాలను నయం చేస్తాయి...”' : '“100% organic tomatoes that cure many diseases, 40 rupees/kg”'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Text Fallback */}
              <div className="pt-2 border-t border-stone-200">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  {t.manualInputFallback}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={t.typePlaceholder}
                    className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualText.trim()) {
                        processUtterance(manualText);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => manualText.trim() && processUtterance(manualText)}
                    disabled={!manualText.trim()}
                    className="px-4 py-2 bg-[#1e3a24] text-amber-300 text-xs font-bold rounded-lg hover:bg-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {t.extractDetails}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING ANIMATION */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">{t.analyzingSpeech}</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {language === 'te'
                    ? 'ఉత్పత్తి పేరు, పరిమాణం, కిలో ధర మరియు సేంద్రీయ స్థితిని నిర్ధారిస్తున్నాము...'
                    : 'Extracting product name, quantity, unit price, and trust claims...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: PRODUCT PREVIEW & CONFIRMATION */}
          {(step === 'preview' || step === 'manual-edit') && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 font-medium flex items-center justify-between">
                <span>{t.previewSubtext}</span>
                <span className="text-[11px] px-2 py-0.5 bg-emerald-600 text-white rounded font-bold">
                  {language === 'te' ? 'AI పరిశీలన పూర్తయింది' : 'AI Extracted'}
                </span>
              </div>

              {/* Product Preview Card */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs bg-stone-50/50">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-40 h-36 sm:h-auto relative bg-stone-200">
                    <img
                      src={customImage || getProduceImage(editName, editCategory)}
                      alt={editName}
                      className="w-full h-full object-cover"
                    />
                    {editOrganic && (
                      <div className="absolute top-2 left-2 bg-emerald-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Leaf className="w-3 h-3" />
                        <span>{t.organicClaimBadge}</span>
                      </div>
                    )}
                    <label className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md transition-colors">
                      <Camera className="w-3 h-3 text-amber-300" />
                      <span>{customImage ? (language === 'te' ? 'మార్చు' : 'Change') : (language === 'te' ? 'ఫోటో తీయి' : 'Add Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  <div className="p-4 flex-1 space-y-2.5">
                    <div>
                      <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                        {editCategory}
                      </div>
                      <h3 className="text-lg font-bold text-stone-900">
                        {editName}
                      </h3>
                      {editTeluguName && editTeluguName !== editName && (
                        <p className="text-xs text-stone-500 font-medium">
                          {editTeluguName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200/70">
                      <div>
                        <span className="text-[11px] text-stone-500 block">{t.quantityAvailable}</span>
                        <span className="text-sm font-bold text-stone-800">
                          {editQuantity} {editUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-stone-500 block">{t.pricePerUnit}</span>
                        <span className="text-base font-extrabold text-emerald-900">
                          ₹{editPrice} / {editPriceUnit}
                        </span>
                      </div>
                    </div>

                    {editDescription && (
                      <p className="text-xs text-stone-600 line-clamp-2">
                        {editDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trust Screening Notice (Feature 4) */}
                <div className={`border-t p-3 text-xs space-y-2 ${
                  trustStatus === 'review_recommended'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : trustStatus === 'potentially_exaggerated'
                    ? 'bg-red-50/90 border-red-200 text-red-950'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      {trustStatus === 'verified' || trustStatus === 'standard' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                      )}
                      <span>AI TRUST SCREENING</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      trustStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-900'
                        : trustStatus === 'potentially_exaggerated'
                        ? 'bg-red-200 text-red-950'
                        : 'bg-amber-200 text-amber-950'
                    }`}>
                      {trustStatus === 'verified'
                        ? 'NORMAL CLAIM'
                        : trustStatus === 'potentially_exaggerated'
                        ? 'POTENTIALLY EXAGGERATED'
                        : 'REVIEW RECOMMENDED'}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed">
                    {trustScreeningNote || 'This description contains claims that will be labeled transparently as Farmer-Declared.'}
                  </p>

                  {(trustStatus === 'review_recommended' || trustStatus === 'potentially_exaggerated') && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setStep('manual-edit')}
                        className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-800 text-[11px] font-bold rounded border border-amber-300 cursor-pointer"
                      >
                        [Edit Description]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTrustScreeningNote('Recorded as unverified farmer-declared statement.');
                        }}
                        className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 text-[11px] font-bold rounded cursor-pointer"
                      >
                        [Keep as Farmer Claim]
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Edit Drawer / Form if farmer wants to adjust */}
              {step === 'manual-edit' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    {language === 'te' ? 'వివరాలను సవరించండి' : 'Edit Listing Details'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        {t.productName}
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        {t.category}
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as ProductCategory)}
                        className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white"
                      >
                        <option value="Vegetables">Vegetables (కూరగాయలు)</option>
                        <option value="Fruits">Fruits (పండ్లు)</option>
                        <option value="Grains">Grains (ధాన్యాలు)</option>
                        <option value="Dairy">Dairy (పాడి)</option>
                        <option value="Organic">Organic (సేంద్రీయ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        {t.quantityAvailable} ({editUnit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        {t.price} (₹ / {editPriceUnit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editOrganicClaim"
                      checked={editOrganic}
                      onChange={(e) => setEditOrganic(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="editOrganicClaim" className="text-xs font-medium text-stone-700 cursor-pointer">
                      {t.isOrganic}
                    </label>
                  </div>

                  <div className="pt-2 border-t border-stone-200">
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      {language === 'te' ? 'పంట ఫోటో (కెమెరా లేదా గ్యాలరీ)' : 'Produce Photo (Camera or Upload)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 bg-white border border-stone-300 hover:border-emerald-700 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                        <Camera className="w-4 h-4 text-emerald-800" />
                        <span>{language === 'te' ? 'ఫోటో తీయండి / అప్‌లోడ్' : 'Take Photo / Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {customImage && (
                        <button
                          type="button"
                          onClick={() => setCustomImage(null)}
                          className="px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl font-semibold cursor-pointer"
                        >
                          {language === 'te' ? 'డిఫాల్ట్ ఫోటో' : 'Reset to Default'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Never publish without farmer confirmation! */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t.speakAgain}
                </button>

                {step === 'preview' ? (
                  <button
                    type="button"
                    onClick={() => setStep('manual-edit')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {t.editDetails}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    {language === 'te' ? 'సమీక్షించండి' : 'Done Editing'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmListing}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t.confirmListing}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
