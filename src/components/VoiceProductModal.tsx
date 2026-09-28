import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Camera,
  Upload,
  ShieldCheck,
  Check,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Product, ProductCategory, VoiceExtractionResult } from '../types';
import { parseVoiceProductInput } from '../services/aiService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language } from '../data/translations';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { StepIndicator, StepItem } from './ui/StepIndicator';
import { MANDI_PRICES_TODAY } from '../data/mandiPrices';

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

interface CropPreset {
  id: string;
  name: string;
  teluguName: string;
  category: ProductCategory;
  unit: string;
  defaultPrice: number;
  image: string;
}

const CROP_PRESETS: CropPreset[] = [
  {
    id: 'tomatoes',
    name: 'Country Tomatoes',
    teluguName: 'నాటు టమాటాలు',
    category: 'Vegetables',
    unit: 'kg',
    defaultPrice: 30,
    image: '/products/tomatoes.svg',
  },
  {
    id: 'rice',
    name: 'Sona Masoori Rice',
    teluguName: 'సోనా మసూరి బియ్యం',
    category: 'Grains',
    unit: 'kg',
    defaultPrice: 55,
    image: '/products/rice.svg',
  },
  {
    id: 'mangoes',
    name: 'Banganapalli Mangoes',
    teluguName: 'బంగనపల్లి మామిడి',
    category: 'Fruits',
    unit: 'kg',
    defaultPrice: 90,
    image: '/products/mangoes.svg',
  },
  {
    id: 'milk',
    name: 'Pure Desi Cow Milk',
    teluguName: 'స్వచ్ఛమైన ఆవు పాలు',
    category: 'Dairy',
    unit: 'liters',
    defaultPrice: 60,
    image: '/products/milk.svg',
  },
  {
    id: 'onions',
    name: 'Red Onions',
    teluguName: 'నాటు ఉల్లిపాయలు',
    category: 'Vegetables',
    unit: 'kg',
    defaultPrice: 28,
    image: '/products/onions.svg',
  },
  {
    id: 'chillies',
    name: 'Red Chillies',
    teluguName: 'గుంటూరు ఎండుమిరప',
    category: 'Organic',
    unit: 'kg',
    defaultPrice: 180,
    image: '/products/chillies.svg',
  },
  {
    id: 'okra',
    name: 'Fresh Okra',
    teluguName: 'తాజా బెండకాయలు',
    category: 'Vegetables',
    unit: 'kg',
    defaultPrice: 40,
    image: '/products/okra.svg',
  },
  {
    id: 'ghee',
    name: 'Desi Cow Ghee',
    teluguName: 'స్వచ్ఛమైన ఆవు నెయ్యి',
    category: 'Dairy',
    unit: 'liters',
    defaultPrice: 850,
    image: '/products/ghee.svg',
  },
];

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
  // Wizard Step: 1 (Crop) -> 2 (Quantity) -> 3 (Price & Trust) -> 4 (Photo & Review)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Listing Data
  const [selectedCropId, setSelectedCropId] = useState<string>('tomatoes');
  const [cropName, setCropName] = useState<string>('Country Tomatoes');
  const [cropTeluguName, setCropTeluguName] = useState<string>('నాటు టమాటాలు');
  const [category, setCategory] = useState<ProductCategory>('Vegetables');
  const [quantity, setQuantity] = useState<number>(20);
  const [unit, setUnit] = useState<string>('kg');
  const [price, setPrice] = useState<number>(30);
  const [organicClaim, setOrganicClaim] = useState<boolean>(false);
  const [customImage, setCustomImage] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceLang, setVoiceLang] = useState<'te-IN' | 'en-IN'>(language === 'te' ? 'te-IN' : 'en-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isParsingVoice, setIsParsingVoice] = useState<boolean>(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedCropId('tomatoes');
      setCropName('Country Tomatoes');
      setCropTeluguName('నాటు టమాటాలు');
      setCategory('Vegetables');
      setQuantity(20);
      setUnit('kg');
      setPrice(30);
      setOrganicClaim(false);
      setCustomImage(null);
      setVoiceTranscript('');
      setSpeechError(null);
      setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
    }
  }, [isOpen, language]);

  // Clean up voice on unmount
  useEffect(() => {
    return () => {
      UniversalVoiceInput.stopListening();
    };
  }, []);

  if (!isOpen) return null;

  // Selected crop details
  const currentPreset = CROP_PRESETS.find((c) => c.id === selectedCropId);
  const activeImage = customImage || currentPreset?.image || '/products/tomatoes.svg';

  // Find mandi benchmark
  const mandiRef = MANDI_PRICES_TODAY.find(
    (m) => m.cropName.toLowerCase().includes(cropName.toLowerCase()) ||
           cropName.toLowerCase().includes(m.cropName.toLowerCase())
  );

  // Select crop preset
  const handleSelectCrop = (preset: CropPreset) => {
    setSelectedCropId(preset.id);
    setCropName(preset.name);
    setCropTeluguName(preset.teluguName);
    setCategory(preset.category);
    setUnit(preset.unit);
    setPrice(preset.defaultPrice);
  };

  // Voice listening
  const startListening = () => {
    setSpeechError(null);
    setIsListening(true);
    setVoiceTranscript('');

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1500,
      onInterim: (text) => setVoiceTranscript(text),
      onFinal: (text) => {
        setIsListening(false);
        setVoiceTranscript(text);
        handleProcessVoice(text);
      },
      onError: (code, msg) => {
        setIsListening(false);
        if (code === 'permission-denied') {
          setSpeechError(
            language === 'te'
              ? 'మైక్రోఫోన్ అనుమతి అవసరం. దయచేసి అనుమతించండి.'
              : 'Microphone permission blocked. Please allow microphone access.'
          );
        } else {
          setSpeechError(msg || (language === 'te' ? 'వాయిస్ గుర్తించలేకపోయాము' : 'Could not hear voice clearly'));
        }
      },
    });
  };

  const stopListening = () => {
    UniversalVoiceInput.stopListening();
    setIsListening(false);
    if (voiceTranscript.trim()) {
      handleProcessVoice(voiceTranscript.trim());
    }
  };

  const handleProcessVoice = async (text: string) => {
    if (!text.trim()) return;
    setIsParsingVoice(true);
    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const extracted: VoiceExtractionResult = await parseVoiceProductInput(text, langParam);

      if (extracted.productName) {
        setCropName(extracted.productName);
        setCropTeluguName(extracted.productNameTelugu || extracted.productName);
      }
      if (extracted.category) setCategory(extracted.category);
      if (extracted.quantity) setQuantity(extracted.quantity);
      if (extracted.unit) setUnit(extracted.unit);
      if (extracted.price) setPrice(extracted.price);
      if (extracted.organicClaim !== undefined) setOrganicClaim(extracted.organicClaim);

      // Match preset for image
      const matched = CROP_PRESETS.find(
        (c) =>
          extracted.productName.toLowerCase().includes(c.id) ||
          c.name.toLowerCase().includes(extracted.productName.toLowerCase())
      );
      if (matched) {
        setSelectedCropId(matched.id);
      }

      // Jump straight to photo/review step
      setCurrentStep(4);
    } catch (e) {
      console.warn('Voice parse fallback error:', e);
    } finally {
      setIsParsingVoice(false);
    }
  };

  // Image Upload
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

  // Publish Listing
  const handlePublish = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      farmerId,
      farmerName,
      farmerLocation,
      farmerRating,
      farmerAvatar,
      farmerVerified: Boolean(farmerVerified),
      name: cropName,
      teluguName: cropTeluguName,
      category,
      price,
      unit,
      priceUnit: unit,
      availableQuantity: quantity,
      image: activeImage,
      description: `Freshly harvested ${cropName} directly from ${farmerName}'s farm in ${farmerLocation}.`,
      descriptionTelugu: `${farmerName} గారి పొలం నుంచి నేరుగా తాజా ${cropTeluguName}.`,
      harvestDate: 'Today',
      organicClaim,
      organicDetails: organicClaim ? 'Grown with natural cow-dung manure, neem oil, zero chemical sprays.' : undefined,
      trustStatus: organicClaim ? 'verified' : 'standard',
      trustNote: organicClaim
        ? 'Verified Natural Farm — Peer inspected by village cooperative.'
        : 'Standard small-holder farmer direct produce.',
      createdAt: Date.now(),
    };

    onProductCreated(newProduct);
    onClose();
  };

  const wizardSteps: StepItem[] = [
    { id: 'crop', label: language === 'te' ? 'పంట' : 'Crop' },
    { id: 'qty', label: language === 'te' ? 'పరిమాణం' : 'Quantity' },
    { id: 'price', label: language === 'te' ? 'ధర' : 'Price' },
    { id: 'photo', label: language === 'te' ? 'సమీక్ష' : 'Review' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-[#FBF8F1] rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2DDCF] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-safe sm:pb-0 animate-in fade-in slide-in-from-bottom-6 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#1B3D27] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#E6F2EA]/20 flex items-center justify-center text-[#F5B800] font-black text-sm">
              {currentStep}/4
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-black leading-tight truncate">
                {language === 'te' ? 'పంట వివరాలు చేర్చండి' : 'Add Produce Listing'}
              </h2>
              <p className="text-[12px] text-[#E6F2EA]/80 font-bold">
                {language === 'te' ? `దశ ${currentStep} / 4` : `Step ${currentStep} of 4`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Voice Bar */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-full cursor-pointer transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#F5B800] text-[#1A1A1A] hover:bg-amber-300'
              }`}
              title={language === 'te' ? 'వాయిస్‌తో చెప్పండి' : 'Speak to fill'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="px-4 py-2.5 bg-white border-b border-[#E2DDCF] shrink-0">
          <StepIndicator steps={wizardSteps} currentStepIndex={currentStep - 1} />
        </div>

        {/* Voice Listening Bar if Active */}
        {isListening && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
              <p className="text-[13px] font-bold text-[#1A1A1A] truncate">
                {voiceTranscript || (language === 'te' ? 'వింటున్నాము... మాట్లాడండి' : 'Listening... Speak crop & price')}
              </p>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="px-2.5 py-1 rounded bg-[#1B3D27] text-white text-[11px] font-bold shrink-0 cursor-pointer"
            >
              {language === 'te' ? 'పూర్తి' : 'Done'}
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 1: CROP SELECTION */}
          {/* ═════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'మీరు ఏ పంటను విక్రయించాలనుకుంటున్నారు?' : 'What crop are you listing today?'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'క్రింది వాటిలో ఒకదాన్ని ఎంచుకోండి లేదా పేరు నమోదు చేయండి' : 'Select a crop below or type custom name'}
                </p>
              </div>

              {/* Grid of Big Crop Tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                {CROP_PRESETS.map((preset) => {
                  const isSelected = selectedCropId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectCrop(preset)}
                      className={`min-h-[72px] p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E6F2EA] border-2 border-[#1B3D27] shadow-sm'
                          : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/50'
                      }`}
                    >
                      <img
                        src={preset.image}
                        alt={preset.name}
                        className="w-12 h-12 rounded-xl object-cover bg-stone-50 border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-black text-[#1A1A1A] leading-tight truncate">
                          {language === 'te' ? preset.teluguName : preset.name}
                        </p>
                        <p className="text-[12px] font-bold text-[#5B5B5B] mt-0.5">
                          ₹{preset.defaultPrice}/{preset.unit}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Crop Name */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[14px] font-bold text-[#1A1A1A]">
                  {language === 'te' ? 'లేదా ఇతర పంట పేరు నమోదు చేయండి:' : 'Or enter other crop name:'}
                </label>
                <input
                  type="text"
                  value={language === 'te' ? cropTeluguName : cropName}
                  onChange={(e) => {
                    setCropName(e.target.value);
                    setCropTeluguName(e.target.value);
                  }}
                  placeholder={language === 'te' ? 'ఉదా. క్యారెట్, బంగాళాదుంప...' : 'E.g. Fresh Spinach, Carrots...'}
                  className="w-full min-h-[48px] px-3.5 text-[16px] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                />
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 2: QUANTITY & UNIT */}
          {/* ═════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'ఎంత పరిమాణం అందుబాటులో ఉంది?' : 'How much stock do you have ready?'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? `${cropTeluguName} నిల్వ పరిమాణాన్ని నమోదు చేయండి` : `Enter available quantity for ${cropName}`}
                </p>
              </div>

              {/* Big Quantity Stepper */}
              <Card variant="default" padding="lg" className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[44px] font-black text-[#1B3D27] tracking-tight">
                    {quantity}
                  </span>
                  <span className="text-[22px] font-black text-[#5B5B5B]">
                    {unit}
                  </span>
                </div>

                {/* +/- Steppers */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 10))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 10)}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +10
                  </button>
                </div>

                {/* Direct Number Input */}
                <div className="pt-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full min-h-[48px] text-center text-[18px] font-black text-[#1A1A1A] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                  />
                </div>
              </Card>

              {/* Unit Picker Chips */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-bold text-[#1A1A1A]">
                  {language === 'te' ? 'కొలత యూనిట్:' : 'Unit of measure:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'kg', label: language === 'te' ? 'కిలో (kg)' : 'kg' },
                    { val: 'quintal', label: language === 'te' ? 'క్వింటాల్' : 'quintal' },
                    { val: 'liters', label: language === 'te' ? 'లీటర్లు' : 'liters' },
                    { val: 'bunches', label: language === 'te' ? 'కట్టలు' : 'bunches' },
                  ].map((u) => (
                    <button
                      key={u.val}
                      type="button"
                      onClick={() => setUnit(u.val)}
                      className={`min-h-[48px] px-2 rounded-xl text-[14px] font-bold border transition-colors cursor-pointer ${
                        unit === u.val
                          ? 'bg-[#1B3D27] text-white border-[#1B3D27]'
                          : 'bg-white text-[#1A1A1A] border-[#E2DDCF] hover:bg-stone-50'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 3: PRICE & TRUST CLAIM */}
          {/* ═════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'మీరు ఆశించే ధర ఎంత?' : 'What is your selling price?'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'మార్కెట్ ధర కంటే 100% పారదర్శక ప్రత్యక్ష చెల్లింపు' : 'Set your fair direct price per unit'}
                </p>
              </div>

              {/* Price Stepper Card */}
              <Card variant="default" padding="lg" className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[44px] font-black text-[#1B3D27] tracking-tight">
                    ₹{price}
                  </span>
                  <span className="text-[20px] font-black text-[#5B5B5B]">
                    / {unit}
                  </span>
                </div>

                {/* +/- Price Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrice((p) => Math.max(1, p - 5))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -₹5
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrice((p) => Math.max(1, p - 1))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -₹1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrice((p) => p + 1)}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +₹1
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrice((p) => p + 5)}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +₹5
                  </button>
                </div>

                {/* Direct Number Input */}
                <input
                  type="number"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
                  className="w-full min-h-[48px] text-center text-[18px] font-black text-[#1A1A1A] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                />
              </Card>

              {/* Mandi Benchmark Banner */}
              {mandiRef && (
                <div className="p-3 bg-[#E6F2EA] border border-[#1B3D27]/20 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#1B3D27] shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-[#1B3D27]">
                        {language === 'te' ? `నేటి మండీ ధర: ₹${mandiRef.mandiPrice}/${mandiRef.unit}` : `Today's Mandi rate: ₹${mandiRef.mandiPrice}/${mandiRef.unit}`}
                      </p>
                      <p className="text-[12px] text-[#5B5B5B]">
                        {language === 'te' ? `సిఫార్సు పరిధి: ₹${mandiRef.suggestedMinPrice} - ₹${mandiRef.suggestedMaxPrice}` : `Benchmark range: ₹${mandiRef.suggestedMinPrice} - ₹${mandiRef.suggestedMaxPrice}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="mint">
                    {language === 'te' ? 'రైతుకు లాభం' : 'No broker fee'}
                  </Badge>
                </div>
              )}

              {/* Organic Claim with Plain Language Explanation */}
              <div className="p-4 bg-white border border-[#E2DDCF] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#1B3D27]" />
                    <span className="text-[16px] font-black text-[#1A1A1A]">
                      {language === 'te' ? 'సేంద్రీయ / సహజ పద్ధతిలో పండించారా?' : 'Is this 100% Organically Grown?'}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={organicClaim}
                    onChange={(e) => setOrganicClaim(e.target.checked)}
                    className="w-6 h-6 rounded text-[#1B3D27] focus:ring-[#1B3D27] cursor-pointer"
                  />
                </div>

                <p className="text-[13px] text-[#5B5B5B] leading-relaxed">
                  {language === 'te'
                    ? 'సేంద్రీయ క్లెయిమ్‌కు కృత్రిమ ఎరువులు లేకుండా ఆవు పేడ ఎరువు, వేప ద్రావణం వాడిన రికార్డు అవసరం. కొనుగోలుదారులు దీన్ని ధృవీకరించినట్లుగా చూస్తారు.'
                    : 'Organic claim requires evidence of zero synthetic chemicals (cow-dung compost, neem spray, or certification). Buyers see this trust badge.'}
                </p>

                {/* Live Trust Rating Preview */}
                <div className="pt-2 border-t border-[#E2DDCF] flex items-center justify-between text-[13px]">
                  <span className="font-bold text-[#5B5B5B]">
                    {language === 'te' ? 'ట్రస్ట్ స్కోర్ ప్రివ్యూ:' : 'Live Trust Status:'}
                  </span>
                  {organicClaim ? (
                    <Badge variant="mint" icon={ShieldCheck}>
                      {language === 'te' ? 'సేంద్రీయ ధృవీకరణ' : 'Verified Organic'}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">
                      {language === 'te' ? 'ప్రామాణిక పొలం పంట' : 'Standard Direct Farm'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 4: PHOTO & FINAL REVIEW */}
          {/* ═════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'ఫోటో మరియు వివరాల సమీక్ష' : 'Photo & Final Listing Review'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'కొనుగోలుదారుల మార్కెట్‌లో కనిపించే రూపం' : 'Review how buyers will see your produce'}
                </p>
              </div>

              {/* Photo Card with Camera / Preset options */}
              <div className="relative rounded-2xl overflow-hidden border border-[#E2DDCF] bg-white">
                <img
                  src={activeImage}
                  alt={cropName}
                  className="w-full h-44 object-cover bg-stone-50"
                />

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-black/75 hover:bg-black text-white text-[13px] font-bold cursor-pointer backdrop-blur-xs flex items-center gap-1.5 transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>{language === 'te' ? 'ఫోటో తీయండి' : 'Take Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Summary Card */}
              <Card variant="mint" padding="md" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-[20px] font-black text-[#1A1A1A] leading-tight truncate">
                      {language === 'te' ? cropTeluguName : cropName}
                    </h4>
                    <p className="text-[13px] text-[#5B5B5B] mt-0.5">
                      {farmerName} • {farmerLocation}
                    </p>
                  </div>
                  {organicClaim && (
                    <Badge variant="mint" icon={ShieldCheck}>
                      {language === 'te' ? 'ఆర్గానిక్' : 'Organic'}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1B3D27]/15">
                  <div>
                    <span className="text-[12px] font-bold text-[#5B5B5B] block">
                      {language === 'te' ? 'పరిమాణం' : 'Total Stock'}
                    </span>
                    <span className="text-[18px] font-black text-[#1A1A1A]">
                      {quantity} {unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] font-bold text-[#5B5B5B] block">
                      {language === 'te' ? 'మీకు అందే మొత్తం' : 'Total Potential Payout'}
                    </span>
                    <span className="text-[22px] font-black text-[#1B3D27]">
                      ₹{price * quantity}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Direct Value Statement */}
              <p className="text-[13px] text-[#5B5B5B] text-center font-bold">
                {language === 'te'
                  ? 'మధ్యవర్తి కమీషన్ సున్నా. కొనుగోలుదారు చెల్లించే పూర్తి మొత్తం మీకే అందుతుంది.'
                  : 'Zero broker fee. You receive 100% of the produce value directly to your UPI/Bank.'}
              </p>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer Navigation */}
        <div className="p-4 bg-white border-t border-[#E2DDCF] flex items-center justify-between gap-3 shrink-0">
          {currentStep > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="min-h-[52px] px-4 text-[15px]"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              <span>{language === 'te' ? 'వెనుకకు' : 'Back'}</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onClose}
              className="min-h-[52px] px-4 text-[15px]"
            >
              <span>{language === 'te' ? 'రద్దు' : 'Cancel'}</span>
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="flex-1 min-h-[52px] text-[16px]"
            >
              <span>{language === 'te' ? 'తరువాత' : 'Next Step'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handlePublish}
              className="flex-1 min-h-[52px] text-[16px]"
            >
              <Check className="w-5 h-5 mr-1.5" />
              <span>{language === 'te' ? 'పంటను చేర్చండి' : 'Publish Listing'}</span>
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
