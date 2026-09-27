import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Send,
  IndianRupee,
  Package,
  Layers,
  TrendingUp,
  Maximize2,
  Keyboard,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Clock
} from 'lucide-react';
import {
  Farmer,
  Product,
  Order,
  FarmerAssistantAction,
  OrderStatus,
  CustomerRequest,
  FarmerOffer
} from '../types';
import { callFarmerAIAssistant } from '../services/aiService';
import { TTSService, TTSLanguage } from '../services/ttsService';
import { UniversalVoiceInput } from '../services/voiceInputService';
import { Language, translations } from '../data/translations';

export type VoiceHubState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'CONFIRMING'
  | 'EXECUTED'
  | 'ANSWER'
  | 'ERROR';

interface FarmerVoiceHubProps {
  farmer: Farmer;
  products: Product[];
  orders: Order[];
  customerRequests?: CustomerRequest[];
  language: Language;
  onUpdateProductPrice?: (productId: string, newPrice: number) => void;
  onUpdateProductStock?: (productId: string, quantity: number, mode: 'set' | 'add') => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onSubmitFarmerOffer?: (requestId: string, offer: FarmerOffer) => void;
  onNavigateTab?: (tab: 'orders' | 'products' | 'demand' | 'profile') => void;
  onOpenFullscreenModal?: () => void;
  isModalMode?: boolean;
  onCloseModal?: () => void;
}

