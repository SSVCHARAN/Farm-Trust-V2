/**
 * Farm Trust Universal Voice Input Service
 * 
 * Provides production-ready, client-side speech input:
 * 1. Native Web Speech API (webkitSpeechRecognition / SpeechRecognition) with zero backend dependency.
 * 2. Continuous accumulation of interim & final speech with smart silence auto-finalization.
 * 3. Graceful fallback on Safari / mobile devices where Telugu or system dictation requires adaptation.
 * 4. Distinct error classification: 'permission-denied' | 'no-speech' | 'network' | 'unsupported' | 'unknown'.
 * 5. Real-time visual waveform / volume feedback.
 */

export interface VoiceListenOptions {
  lang: string; // e.g. 'te-IN' or 'en-IN'
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (errorCode: 'permission-denied' | 'no-speech' | 'network' | 'unsupported' | 'unknown', message?: string) => void;
  onStateChange?: (state: 'idle' | 'requesting-permission' | 'listening' | 'processing') => void;
  onVolumeChange?: (volumePercent: number) => void; // 0 to 100
  silenceTimeoutMs?: number; // default 1400ms
  maxDurationMs?: number; // default 12000ms
}

export class UniversalVoiceInput {
  private static activeRecognition: any = null;
  private static activeStream: MediaStream | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static volumeAnimFrame: number | null = null;
  private static silenceTimer: any = null;
  private static maxDurationTimer: any = null;
  private static isRecording = false;

  /**
   * Check if native Web Speech Recognition is supported
   */
  public static isNativeSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Check if audio capture is supported in this browser
   */
  public static isMediaRecorderSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Start listening using the native Web Speech API
   */
  public static async startListening(options: VoiceListenOptions): Promise<void> {
    this.stopListening();

    const {
      onStateChange,
      onError,
    } = options;

    if (!this.isNativeSpeechSupported()) {
      if (onStateChange) onStateChange('idle');
      if (onError) {
        onError(
          'unsupported',
          'Voice recognition is not supported in this browser. Please open Farm Trust in Google Chrome or Microsoft Edge.'
        );
      }
      return;
    }

    this.isRecording = true;
    this.startNativeRecognition(options);
  }

  /**
   * Native Web Speech Recognition (Chrome/Edge/Safari/Android/iOS)
   */
  private static startNativeRecognition(options: VoiceListenOptions) {
    const {
      lang = 'te-IN',
      onInterim,
      onFinal,
      onError,
      onStateChange,
      onVolumeChange,
      silenceTimeoutMs = 1500,
      maxDurationMs = 12000,
    } = options;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let finalTranscript = '';
    let interimTranscript = '';
    let hasCapturedSpeech = false;
    let isDelivered = false;

    // Helper to safely deliver recognized text once
    const deliverFinal = (text: string) => {
      if (isDelivered) return;
      isDelivered = true;
      this.stopListening();
      const clean = text.trim();
      if (clean) {
        if (onStateChange) onStateChange('processing');
        onFinal(clean);
      } else {
        if (onStateChange) onStateChange('idle');
        if (onError) onError('no-speech', 'No speech detected.');
      }
    };

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      // continuous = false gives reliable speech-boundary detection in mobile/desktop Chrome
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Start visual volume feedback
      this.startVolumeMonitoring(onVolumeChange);

      recognition.onstart = () => {
        this.isRecording = true;
        if (onStateChange) onStateChange('listening');
      };

      recognition.onresult = (event: any) => {
        interimTranscript = '';
        let currentBatchFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const part = res[0]?.transcript || '';
          if (res.isFinal) {
            currentBatchFinal += (currentBatchFinal ? ' ' : '') + part.trim();
          } else {
            interimTranscript += part;
          }
        }

        if (currentBatchFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + currentBatchFinal;
        }

        const candidate = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (candidate) {
          hasCapturedSpeech = true;
          if (onInterim) onInterim(candidate);

          // Elevate waveform feedback on speech activity
          if (onVolumeChange) {
            const dynamicVol = Math.min(95, 35 + Math.min(55, candidate.length * 3));
            onVolumeChange(dynamicVol);
          }

          if (this.silenceTimer) clearTimeout(this.silenceTimer);

          if (currentBatchFinal && !interimTranscript) {
            // Browser reached a definitive final speech boundary
            deliverFinal(finalTranscript);
          } else {
            // Auto finish on speech pause
            this.silenceTimer = setTimeout(() => {
              deliverFinal(candidate);
            }, silenceTimeoutMs || 1400);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn('Native speech recognition error:', err);

        if (err === 'aborted') {
          // Normal manual stop or restart; do not treat as an error
          return;
        }

        if (isDelivered) return;

        // If speech was already recognized, treat as success rather than failing
        const candidate = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (candidate && (err === 'no-speech' || err === 'network')) {
          deliverFinal(candidate);
          return;
        }

        this.stopListening();
        if (onStateChange) onStateChange('idle');

        if (err === 'not-allowed' || err === 'permission-denied') {
          if (onError) {
            onError(
              'permission-denied',
              'Microphone permission blocked. Please allow microphone access in your browser address bar.'
            );
          }
        } else if (err === 'no-speech') {
          if (onError) {
            onError('no-speech', 'No speech detected. Please tap the microphone and speak clearly.');
          }
        } else if (err === 'network') {
          if (onError) {
            onError('network', 'Speech service network error. Please check your internet connection.');
          }
        } else if (err === 'language-not-supported') {
          // If Telugu is not supported by Safari/device, retry in Indian English
          if (lang.startsWith('te')) {
            console.info('Telugu speech not supported on this device/browser; retrying with Indian English');
            this.startNativeRecognition({ ...options, lang: 'en-IN' });
            return;
          }
          if (onError) {
            onError('unsupported', 'Language not supported for speech recognition on this device.');
          }
        } else {
          if (onError) {
            onError('unknown', `Speech recognition error: ${err}`);
          }
        }
      };

      recognition.onend = () => {
        if (isDelivered) return;

        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        const candidate = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (candidate) {
          deliverFinal(candidate);
        } else if (hasCapturedSpeech) {
          deliverFinal(finalTranscript || interimTranscript);
        } else {
          this.stopListening();
          if (onStateChange) onStateChange('idle');
          if (onError) onError('no-speech', 'No speech detected.');
        }
      };

      // Set max duration safeguard
      this.maxDurationTimer = setTimeout(() => {
        if (!isDelivered) {
          const candidate = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
          if (candidate) {
            deliverFinal(candidate);
          } else {
            this.stopListening();
            if (onStateChange) onStateChange('idle');
            if (onError) onError('no-speech', 'Recording time limit reached.');
          }
        }
      }, maxDurationMs || 12000);

      this.activeRecognition = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Native SpeechRecognition start error:', err);
      this.stopListening();
      if (onStateChange) onStateChange('idle');
      if (err.name === 'NotAllowedError') {
        if (onError) onError('permission-denied', 'Microphone permission blocked.');
      } else {
        if (onError) onError('unknown', err.message || 'Could not start speech recognition.');
      }
    }
  }

