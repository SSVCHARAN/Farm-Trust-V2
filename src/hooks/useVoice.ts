import { useState, useRef, useCallback } from 'react';
import { UserRole, CustomerVoiceSearchIntent, FarmerAssistantAction } from '../types';
import { parseCustomerVoiceSearch, callFarmerAIAssistant } from '../services/aiService';
import { TTSService } from '../services/ttsService';
import { Language } from '../data/translations';

export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'confirm'
  | 'failure'
  | 'permission_denied'
  | 'unsupported'
  | 'done';

export interface UseVoiceOptions {
  role: UserRole;
  language: Language;
  farmerContext?: any;
  onExecuteFarmerAction?: (action: FarmerAssistantAction) => void;
  onApplyBuyerSearch?: (intent: CustomerVoiceSearchIntent) => void;
  onOpenManualForm?: (prefilledText: string) => void;
  showToast?: (msg: string) => void;
}

export function useVoice({
  role,
  language,
  farmerContext,
  onExecuteFarmerAction,
  onApplyBuyerSearch,
  onOpenManualForm,
  showToast,
}: UseVoiceOptions) {
  const isTe = language === 'te';

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('voicesheet');
      return Boolean(p);
    }
    return false;
  });
  const [voiceState, setVoiceState] = useState<VoiceState>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('voicesheet');
      if (p === 'listening' || p === 'true') return 'listening';
      if (p === 'confirm') return 'confirm';
      if (p === 'failure') return 'failure';
    }
    return 'idle';
  });
  const [transcript, setTranscript] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('voicesheet');
      if (p === 'listening' || p === 'true') {
        return isTe ? 'టమాటా ధర కిలోకి ₹35 చెయ్యి' : 'Set tomato price to ₹35/kg';
      }
    }
    return '';
  });
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);
  const [failureCount, setFailureCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('voicesheet');
      if (p === 'failure') return 1;
    }
    return 0;
  });
  const [confirmationSentence, setConfirmationSentence] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('voicesheet');
      if (p === 'confirm') {
        return isTe ? 'టమాటాల ధర కిలోకి ₹35 చేయమంటారా?' : 'Set tomato price to ₹35/kg?';
      }
    }
    return '';
  });
  const [parsedFarmerAction, setParsedFarmerAction] = useState<FarmerAssistantAction | null>(null);
  const [parsedBuyerIntent, setParsedBuyerIntent] = useState<CustomerVoiceSearchIntent | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const noSpeechTimeoutRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const lastRecognizedTextRef = useRef('');

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
  }, []);

  const closeSheet = useCallback(() => {
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
      mediaRecorderRef.current = null;
    }
    TTSService.stop();
    setIsOpen(false);
    setVoiceState('idle');
    setTranscript('');
    setInterimTranscript('');
    setFailureCount(0);
    setParsedFarmerAction(null);
    setParsedBuyerIntent(null);
  }, [clearTimers]);

  // Failure ladder implementation
  const handleFailure = useCallback(
    (_reason: string) => {
      clearTimers();
      const nextFailCount = failureCount + 1;
      setFailureCount(nextFailCount);

      if (nextFailCount >= 2) {
        // Second failure -> open matching manual form prefilled with anything recognized, plus toast
        const lastSpoken = transcript || interimTranscript;
        closeSheet();
        if (onOpenManualForm) {
          onOpenManualForm(lastSpoken);
        }
        if (showToast) {
          showToast(
            isTe
              ? 'వాయిస్ గుర్తించలేకపోయాము. దయచేసి వివరాలను మాన్యువల్‌గా పూర్తి చేయండి.'
              : "Couldn't catch that clearly. Please complete details manually."
          );
        }
      } else {
        // First failure -> show 'Didn't catch that' + example + Try again
        setVoiceState('failure');
      }
    },
    [clearTimers, failureCount, transcript, interimTranscript, closeSheet, onOpenManualForm, showToast, isTe]
  );

  // Process text through AI parser and transition to CONFIRM
  const processRecognizedText = useCallback(
    async (textToProcess: string) => {
      clearTimers();
      const clean = textToProcess.trim();
      if (!clean) {
        handleFailure('no-speech');
        return;
      }

      setVoiceState('processing');
      setTranscript(clean);

      try {
        if (role === 'FARMER') {
          const action = await callFarmerAIAssistant(clean, isTe ? 'te' : 'en', farmerContext || {});
          setParsedFarmerAction(action);

          // If the AI classified the action as NONE (unrecognized or ambient noise), trigger failure ladder
          // instead of trapping the user inside a false "Confirm Action" modal with Yes/No buttons!
          if (action.actionType === 'NONE') {
            handleFailure('no-match');
            return;
          }

          // Build plain confirmation sentence
          let sentence = isTe ? action.messageTelugu || action.message : action.message;

          // Ensure standard question form for confirmation
          if (action.actionType === 'UPDATE_PRICE' && action.payload) {
            sentence = isTe
              ? `${action.payload.productTeluguName || 'టమాటాల'} ధర కిలోకి ₹${action.payload.newPrice} చేయమంటారా?`
              : `Set ${action.payload.productName || 'produce'} price to ₹${action.payload.newPrice}/kg?`;
          } else if ((action.actionType === 'SET_STOCK' || action.actionType === 'ADD_STOCK') && action.payload) {
            sentence = isTe
              ? `${action.payload.productTeluguName || 'పంట'} నిల్వకు ${action.payload.deltaQuantity || action.payload.quantity} ${action.payload.unit} చేర్చమంటారా?`
              : `Add ${action.payload.deltaQuantity || action.payload.quantity} ${action.payload.unit} to stock?`;
          } else if (action.actionType === 'UPDATE_ORDER_STATUS' && action.payload) {
            sentence = isTe
              ? `${action.payload.customerName || 'కస్టమర్'} గారి ఆర్డర్ స్థితిని "${action.payload.statusNote || action.payload.targetStatus}"గా మార్చమంటారా?`
              : `Update order for ${action.payload.customerName || 'customer'} to "${action.payload.targetStatus}"?`;
          } else if (action.actionType === 'VIEW_PENDING_ORDERS') {
            sentence = isTe ? 'మీ పెండింగ్ ఆర్డర్లు చూపించమంటారా?' : 'Show pending buyer orders?';
          }

          if (action.confirmationRequired) {
            setConfirmationSentence(sentence);
            setVoiceState('confirm');
            TTSService.speak(sentence, isTe ? 'te-IN' : 'en-IN');
          } else {
            // Non-confirmation actions (e.g. inquiries, summaries) -> speak result and apply
            setVoiceState('done');
            TTSService.speak(sentence, isTe ? 'te-IN' : 'en-IN');
            onExecuteFarmerAction?.(action);
          }
        } else {
          // Buyer Marketplace Search
          const intent = await parseCustomerVoiceSearch(clean, isTe ? 'te' : 'en');
          setParsedBuyerIntent(intent);

          const sentence = isTe
            ? `${intent.productTelugu || intent.product} కోసం మార్కెట్‌లో శోధించమంటారా?`
            : `Search marketplace for ${intent.product}${intent.maxPrice ? ` under ₹${intent.maxPrice}` : ''}?`;

          setConfirmationSentence(sentence);
          setVoiceState('confirm');
          TTSService.speak(sentence, isTe ? 'te-IN' : 'en-IN');
        }
      } catch (err) {
        console.error('Error interpreting speech:', err);
        handleFailure('error');
      }
    },
    [clearTimers, isTe, role, farmerContext, handleFailure, onExecuteFarmerAction]
  );

  // Fallback MediaRecorder -> /api/voice/transcribe (Firefox, Safari)
  const startMediaRecorderFallback = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceState('unsupported');
      return;
    }

    setVoiceState('requesting_permission');

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setVoiceState('listening');
        setTranscript('');
        setInterimTranscript(isTe ? 'వింటున్నాము... మాట్లాడండి' : 'Listening... Speak now');

        // Bouncing waveform animation
        let animVol = 20;
        let dir = 1;
        const volInterval = setInterval(() => {
          animVol += dir * 4;
          if (animVol > 75) dir = -1;
          if (animVol < 25) dir = 1;
          setAudioVolume(animVol);
        }, 100);

        audioChunksRef.current = [];

        let chosenMime = 'audio/webm';
        if (typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            chosenMime = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            chosenMime = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            chosenMime = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            chosenMime = 'audio/ogg';
          }
        }

        const recorder = chosenMime
          ? new MediaRecorder(stream, { mimeType: chosenMime })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          clearInterval(volInterval);
          stream.getTracks().forEach((track) => track.stop());

          const actualMime = recorder.mimeType || chosenMime || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
          if (audioBlob.size < 500) {
            handleFailure('no-speech');
            return;
          }

          setVoiceState('processing');
          setInterimTranscript(isTe ? 'మాట గుర్తిస్తున్నాము...' : 'Transcribing voice...');

          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              const res = await fetch('/api/voice/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  mimeType: actualMime,
                  language: isTe ? 'te-IN' : 'en-IN',
                }),
              });
              const data = await res.json();
              if (data.success && data.transcript?.trim()) {
                processRecognizedText(data.transcript.trim());
              } else {
                handleFailure('transcribe-fail');
              }
            };
          } catch (e) {
            handleFailure('network');
          }
        };

        recorder.start(250);

        // 8s no-speech timeout
        noSpeechTimeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 8000);
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setVoiceState('permission_denied');
        } else {
          setVoiceState('unsupported');
        }
      });
  }, [handleFailure, isTe, processRecognizedText]);

  // Start listening immediately inside user click handler
  const startListening = useCallback(() => {
    // Unlock mobile Chrome audio context inside user click handler
    TTSService.unlockAudio();

    clearTimers();
    setIsOpen(true);
    setTranscript('');
    setInterimTranscript('');
    setConfirmationSentence('');
    setParsedFarmerAction(null);
    setParsedBuyerIntent(null);
    lastRecognizedTextRef.current = '';
    isStoppingRef.current = false;

    // Feature detect SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback to MediaRecorder -> /api/voice/transcribe
      startMediaRecorderFallback();
      return;
    }

    // Safely abort any prior running recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    setVoiceState('requesting_permission');

    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // On mobile Chrome, continuous: true causes severe repeating/glitching text.
      // Use continuous: false on mobile so Chrome naturally detects single spoken commands.
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = isTe ? 'te-IN' : 'en-IN';
      recognition.maxAlternatives = 1;

      // 8-second no-speech timeout
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (!isStoppingRef.current) {
          isStoppingRef.current = true;
          try {
            recognition.stop();
          } catch (_) {}
          handleFailure('timeout');
        }
      }, 8000);

      recognition.onstart = () => {
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        // Reset 8s no-speech timeout when words are heard
        if (noSpeechTimeoutRef.current) {
          clearTimeout(noSpeechTimeoutRef.current);
          noSpeechTimeoutRef.current = null;
        }

        let interim = '';
        let final = '';

        // Mobile-safe accumulation: avoid index drift across Android Web Speech API versions
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        final = final.trim();
        interim = interim.trim();

        if (interim) {
          lastRecognizedTextRef.current = interim;
          setInterimTranscript(interim);
          setAudioVolume(Math.floor(25 + Math.random() * 55));
        }

        if (final && final.length > 1) {
          lastRecognizedTextRef.current = final;
          setTranscript(final);
          setInterimTranscript('');
          isStoppingRef.current = true;
          try {
            recognition.stop();
          } catch (_) {}
          processRecognizedText(final);
          return;
        }

        // Auto-stop on silence: 2500ms after last speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (!isStoppingRef.current && interim && interim.length > 2) {
            isStoppingRef.current = true;
            try {
              recognition.stop();
            } catch (_) {}
            processRecognizedText(interim);
          }
        }, 2500);
      };

      recognition.onerror = (event: any) => {
        clearTimers();
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceState('permission_denied');
        } else if (event.error === 'no-speech') {
          handleFailure('no-speech');
        } else if (event.error === 'aborted') {
          if (!isStoppingRef.current) {
            handleFailure('aborted');
          }
        } else {
          handleFailure(event.error);
        }
      };

      recognition.onend = () => {
        clearTimers();
        // On mobile Chrome, recognition auto-stops when the user finishes speaking
        if (!isStoppingRef.current) {
          const captured = lastRecognizedTextRef.current.trim();
          if (captured && captured.length > 2) {
            isStoppingRef.current = true;
            processRecognizedText(captured);
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start SpeechRecognition directly, falling back:', err);
      startMediaRecorderFallback();
    }
  }, [clearTimers, handleFailure, isTe, processRecognizedText, startMediaRecorderFallback]);

  // Stop listening manually (via Stop button)
  const stopListening = useCallback(() => {
    clearTimers();
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    const textToProcess = transcript || interimTranscript;
    if (textToProcess.trim()) {
      processRecognizedText(textToProcess);
    } else {
      handleFailure('no-speech');
    }
  }, [clearTimers, handleFailure, interimTranscript, processRecognizedText, transcript]);

  // Execute confirmed action
  const confirmAction = useCallback(() => {
    TTSService.stop();
    if (role === 'FARMER' && parsedFarmerAction) {
      onExecuteFarmerAction?.(parsedFarmerAction);
    } else if (role === 'CUSTOMER' && parsedBuyerIntent) {
      onApplyBuyerSearch?.(parsedBuyerIntent);
    }
    closeSheet();
  }, [closeSheet, onApplyBuyerSearch, onExecuteFarmerAction, parsedBuyerIntent, parsedFarmerAction, role]);

  // Cancel action
  const cancelAction = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  // Simulate command from chip (runs through identical confirm flow without microphone)
  const simulateCommand = useCallback(
    (promptText: string) => {
      TTSService.unlockAudio();
      setIsOpen(true);
      processRecognizedText(promptText);
    },
    [processRecognizedText]
  );

  return {
    isOpen,
    voiceState,
    transcript: transcript || interimTranscript,
    audioVolume,
    failureCount,
    confirmationSentence,
    startListening,
    stopListening,
    confirmAction,
    cancelAction,
    closeSheet,
    simulateCommand,
    processRecognizedText,
  };
}