export const FarmerVoiceHub: React.FC<FarmerVoiceHubProps> = ({
  farmer,
  products,
  orders,
  customerRequests = [],
  language,
  onUpdateProductPrice,
  onUpdateProductStock,
  onUpdateOrderStatus,
  onSubmitFarmerOffer,
  onNavigateTab,
  onOpenFullscreenModal,
  isModalMode = false,
  onCloseModal,
}) => {
  const t = translations[language];

  // Core Voice State Machine
  const [voiceState, setVoiceState] = useState<VoiceHubState>('IDLE');
  const [voiceLang, setVoiceLang] = useState<TTSLanguage>(language === 'te' ? 'te-IN' : 'en-IN');
  const isTe = voiceLang.startsWith('te');
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeAction, setActiveAction] = useState<FarmerAssistantAction | null>(null);
  const [executionMessage, setExecutionMessage] = useState('');
  const [isConfirmListening, setIsConfirmListening] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Audio Playback
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentSpokenText, setCurrentSpokenText] = useState('');

  // Refs
  const silenceTimerRef = useRef<any>(null);
  const confirmTimeoutRef = useRef<any>(null);

  // Sync language selection when parent language changes
  useEffect(() => {
    setVoiceLang(language === 'te' ? 'te-IN' : 'en-IN');
  }, [language]);

  // Clean up audio and recognizers on unmount
  useEffect(() => {
    return () => {
      cleanupSpeechAndAudio();
    };
  }, []);

  const cleanupSpeechAndAudio = () => {
    TTSService.stop();
    UniversalVoiceInput.stopListening();
    setIsAudioLoading(false);
    setIsConfirmListening(false);
    setAudioVolume(0);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
  };

  const stopVoiceAudio = () => {
    TTSService.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setIsAudioLoading(false);
  };

  const playVoiceResponse = (text: string) => {
    if (!text) return;
    stopVoiceAudio();
    setCurrentSpokenText(text);
    setIsSpeaking(false);
    setIsPaused(false);
    setIsAudioLoading(true);

    TTSService.speak(text, voiceLang, {
      onLoading: (loading) => setIsAudioLoading(loading),
      onStart: () => {
        setIsAudioLoading(false);
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsAudioLoading(false);
        setIsSpeaking(false);
        setIsPaused(false);
      },
      onError: () => {
        setIsAudioLoading(false);
        setIsSpeaking(false);
        setIsPaused(false);
      },
    });
  };

  // Start main listening for command
  const startListening = () => {
    cleanupSpeechAndAudio();
    setVoiceState('LISTENING');
    setTranscript('');
    setActiveAction(null);
    setExecutionMessage('');
    setErrorMessage('');

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1500,
      onVolumeChange: (vol) => {
        setAudioVolume(vol);
      },
      onStateChange: (state) => {
        if (state === 'processing') {
          setVoiceState('PROCESSING');
        } else if (state === 'listening') {
          setVoiceState('LISTENING');
        }
      },
      onInterim: (interim) => {
        setTranscript(interim);
      },
      onFinal: (finalText) => {
        setTranscript(finalText);
        processQuery(finalText);
      },
      onError: (code, msg) => {
        console.warn('Voice input error:', code, msg);
        if (code === 'no-speech') {
          setVoiceState('IDLE');
        } else if (code === 'permission-denied') {
          setErrorMessage(
            isTe
              ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి మీ బ్రౌజర్ అడ్రస్ బార్‌లో మైక్రోఫోన్ అనుమతి ఇవ్వండి.'
              : 'Microphone permission blocked. Please allow microphone access in your browser address bar.'
          );
          setVoiceState('ERROR');
        } else if (code === 'network') {
          setErrorMessage(
            isTe
              ? 'వాయిస్ నెట్‌వర్క్ సమస్య. దయచేసి మీ ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేసి మళ్ళీ మాట్లాడండి.'
              : 'Speech recognition network error. Please check your internet connection and try again.'
          );
          setVoiceState('ERROR');
        } else if (code === 'unsupported') {
          setErrorMessage(
            msg || (isTe
              ? 'ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ అందుబాటులో లేదు. దయచేసి Chrome లేదా Edge ఉపయోగించండి.'
              : 'Voice recognition is not supported in this browser. Please use Chrome or Edge.')
          );
          setVoiceState('ERROR');
        } else {
          setErrorMessage(
            msg || (isTe
              ? 'మాట సరిగ్గా వినపడలేదు. దయచేసి మైక్ నొక్కి మళ్ళీ మాట్లాడండి.'
              : 'Could not catch that clearly. Please tap the mic and try again.')
          );
          setVoiceState('ERROR');
        }
      },
    });
  };

  const stopListening = () => {
    UniversalVoiceInput.stopListening();
    if (transcript.trim()) {
      processQuery(transcript.trim());
    } else {
      setVoiceState('IDLE');
    }
  };

  // Process query through AI Assistant engine
  const processQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    cleanupSpeechAndAudio();
    setVoiceState('PROCESSING');
    setActiveAction(null);
    setExecutionMessage('');

    try {
      const langParam = voiceLang.startsWith('te') ? 'te' : 'en';
      const action = await callFarmerAIAssistant(q, langParam, {
        farmer,
        products,
        orders,
        customerRequests,
      });

      setActiveAction(action);

      // Determine prompt message
      const spokenQuestion =
        langParam === 'te' && action.messageTelugu ? action.messageTelugu : action.message;

      if (action.confirmationRequired) {
        setVoiceState('CONFIRMING');
        // Speak question aloud using natural neural voice, then listen for verbal/touch confirmation
        setCurrentSpokenText(spokenQuestion);
        setIsSpeaking(false);
        setIsAudioLoading(true);
        TTSService.speak(spokenQuestion, voiceLang, {
          onLoading: (loading) => setIsAudioLoading(loading),
          onStart: () => {
            setIsAudioLoading(false);
            setIsSpeaking(true);
          },
          onEnd: () => {
            setIsAudioLoading(false);
            setIsSpeaking(false);
            startConfirmationListening(action);
          },
          onError: () => {
            setIsAudioLoading(false);
            setIsSpeaking(false);
            startConfirmationListening(action);
          },
        });
      } else {
        setVoiceState('ANSWER');
        playVoiceResponse(spokenQuestion);
      }
    } catch (err: any) {
      console.error('Failed to process voice query:', err);
      setErrorMessage(
        isTe
          ? 'మాట ప్రాసెస్ చేయడంలో సమస్య తలెత్తింది. దయచేసి మళ్ళీ మాట్లాడండి.'
          : 'Failed to process voice request. Please tap the mic and try again.'
      );
      setVoiceState('ERROR');
    }
  };

  // Conversational confirmation listening ("అవును" / "కాదు" / "yes" / "no")
  const startConfirmationListening = (action: FarmerAssistantAction) => {
    setIsConfirmListening(true);

    UniversalVoiceInput.startListening({
      lang: voiceLang,
      silenceTimeoutMs: 1200,
      maxDurationMs: 6000,
      onVolumeChange: (vol) => setAudioVolume(vol),
      onFinal: (spoken) => {
        setIsConfirmListening(false);
        const lower = spoken.toLowerCase().trim();

        const affirmativeWords = [
          'అవును',
          'సరే',
          'చెయ్యి',
          'చేయి',
          'ఖరారు',
          'మార్చు',
          'అలాగే',
          'చేయండి',
          'yes',
          'confirm',
          'ok',
          'sure',
          'yeah',
          'correct',
          'right',
        ];

        const negativeWords = [
          'వద్దు',
          'కాదు',
          'రద్దు',
          'ఆపు',
          'వద్దులే',
          'no',
          'cancel',
          'stop',
          'dont',
          'nah',
        ];

        const isYes = affirmativeWords.some((w) => lower.includes(w));
        const isNo = negativeWords.some((w) => lower.includes(w));

        if (isYes) {
          handleExecuteAction(action);
        } else if (isNo) {
          handleCancelAction();
        }
      },
      onError: () => {
        setIsConfirmListening(false);
      },
    });

    // Safeguard timeout
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => {
      UniversalVoiceInput.stopListening();
      setIsConfirmListening(false);
    }, 6000);
  };

  // Execute the confirmed action & Speak the result back aloud
  const handleExecuteAction = (actionToExecute?: FarmerAssistantAction) => {
    const action = actionToExecute || activeAction;
    if (!action) return;

    cleanupSpeechAndAudio();
    const { actionType, payload } = action;

    let resultMsg = isTe
      ? payload?.executedMessageTelugu || action.messageTelugu || 'చర్య విజయవంతంగా పూర్తయింది!'
      : payload?.executedMessage || action.message || 'Action executed successfully!';

    if (actionType === 'UPDATE_PRICE' && payload) {
      const { productId, newPrice, unit } = payload;
      if (productId && newPrice) {
        onUpdateProductPrice?.(productId, newPrice);
        resultMsg = isTe
          ? (payload.executedMessageTelugu || `సరే, టమాటాల ధర కిలోకి ${newPrice} రూపాయలు చేశాను.`)
          : (payload.executedMessage || `Sure, I have updated the tomato price to ${newPrice} rupees per kg.`);
      }
    } else if (actionType === 'SET_STOCK' && payload) {
      const { productId, quantity, unit } = payload;
      if (productId && quantity !== undefined) {
        onUpdateProductStock?.(productId, quantity, 'set');
        resultMsg = isTe
          ? (payload.executedMessageTelugu || `మీ దగ్గర ${quantity} కిలోల టమాటాలు ఉన్నాయి.`)
          : (payload.executedMessage || `Updated stock to ${quantity} ${unit || 'kg'}.`);
      }
    } else if (actionType === 'ADD_STOCK' && payload) {
      const { productId, deltaQuantity, quantity, unit } = payload;
      if (productId && deltaQuantity) {
        onUpdateProductStock?.(productId, deltaQuantity, 'add');
        resultMsg = isTe
          ? (payload.executedMessageTelugu || `${payload.productTeluguName || 'పంట'} నిల్వకు ${deltaQuantity} ${unit || 'కిలోలు'} జోడించాను.`)
          : (payload.executedMessage || `Added ${deltaQuantity} ${unit || 'kg'} to stock.`);
      }
    } else if (actionType === 'MARK_OUT_OF_STOCK' && payload) {
      const { productId } = payload;
      if (productId) {
        onUpdateProductStock?.(productId, 0, 'set');
        resultMsg = isTe
          ? (payload.executedMessageTelugu || `${payload.productTeluguName || 'పంట'} స్టాక్ పూర్తయినట్లు మార్కెట్లో మార్చాను.`)
          : (payload.executedMessage || `Marked ${payload.productName || 'produce'} as out of stock.`);
      }
    } else if (actionType === 'UPDATE_ORDER_STATUS' && payload) {
      const { orderId, targetStatus, customerName, statusNote } = payload;
      if (orderId && targetStatus) {
        onUpdateOrderStatus?.(orderId, targetStatus as OrderStatus);
        resultMsg = isTe
          ? (payload.executedMessageTelugu || `${customerName || ''} గారి ఆర్డర్ సిద్ధమైంది.`)
          : (payload.executedMessage || `Updated order #${orderId} to "${targetStatus}".`);
      }
    } else if (actionType === 'MAKE_REQUEST_OFFER' && payload) {
      if (payload.requestId && onSubmitFarmerOffer) {
        onSubmitFarmerOffer(payload.requestId, {
          id: `offer-${Date.now()}`,
          requestId: payload.requestId,
          farmerId: farmer.id,
          farmerName: farmer.name,
          farmerTeluguName: farmer.teluguName,
          farmerLocation: farmer.location,
          farmerRating: farmer.rating,
          farmerAvatar: farmer.avatar,
          productName: payload.productName || 'Fresh Produce',
          productTeluguName: payload.productTeluguName,
          offeredQuantity: payload.offerQuantity || payload.quantity || 5,
          unit: payload.unit || 'kg',
          unitPrice: payload.offerUnitPrice || payload.newPrice || 35,
          totalPrice:
            (payload.offerQuantity || payload.quantity || 5) *
            (payload.offerUnitPrice || payload.newPrice || 35),
          deliveryPromise: payload.deliveryPromise || 'Within 24 hours',
          deliveryPromiseTelugu: payload.deliveryPromiseTelugu,
          status: 'PENDING',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        resultMsg = isTe
          ? `${payload.customerName || 'కస్టమర్'} గారికి మీ పంట ఆఫర్ విజయవంతంగా పంపించబడింది!`
          : `Your produce offer was sent to ${payload.customerName || 'customer'} successfully!`;
      }
    }

    setExecutionMessage(resultMsg);
    setVoiceState('EXECUTED');
    playVoiceResponse(resultMsg);
  };

  const handleCancelAction = () => {
    cleanupSpeechAndAudio();
    const cancelMsg = isTe ? 'సరే, రద్దు చేశాను.' : 'Okay, action cancelled.';
    setExecutionMessage(cancelMsg);
    setVoiceState('IDLE');
    playVoiceResponse(cancelMsg);
  };

  const currentDisplayText = () => {
    if (voiceState === 'EXECUTED') return executionMessage;
    if (activeAction) {
      return isTe && activeAction.messageTelugu ? activeAction.messageTelugu : activeAction.message;
    }
    return '';
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isModalMode
          ? 'bg-transparent text-white flex flex-col h-full'
          : 'bg-gradient-to-br from-[#183622] via-[#1b3d27] to-[#12281a] rounded-3xl border-2 border-emerald-700/40 p-5 sm:p-6 text-white shadow-xl'
      }`}
    >
      {/* Decorative ambient leaf pattern */}
      {!isModalMode && (
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shadow-md shrink-0 transition-transform ${
              voiceState === 'LISTENING'
                ? 'bg-red-500 text-white scale-105 animate-pulse'
                : 'bg-amber-400 text-stone-950'
            }`}
          >
            {voiceState === 'LISTENING' ? (
              <Mic className="w-6 h-6 animate-bounce" />
            ) : (
              <Sparkles className="w-6 h-6 text-stone-950" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-xs">
                {isTe ? 'ఫార్మ్‌ట్రస్ట్‌తో మాట్లాడండి' : 'Talk to Farm Trust'}
              </h2>
              <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Voice First
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 font-medium">
              {isTe
                ? 'ధర మార్చడం, స్టాక్, ఆర్డర్ల కోసం సహజంగా మాట్లాడండి'
                : 'Speak naturally in Telugu or English for prices, stock & orders'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Vernacular Language Selector */}
          <div className="bg-white/10 p-0.5 rounded-xl border border-white/20 flex items-center">
            <button
              type="button"
              onClick={() => setVoiceLang('te-IN')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all min-touch-target cursor-pointer ${
                voiceLang === 'te-IN'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              తెలుగు
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang('en-IN')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all min-touch-target cursor-pointer ${
                voiceLang === 'en-IN'
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          {/* Fullscreen Expand Button (when embedded in dashboard) */}
          {!isModalMode && onOpenFullscreenModal && (
            <button
              type="button"
              onClick={onOpenFullscreenModal}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer min-touch-target"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {/* Close button (when in Modal mode) */}
          {isModalMode && onCloseModal && (
            <button
              type="button"
              onClick={() => {
                cleanupSpeechAndAudio();
                onCloseModal();
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer min-touch-target border border-white/15"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN INTERACTIVE BODY */}
      <div className="pt-4 space-y-4">
        {/* 1. STATE: IDLE - Big inviting touch target & microphone */}
        {voiceState === 'IDLE' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-amber-300">
                  {isTe
                    ? 'మైక్ నొక్కి మాట్లాడండి లేదా కింద ఉన్న నమూనా నొక్కండి'
                    : 'Tap the mic and speak, or choose a sample prompt below'}
                </p>
                <p className="text-xs text-stone-300 mt-0.5">
                  {isTe
                    ? 'ఉదాహరణ: "టమాటాల ధర 35 రూపాయలు చేయి"'
                    : 'e.g. "Change tomato price to ₹35" or "Show pending orders"'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startListening}
                  className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-2.5 cursor-pointer min-touch-target"
                >
                  <Mic className="w-5 h-5 text-stone-950 animate-pulse" />
                  <span className="text-sm">
                    {isTe ? 'నోటితో మాట్లాడండి' : 'Start Speaking'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-colors cursor-pointer min-touch-target"
                  title="Toggle typing input"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Clickable Sample Prompts */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-200/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isTe ? 'త్వరిత ఆదేశాలు (క్లిక్ చేసి మాట్లాడవచ్చు):' : 'Sample Voice Commands:'}
                </span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const prompt = isTe ? 'టమాటాల ధర 35 రూపాయలు చేయి' : 'Change tomato price to 35';
                    setTranscript(prompt);
                    processQuery(prompt);
                  }}
                  className="p-3 text-left bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 rounded-xl transition-all flex items-center justify-between cursor-pointer min-touch-target group shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <div>
                      <p className="font-extrabold text-amber-300 group-hover:text-amber-200">
                        {isTe ? 'ధర సవరణ' : 'Price Change'}
                      </p>
                      <p className="text-stone-300 text-[11px] truncate">
                        {isTe ? 'టమాటాల ధర 35 రూపాయలు చేయి' : 'Change tomato price to ₹35'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-amber-300 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = isTe ? 'నా పెండింగ్ ఆర్డర్లు చూపించు' : 'Show my pending orders';
                    setTranscript(prompt);
                    processQuery(prompt);
                  }}
                  className="p-3 text-left bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 rounded-xl transition-all flex items-center justify-between cursor-pointer min-touch-target group shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <div>
                      <p className="font-extrabold text-amber-300 group-hover:text-amber-200">
                        {isTe ? 'పెండింగ్ ఆర్డర్లు' : 'Pending Orders'}
                      </p>
                      <p className="text-stone-300 text-[11px] truncate">
                        {isTe ? 'నా పెండింగ్ ఆర్డర్లు చూపించు' : 'Show my pending orders'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-amber-300 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = isTe ? 'ఈ వారం ఎంత అమ్మాను?' : 'How much did I sell this week?';
                    setTranscript(prompt);
                    processQuery(prompt);
                  }}
                  className="p-3 text-left bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 rounded-xl transition-all flex items-center justify-between cursor-pointer min-touch-target group shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📈</span>
                    <div>
                      <p className="font-extrabold text-amber-300 group-hover:text-amber-200">
                        {isTe ? 'అమ్మకాల ఆదాయం' : 'Sales Summary'}
                      </p>
                      <p className="text-stone-300 text-[11px] truncate">
                        {isTe ? 'ఈ వారం ఎంత అమ్మాను?' : 'How much did I sell this week?'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-amber-300 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prompt = isTe ? 'నా దగ్గర ఏమేమి పంటలు ఉన్నాయి?' : 'What crops do I have in stock?';
                    setTranscript(prompt);
                    processQuery(prompt);
                  }}
                  className="p-3 text-left bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 rounded-xl transition-all flex items-center justify-between cursor-pointer min-touch-target group shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌾</span>
                    <div>
                      <p className="font-extrabold text-amber-300 group-hover:text-amber-200">
                        {isTe ? 'పంట నిల్వలు' : 'My Harvest Stock'}
                      </p>
                      <p className="text-stone-300 text-[11px] truncate">
                        {isTe ? 'నా దగ్గర ఏమేమి పంటలు ఉన్నాయి?' : 'What crops do I have?'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-amber-300 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. STATE: LISTENING - Live Audio Wave & Interim Transcript */}
        {voiceState === 'LISTENING' && (
          <div className="p-5 bg-stone-900/80 rounded-2xl border-2 border-red-500/60 text-white space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-black uppercase tracking-wider text-red-400">
                  {isTe ? 'వింటున్నాం... స్పష్టంగా మాట్లాడండి' : 'Listening... Speak naturally'}
                </span>
              </div>

              {/* Dynamic Sound Wave Bars */}
              <div className="flex items-center gap-1 h-6">
                <span
                  className="w-1.5 bg-amber-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(24, 6 + (audioVolume * 0.18)))}px` }}
                ></span>
                <span
                  className="w-1.5 bg-amber-300 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, Math.min(24, 8 + (audioVolume * 0.22)))}px` }}
                ></span>
                <span
                  className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(12, Math.min(24, 10 + (audioVolume * 0.25)))}px` }}
                ></span>
                <span
                  className="w-1.5 bg-amber-300 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, Math.min(24, 8 + (audioVolume * 0.22)))}px` }}
                ></span>
                <span
                  className="w-1.5 bg-amber-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(24, 6 + (audioVolume * 0.18)))}px` }}
                ></span>
              </div>
            </div>

            {/* Live Transcript Box */}
            <div className="min-h-[56px] p-3.5 bg-black/40 rounded-xl border border-white/10 flex items-center">
              <p className="text-sm sm:text-base font-bold text-amber-200 tracking-wide">
                {transcript ? `"${transcript}"` : (isTe ? 'ధ్వని వినపడుతోంది...' : 'Hearing your voice...')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-1 border-t border-white/10">
              <span className="text-stone-400 text-[11px]">
                {isTe ? 'మీరు ఆపగానే ఆటోమేటిక్‌గా ప్రాసెస్ అవుతుంది' : 'Will auto-process when you finish'}
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="self-end px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl cursor-pointer min-touch-target flex items-center gap-1.5 shadow-md text-xs"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>{isTe ? 'పూర్తయింది' : 'Done Speaking'}</span>
              </button>
            </div>

            {/* Quick Clickable Suggestions while listening */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-stone-400 font-bold">
                {isTe ? 'లేదా నొక్కండి:' : 'Or tap:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const q = isTe ? 'టమాటాల ధర 35 రూపాయలు చేయి' : 'Change tomato price to 35';
                  setTranscript(q);
                  processQuery(q);
                }}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[11px] font-bold text-amber-300 cursor-pointer min-touch-target"
              >
                💰 {isTe ? 'ధర 35 చేయి' : 'Price to ₹35'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = isTe ? 'నా పెండింగ్ ఆర్డర్లు చూపించు' : 'Show my pending orders';
                  setTranscript(q);
                  processQuery(q);
                }}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[11px] font-bold text-amber-300 cursor-pointer min-touch-target"
              >
                📦 {isTe ? 'పెండింగ్ ఆర్డర్లు' : 'Pending Orders'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = isTe ? 'ఈ వారం ఎంత అమ్మాను?' : 'How much did I sell this week?';
                  setTranscript(q);
                  processQuery(q);
                }}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[11px] font-bold text-amber-300 cursor-pointer min-touch-target"
              >
                📈 {isTe ? 'అమ్మకాలు' : 'Sales'}
              </button>
            </div>
          </div>
        )}

        {/* 3. STATE: PROCESSING - Vernacular Market Analysis Indicator */}
        {voiceState === 'PROCESSING' && (
          <div className="p-6 bg-white/10 rounded-2xl border border-white/20 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
            <div className="w-12 h-12 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-300">
                {isTe ? 'వ్యవసాయ మార్కెట్ డేటా పరిశీలిస్తున్నాం...' : 'Understanding farm marketplace intent...'}
              </p>
              <p className="text-xs text-stone-300 mt-1">
                {transcript ? `"${transcript}"` : ''}
              </p>
            </div>
          </div>
        )}

        {/* 4. STATE: CONFIRMING - Show Understanding & Ask Spoken Confirmation */}
        {voiceState === 'CONFIRMING' && activeAction && (
          <div className="p-4 sm:p-5 bg-white text-stone-900 rounded-2xl border-2 border-amber-400 shadow-xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{isTe ? 'మార్పును ఖరారు చేయండి' : 'Please Confirm This Action'}</span>
              </div>
              {isConfirmListening && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-bold animate-pulse shrink-0">
                  <Mic className="w-3 h-3" />
                  <span>{isTe ? '"అవును" / "వద్దు" వింటున్నాం' : 'Listening for Yes/No'}</span>
                </div>
              )}
            </div>

            {/* Clear Diff / Preview Card */}
            {activeAction.actionType === 'UPDATE_PRICE' && activeAction.payload && (
              <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600 font-bold">
                    {isTe ? 'పంట పేరు' : 'Crop'}:
                  </p>
                  <p className="text-sm sm:text-base font-black text-emerald-950">
                    {activeAction.payload.productTeluguName || activeAction.payload.productName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-600 font-bold">
                    {isTe ? 'కొత్త ధర' : 'New Price'}:
                  </p>
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-xs line-through text-stone-400 font-bold">
                      ₹{activeAction.payload.oldPrice}
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-800">
                      ₹{activeAction.payload.newPrice}
                    </span>
                    <span className="text-xs text-stone-600 font-semibold">
                      / {activeAction.payload.unit || 'kg'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STOCK LEVEL DIFF */}
            {(activeAction.actionType === 'SET_STOCK' || activeAction.actionType === 'ADD_STOCK') &&
              activeAction.payload && (
                <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-600 font-bold">
                      {isTe ? 'పంట పేరు' : 'Crop'}:
                    </p>
                    <p className="text-sm sm:text-base font-black text-emerald-950">
                      {activeAction.payload.productTeluguName || activeAction.payload.productName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-600 font-bold">
                      {isTe ? 'లభ్యమైన నిల్వ' : 'Stock Quantity'}:
                    </p>
                    <p className="text-base sm:text-lg font-black text-emerald-800">
                      {activeAction.actionType === 'ADD_STOCK'
                        ? `+${activeAction.payload.deltaQuantity || 5} ${activeAction.payload.unit} (మొత్తం ${activeAction.payload.quantity} ${activeAction.payload.unit})`
                        : `${activeAction.payload.quantity} ${activeAction.payload.unit}`}
                    </p>
                  </div>
                </div>
              )}

            {/* ORDER STATUS DIFF */}
            {activeAction.actionType === 'UPDATE_ORDER_STATUS' && activeAction.payload && (
              <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600 font-bold">
                    Order #{activeAction.payload.orderId}
                  </p>
                  <p className="text-sm font-black text-emerald-950">
                    {activeAction.payload.customerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-600 font-bold">
                    {isTe ? 'కొత్త స్థితి' : 'Target Status'}:
                  </p>
                  <span className="text-xs sm:text-sm font-black px-2.5 py-1 bg-emerald-800 text-amber-300 rounded-lg">
                    {activeAction.payload.statusNote || activeAction.payload.targetStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Spoken Question Text */}
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200">
              <p className="text-xs sm:text-sm font-extrabold text-stone-900 leading-snug">
                "{currentDisplayText()}"
              </p>
            </div>

            {/* Confirmation Buttons: 2-column on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelAction}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl cursor-pointer min-touch-target transition-colors text-center"
              >
                {isTe ? '❌ వద్దు / రద్దు' : '❌ Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleExecuteAction()}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3.5 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-black rounded-xl text-xs sm:text-sm shadow-md cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 min-touch-target transition-transform active:scale-95 text-center"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <span>{isTe ? '✅ అవును, మార్చు' : '✅ Yes, Confirm'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. STATE: EXECUTED - Green Success Banner, Spoken Result, Audio Controls */}
        {voiceState === 'EXECUTED' && (
          <div className="p-4 sm:p-5 bg-emerald-950 text-white rounded-2xl border-2 border-emerald-400 shadow-xl space-y-3.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              <span>{isTe ? 'విజయవంతంగా అమలు చేయబడింది!' : 'Action Completed Successfully!'}</span>
            </div>

            <div className="p-3 bg-black/30 rounded-xl border border-emerald-500/30">
              <p className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                "{executionMessage}"
              </p>
            </div>

            {/* Vernacular Audio Controls Bar */}
            <div className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <Volume2
                  className={`w-4 h-4 ${
                    isAudioLoading
                      ? 'text-amber-300 animate-spin'
                      : isSpeaking
                      ? 'text-amber-400 animate-pulse'
                      : 'text-stone-400'
                  }`}
                />
                <span className="font-bold text-emerald-200 text-[11px]">
                  {isAudioLoading
                    ? (isTe ? 'సహజ వాయిస్ లోడ్ అవుతోంది...' : 'Loading human voice...')
                    : isSpeaking
                    ? (isTe ? 'మాట్లాడుతోంది...' : 'Speaking aloud...')
                    : (isTe ? 'ఆడియో సమాధానం' : 'Spoken Audio')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => playVoiceResponse(executionMessage)}
                  className="px-3 py-1 bg-amber-400 text-stone-950 font-black rounded-lg text-xs cursor-pointer min-touch-target flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isTe ? 'మళ్లీ వినండి' : 'Replay'}</span>
                </button>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopVoiceAudio}
                    className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg cursor-pointer min-touch-target"
                    title="Stop audio"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Next query CTA */}
            <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setVoiceState('IDLE')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-stone-200 font-bold rounded-xl text-xs cursor-pointer min-touch-target"
              >
                {isTe ? 'ప్రధాన జాబితా' : 'Main Menu'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceState('IDLE');
                  startListening();
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5 min-touch-target"
              >
                <Mic className="w-4 h-4 text-stone-950" />
                <span>{isTe ? 'మరొకటి అడగండి' : 'Ask Next Query'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. STATE: ANSWER - Read-Only Inquiries (Orders, Sales, Inventory) */}
        {voiceState === 'ANSWER' && activeAction && (
          <div className="p-5 bg-white text-stone-900 rounded-2xl border-2 border-emerald-600 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                {activeAction.actionType === 'VIEW_PENDING_ORDERS' && <Package className="w-4 h-4 text-emerald-700" />}
                {activeAction.actionType === 'VIEW_EARNINGS_SUMMARY' && <TrendingUp className="w-4 h-4 text-emerald-700" />}
                {activeAction.actionType === 'VIEW_INVENTORY_SUMMARY' && <Layers className="w-4 h-4 text-emerald-700" />}
                <span>
                  {activeAction.actionType === 'VIEW_PENDING_ORDERS'
                    ? (isTe ? 'పెండింగ్ ఆర్డర్లు' : 'Pending Orders')
                    : activeAction.actionType === 'VIEW_EARNINGS_SUMMARY'
                    ? (isTe ? 'అమ్మకాల ఆదాయం' : 'Earnings Summary')
                    : (isTe ? 'పంట నిల్వల వివరాలు' : 'Crop Inventory')}
                </span>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => playVoiceResponse(currentDisplayText())}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isTe ? 'వినండి' : 'Listen'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <p className="text-sm font-semibold text-stone-900 leading-relaxed">
                "{currentDisplayText()}"
              </p>
            </div>

            {/* Deep navigation CTA */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setVoiceState('IDLE');
                  startListening();
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 min-touch-target"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isTe ? 'మరో ప్రశ్న' : 'Ask another'}</span>
              </button>

              {activeAction.actionType === 'VIEW_PENDING_ORDERS' && onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab('orders');
                    if (isModalMode && onCloseModal) onCloseModal();
                  }}
                  className="px-5 py-2.5 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5 min-touch-target shadow-xs"
                >
                  <span>{isTe ? 'ఆర్డర్ల విభాగం చూడండి' : 'Open Orders Tab'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 7. STATE: ERROR - Polite vernacular recovery */}
        {voiceState === 'ERROR' && (
          <div className="p-5 bg-red-950 text-white rounded-2xl border-2 border-red-500/80 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-black text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>
                {errorMessage.includes('Microphone') || errorMessage.includes('మైక్రోఫోన్')
                  ? (isTe ? 'మైక్రోఫోన్ అనుమతి అవసరం' : 'Microphone Permission Needed')
                  : errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('నెట్‌వర్క్') || errorMessage.includes('ఇంటర్నెట్')
                  ? (isTe ? 'ఇంటర్నెట్ నెట్‌వర్క్ లోపం' : 'Network Connection Error')
                  : errorMessage.includes('Browser') || errorMessage.includes('browser') || errorMessage.includes('బ్రౌజర్')
                  ? (isTe ? 'బ్రౌజర్ సపోర్ట్ లేదు' : 'Browser Not Supported')
                  : (isTe ? 'మాట సరిగ్గా వినపడలేదు' : 'Could not hear clearly')}
              </span>
            </div>

            <p className="text-sm text-stone-200 font-medium">
              {errorMessage || (
                isTe
                  ? 'నేను సరిగ్గా అర్థం చేసుకోలేకపోయాను. దయచేసి మైక్ నొక్కి మళ్లీ మాట్లాడండి.'
                  : 'Could not catch that clearly. Please tap the mic and try again.'
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVoiceState('IDLE')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-stone-300 font-bold rounded-xl text-xs cursor-pointer min-touch-target"
              >
                {isTe ? 'మూసివేయి' : 'Dismiss'}
              </button>
              <button
                type="button"
                onClick={startListening}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl text-xs cursor-pointer flex items-center gap-1.5 min-touch-target shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isTe ? 'మళ్లీ మాట్లాడండి' : 'Try Again'}</span>
              </button>
            </div>
          </div>
        )}

        {/* OPTIONAL: Keyboard text input drawer */}
        {showKeyboard && (
          <div className="p-3 bg-white text-stone-900 rounded-2xl border border-stone-300 shadow-md space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-stone-600 font-bold">
              <span>{isTe ? 'టైప్ చేసి అడగండి:' : 'Type your query:'}</span>
              <button
                type="button"
                onClick={() => setShowKeyboard(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={
                  isTe
                    ? 'ఉదా: టమాటాల ధర 35 చేయి'
                    : 'e.g. Change tomato price to 35'
                }
                className="flex-1 bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b3d27]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typedInput.trim()) {
                    processQuery(typedInput.trim());
                    setTypedInput('');
                    setShowKeyboard(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (typedInput.trim()) {
                    processQuery(typedInput.trim());
                    setTypedInput('');
                    setShowKeyboard(false);
                  }
                }}
                disabled={!typedInput.trim()}
                className="px-4 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-white font-bold rounded-xl text-xs disabled:opacity-40 cursor-pointer min-touch-target flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTe ? 'పంపు' : 'Send'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