  /**
   * Monitor real-time volume using AudioContext when available, or smooth audio pulse
   */
  private static async startVolumeMonitoring(onVolumeChange?: (vol: number) => void) {
    if (!onVolumeChange) return;

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (stream && this.isRecording) {
          this.activeStream = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            const sourceNode = audioCtx.createMediaStreamSource(stream);
            sourceNode.connect(analyser);

            this.audioContext = audioCtx;
            this.analyserNode = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
              if (!this.isRecording || !this.analyserNode) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const volumePercent = Math.min(100, Math.round((avg / 64) * 100));
              onVolumeChange(volumePercent);
              this.volumeAnimFrame = requestAnimationFrame(updateVolume);
            };
            this.volumeAnimFrame = requestAnimationFrame(updateVolume);
            return;
          }
        }
      }
    } catch (_) {}

    // Fallback listening pulse if microphone stream is busy with Web Speech API
    let basePulse = 18;
    let direction = 1;
    const pulseLoop = () => {
      if (!this.isRecording) return;
      basePulse += direction * 2;
      if (basePulse > 40) direction = -1;
      if (basePulse < 18) direction = 1;
      onVolumeChange(basePulse);
      this.volumeAnimFrame = requestAnimationFrame(pulseLoop);
    };
    this.volumeAnimFrame = requestAnimationFrame(pulseLoop);
  }

  /**
   * Stop any active recording or speech recognition cleanly
   */
  public static stopListening() {
    this.isRecording = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (this.activeRecognition) {
      try {
        // Detach handlers before stopping so no aborted event fires
        this.activeRecognition.onresult = null;
        this.activeRecognition.onerror = null;
        this.activeRecognition.onend = null;
        this.activeRecognition.stop();
      } catch (_) {}
      this.activeRecognition = null;
    }

    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.activeStream = null;
    }

    this.cleanupAudioContext();
  }

  /**
   * Cancel and discard recording immediately without processing
   */
  public static abort() {
    this.isRecording = false;
    this.stopListening();
  }

  private static cleanupAudioContext() {
    if (this.volumeAnimFrame) {
      cancelAnimationFrame(this.volumeAnimFrame);
      this.volumeAnimFrame = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.analyserNode = null;
  }
}
