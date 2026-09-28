import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  X,
  Check,
  AlertCircle,
  Volume2,
  Loader2,
  Send,
  HelpCircle,
} from 'lucide-react';
import { UserRole } from '../types';
import { Language } from '../data/translations';
import { VoiceState } from '../hooks/useVoice';

interface VoiceSheetProps {
  isOpen: boolean;
  role: UserRole;
  language: Language;
  voiceState: VoiceState;
  transcript: string;
  confirmationSentence: string;
  failureCount: number;
  onStartListening: () => void;
  onStopListening: () => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onClose: () => void;
  onProcessCustomText: (text: string) => void;
}

export const VoiceSheet: React.FC<VoiceSheetProps> = ({
  isOpen,
  role,
  language,
  voiceState,
  transcript,
  confirmationSentence,
  failureCount,
  onStartListening,
  onStopListening,
  onConfirmAction,
  onCancelAction,
  onClose,
  onProcessCustomText,
}) => {
  const [typedText, setTypedText] = useState('');
  const [isTypingMode, setIsTypingMode] = useState(false);

  if (!isOpen) return null;

  const isTe = language === 'te';

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    onProcessCustomText(typedText.trim());
    setTypedText('');
    setIsTypingMode(false);
  };

  const getExampleCommand = () => {
    if (role === 'FARMER') {
      return isTe
        ? 'ఉదాహరణకు: "టమాటా ధర కిలోకి ₹35 చెయ్యి"'
        : 'Example: "Set tomato price to ₹35/kg"';
    }
    return isTe
      ? 'ఉదాహరణకు: "నాటు టమాటాలు ₹30 లోపు"'
      : 'Example: "Fresh tomatoes under ₹30"';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTe ? 'వాయిస్ అసిస్టెంట్' : 'Voice Assistant'}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative bg-[#FBF8F1] rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-[#E2DDCF] overflow-hidden flex flex-col pb-safe sm:pb-0 animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Mobile Pull Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1 bg-[#5B5B5B]/30 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3.5 border-b border-[#E2DDCF] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5B800]" />
            <h2 className="text-[17px] font-black text-[#1A1A1A] leading-tight">
              {role === 'FARMER'
                ? isTe
                  ? 'రైతు వాయిస్ అసిస్టెంట్'
                  : 'Farmer Voice Assistant'
                : isTe
                ? 'వాయిస్ శోధన'
                : 'Marketplace Voice Search'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isTe ? 'మూసివేయి' : 'Close'}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-[#5B5B5B] hover:text-[#1A1A1A] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Sheet Body Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-5 min-h-[300px] justify-center">

          {/* ─── STATE 1: REQUESTING PERMISSION ─── */}
          {voiceState === 'requesting_permission' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="w-24 h-24 rounded-full bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center shadow-lg animate-pulse mx-auto">
                <Mic className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <p className="text-[18px] font-black text-[#1A1A1A]">
                  {isTe ? 'మైక్రోఫోన్ అనుమతి అడుగుతున్నాము...' : 'Requesting microphone permission...'}
                </p>
                <p className="text-[14px] text-[#5B5B5B]">
                  {isTe
                    ? 'దయచేసి మీ బ్రౌజర్‌లో మైక్రోఫోన్ అనుమతిని ఇవ్వండి'
                    : 'Please allow microphone access in your browser prompt'}
                </p>
              </div>
            </div>
          )}

          {/* ─── STATE 2: LISTENING ─── */}
          {voiceState === 'listening' && (
            <div className="w-full space-y-5 animate-in fade-in">
              {/* 96px Amber Circle with Waveform Pulse */}
              <div className="relative flex items-center justify-center py-2">
                <span className="absolute w-32 h-32 rounded-full bg-[#F5B800]/25 animate-ping" />
                <span className="absolute w-28 h-28 rounded-full bg-[#F5B800]/40" />
                <div className="relative w-24 h-24 rounded-full bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center shadow-[0_4px_24px_rgba(245,184,0,0.5)] border-4 border-white">
                  <Mic className="w-10 h-10 stroke-[2.5]" />
                </div>
              </div>

              {/* 5-Bar Animated Audio Waveform */}
              <div className="flex items-center justify-center gap-1.5 h-6">
                {[0.4, 0.8, 1, 0.6, 0.3].map((scale, i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-[#1B3D27] rounded-full animate-bounce"
                    style={{
                      height: `${12 + scale * 14}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>

              {/* Live Transcript at 22px Text */}
              <div className="min-h-[66px] flex items-center justify-center px-2">
                <p className="text-[22px] font-black text-[#1A1A1A] leading-snug">
                  {transcript || (isTe ? 'వింటున్నాము... మాట్లాడండి' : 'Listening... Speak now')}
                </p>
              </div>

              {/* Stop Speaking Button (min 48px) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onStopListening}
                  className="min-h-[48px] w-full max-w-xs mx-auto bg-[#B3261E] hover:bg-red-700 active:scale-98 text-white font-bold rounded-xl px-6 py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all text-[15px]"
                >
                  <MicOff className="w-5 h-5 stroke-[2.2]" />
                  <span>{isTe ? 'మాట్లాడటం ఆపండి' : 'Stop speaking'}</span>
                </button>
              </div>

              <p className="text-[12px] text-[#5B5B5B] font-medium">
                {isTe
                  ? 'నిశ్శబ్దంగా ఉంటే ఆటో-స్టాప్ అవుతుంది (8 సెకన్ల గరిష్ట సమయం)'
                  : 'Auto-stops on silence or 8s timeout'}
              </p>
            </div>
          )}

          {/* ─── STATE 3: PROCESSING ─── */}
          {voiceState === 'processing' && (
            <div className="w-full space-y-4 animate-in fade-in">
              <div className="w-24 h-24 rounded-full bg-[#E6F2EA] text-[#1B3D27] flex items-center justify-center mx-auto border-4 border-white shadow-md">
                <Loader2 className="w-10 h-10 stroke-[2.5] animate-spin text-[#1B3D27]" />
              </div>

              <div className="space-y-1">
                <p className="text-[18px] font-black text-[#1A1A1A]">
                  {isTe ? 'అర్థం చేసుకుంటున్నాము...' : 'Understanding...'}
                </p>
                {transcript && (
                  <p className="text-[16px] text-[#5B5B5B] italic font-medium">
                    "{transcript}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── STATE 4: CONFIRMATION (Plain Sentence + Big Yes/No) ─── */}
          {voiceState === 'confirm' && (
            <div className="w-full space-y-5 animate-in fade-in">
              {/* Voice playback indicator */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F2EA] text-[#1B3D27] text-[13px] font-black mx-auto">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>{isTe ? 'చదివి వినిపించబడింది' : 'Spoken aloud'}</span>
              </div>

              {/* Plain Sentence Understood at 22px */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#1B3D27]/25 shadow-xs">
                <p className="text-[13px] font-bold text-[#5B5B5B] uppercase tracking-wider mb-1">
                  {isTe ? 'నిర్ధారణ ప్రశ్న' : 'Confirm Action'}
                </p>
                <p className="text-[22px] font-black text-[#1B3D27] leading-tight">
                  "{confirmationSentence}"
                </p>
              </div>

              {/* Big Yes / No Buttons (52px min-height, prominent) */}
              <div className="flex items-center gap-3 pt-2 w-full">
                <button
                  type="button"
                  onClick={onCancelAction}
                  className="flex-1 min-h-[52px] bg-stone-100 hover:bg-stone-200 active:scale-98 text-[#1A1A1A] font-bold rounded-xl border border-[#E2DDCF] flex items-center justify-center gap-2 cursor-pointer transition-all text-[15px]"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                  <span>{isTe ? 'వద్దు, రద్దు' : 'No, Cancel'}</span>
                </button>

                <button
                  type="button"
                  onClick={onConfirmAction}
                  className="flex-1 min-h-[52px] bg-[#1B3D27] hover:bg-[#14321D] active:scale-98 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all text-[16px]"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{isTe ? 'అవును, ఖరారు చేయండి' : 'Yes, Confirm'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── STATE 5: FAILURE LADDER (1st failure) ─── */}
          {voiceState === 'failure' && (
            <div className="w-full space-y-4 animate-in fade-in">
              <div className="w-20 h-20 rounded-full bg-[#FFF4D6] text-[#C98A00] flex items-center justify-center mx-auto border-2 border-[#F5B800]">
                <AlertCircle className="w-10 h-10 stroke-[2.2]" />
              </div>

              <div className="space-y-1">
                <p className="text-[18px] font-black text-[#1A1A1A]">
                  {isTe ? 'మాట స్పష్టంగా వినిపించలేదు' : "Didn't catch that"}
                </p>
                <p className="text-[13px] text-[#5B5B5B]">
                  {isTe
                    ? 'దయచేసి మైక్రోఫోన్‌కు దగ్గరగా మాట్లాడండి'
                    : 'Please speak clearly near your microphone'}
                </p>
              </div>

              {/* Example Chip */}
              <div className="p-3 bg-white rounded-xl border border-[#E2DDCF] text-left text-[14px]">
                <p className="font-bold text-[#1B3D27]">{getExampleCommand()}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={onStartListening}
                  className="flex-1 min-h-[48px] bg-[#F5B800] hover:bg-[#E5AC00] text-[#1A1A1A] font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-[15px] shadow-xs"
                >
                  <Mic className="w-5 h-5 stroke-[2.2]" />
                  <span>{isTe ? 'మళ్ళీ ప్రయత్నించండి' : 'Try again'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTypingMode(true)}
                  className="flex-1 min-h-[48px] bg-white border border-[#E2DDCF] hover:bg-stone-50 text-[#1A1A1A] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all text-[15px]"
                >
                  <span>{isTe ? 'టైప్ చేయండి' : 'Type instead'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── STATE 6: PERMISSION DENIED ─── */}
          {voiceState === 'permission_denied' && (
            <div className="w-full space-y-4 animate-in fade-in">
              <div className="w-20 h-20 rounded-full bg-red-100 text-[#B3261E] flex items-center justify-center mx-auto border-2 border-red-300">
                <MicOff className="w-10 h-10 stroke-[2.2]" />
              </div>

              <div className="space-y-1">
                <p className="text-[18px] font-black text-[#1A1A1A]">
                  {isTe ? 'మైక్రోఫోన్ అనుమతి నిలిపివేయబడింది' : 'Microphone Permission Denied'}
                </p>
                <p className="text-[14px] text-[#5B5B5B] leading-relaxed">
                  {isTe
                    ? 'బ్రౌజర్ అడ్రస్ బార్‌లోని లాక్ లేదా సెట్టింగ్స్ ఐకాన్ క్లిక్ చేసి మైక్రోఫోన్ అనుమతి ఇవ్వండి.'
                    : 'Microphone is blocked in your browser. Tap the lock/tune icon near your browser address bar to allow microphone access.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTypingMode(true)}
                className="w-full min-h-[48px] bg-[#1B3D27] hover:bg-[#14321D] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-[15px]"
              >
                <span>{isTe ? 'టైప్ చేయండి' : 'Type instead'}</span>
              </button>
            </div>
          )}

          {/* ─── STATE 7: UNSUPPORTED / OFFLINE ─── */}
          {voiceState === 'unsupported' && (
            <div className="w-full space-y-4 animate-in fade-in">
              <div className="w-20 h-20 rounded-full bg-amber-50 text-[#C98A00] flex items-center justify-center mx-auto border-2 border-[#F5B800]">
                <HelpCircle className="w-10 h-10 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <p className="text-[18px] font-black text-[#1A1A1A]">
                  {isTe ? 'వాయిస్ ఈ బ్రౌజర్‌లో పని చేయదు' : 'Voice not supported here'}
                </p>
                <p className="text-[14px] text-[#5B5B5B] leading-relaxed">
                  {isTe
                    ? 'Firefox వాయిస్ రికగ్నిషన్‌ను సపోర్ట్ చేయదు. Chrome లేదా Edge బ్రౌజర్ వాడండి, లేదా టైప్ చేయండి.'
                    : 'Firefox does not support voice input. Use Chrome or Edge for voice — or just type your command below.'}
                </p>
              </div>

              {/* Immediately show typing form — no extra click needed */}
              <form onSubmit={handleTypedSubmit} className="w-full space-y-3 pt-1 animate-in fade-in">
                <div className="relative">
                  <input
                    type="text"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder={
                      role === 'FARMER'
                        ? isTe
                          ? 'ఉదా. టమాటా ధర ₹35 చేయండి'
                          : 'E.g. Set tomato price to ₹35'
                        : isTe
                        ? 'ఉదా. తాజా టమాటాలు'
                        : 'E.g. Fresh organic tomatoes'
                    }
                    autoFocus
                    className="w-full min-h-[50px] px-4 pr-12 text-[16px] text-[#1A1A1A] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                  />
                  <button
                    type="submit"
                    disabled={!typedText.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#1B3D27] disabled:bg-stone-300 text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[12px] text-[#5B5B5B] text-left">
                  {isTe
                    ? 'మీ సందేశాన్ని నమోదు చేసి పంపండి'
                    : 'Type your command and press send'}
                </p>
              </form>
            </div>
          )}

          {/* ─── TYPING FALLBACK INLINE FORM ─── */}
          {isTypingMode && (
            <form onSubmit={handleTypedSubmit} className="w-full space-y-3 pt-2 animate-in fade-in">
              <div className="relative">
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={
                    role === 'FARMER'
                      ? isTe
                        ? 'ఉదా. టమాటా ధర ₹35 చేయండి'
                        : 'E.g. Set tomato price to ₹35'
                      : isTe
                      ? 'ఉదా. తాజా టమాటాలు'
                      : 'E.g. Fresh organic tomatoes'
                  }
                  autoFocus
                  className="w-full min-h-[50px] px-4 pr-12 text-[16px] text-[#1A1A1A] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                />
                <button
                  type="submit"
                  disabled={!typedText.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#1B3D27] disabled:bg-stone-300 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-[#5B5B5B] text-left">
                {isTe
                  ? 'మీ సందేశాన్ని నమోదు చేసి పంపండి'
                  : 'Type your instruction and press send to run through confirmation'}
              </p>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
