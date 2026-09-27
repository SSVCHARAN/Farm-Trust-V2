/**
 * Farm Trust Universal Voice Input Service
 * 
 * Provides rock-solid, client-side speech input:
 * 1. Native Web Speech API (SpeechRecognition / webkitSpeechRecognition) without microphone hardware conflicts.
 * 2. Full-sentence continuous accumulation (interim + final) so zero words are dropped.
 * 3. Immediate fallback delivery: if user clicks "Done Speaking", current buffer processes instantly.
 * 4. Distinct error classification: 'permission-denied' | 'no-speech' | 'network' | 'unsupported' | 'unknown'.
 * 5. Animated waveform visual feedback without locking audio hardware.
 */

export interface VoiceListenOptions {
  lang: string; // e.g. 'te-IN' or 'en-IN'
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (errorCode: 'permission-denied' | 'no-speech' | 'network' | 'unsupported' | 'unknown', message?: string) => void;
  onStateChange?: (state: 'idle' | 'requesting-permission' | 'listening' | 'processing') => void;
  onVolumeChange?: (volumePercent: number) => void; // 0 to 100
  silenceTimeoutMs?: number; // default 1500ms
  maxDurationMs?: number; // default 12000ms
}

export class UniversalVoiceInput {
  private static activeRecognition: any = null;
  private static volumeAnimFrame: number | null = null;
  private static silenceTimer: any = null;
  private static maxDurationTimer: any = null;
  private static isRecording = false;
  private static lastCapturedTranscript = '';

  /**
   * Returns whatever has been captured so far in the current session
   */
  public static getCurrentTranscript(): string {
    return this.lastCapturedTranscript;
  }

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
    return this.isNativeSpeechSupported();
  }

  /**
   * Start listening using the native Web Speech API
   */
  public static async startListening(options: VoiceListenOptions): Promise<void> {
    this.stopListening();
    this.lastCapturedTranscript = '';

    const { onStateChange, onError } = options;

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

    let isDelivered = false;

    // Helper to safely deliver recognized text once
    const deliverFinal = (text: string) => {
      if (isDelivered) return;
      isDelivered = true;
      const clean = text.trim();
      this.stopListening();
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
      // continuous = true allows fluid speaking without premature termination on small pauses
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Start waveform animation pulse (without locking hardware microphone)
      this.startWaveformAnimation(onVolumeChange);

      recognition.onstart = () => {
        this.isRecording = true;
        if (onStateChange) onStateChange('listening');
      };

      recognition.onresult = (event: any) => {
        let fullFinal = '';
        let fullInterim = '';

        // Accumulate from start of session so no interim or previous words are lost
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const part = res[0]?.transcript || '';
          if (res.isFinal) {
            fullFinal += (fullFinal ? ' ' : '') + part.trim();
          } else {
            fullInterim += (fullInterim ? ' ' : '') + part.trim();
          }
        }

        const candidate = (fullFinal + (fullInterim ? ' ' + fullInterim : '')).trim();
        if (candidate) {
          this.lastCapturedTranscript = candidate;
          if (onInterim) onInterim(candidate);

          // Elevate volume visualizer when voice is detected
          if (onVolumeChange) {
            const dynamicVol = Math.min(95, 45 + Math.min(50, candidate.length * 2));
            onVolumeChange(dynamicVol);
          }

          if (this.silenceTimer) clearTimeout(this.silenceTimer);

          // Auto finish after user stops speaking for silenceTimeoutMs
          this.silenceTimer = setTimeout(() => {
            deliverFinal(candidate);
          }, silenceTimeoutMs || 1500);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn('SpeechRecognition error:', err);

        if (err === 'aborted') {
          // Normal manual stop or restart; do nothing
          return;
        }

        if (isDelivered) return;

        // If speech was already recognized, treat as successful completion rather than failing
        const candidate = this.lastCapturedTranscript.trim();
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
          // If Telugu is not supported by Safari/device, retry with Indian English
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

        const candidate = this.lastCapturedTranscript.trim();
        if (candidate) {
          deliverFinal(candidate);
        } else {
          this.stopListening();
          if (onStateChange) onStateChange('idle');
          if (onError) onError('no-speech', 'No speech detected.');
        }
      };

      // Set max duration safeguard (12 seconds)
      this.maxDurationTimer = setTimeout(() => {
        if (!isDelivered) {
          const candidate = this.lastCapturedTranscript.trim();
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
   * Smooth waveform animation while listening (zero hardware locks)
   */
  private static startWaveformAnimation(onVolumeChange?: (vol: number) => void) {
    if (!onVolumeChange) return;

    let basePulse = 20;
    let direction = 1;
    const pulseLoop = () => {
      if (!this.isRecording) return;
      basePulse += direction * 2.5;
      if (basePulse > 48) direction = -1;
      if (basePulse < 18) direction = 1;
      onVolumeChange(Math.round(basePulse));
      this.volumeAnimFrame = requestAnimationFrame(pulseLoop);
    };
    this.volumeAnimFrame = requestAnimationFrame(pulseLoop);
  }

  /**
   * Stop any active speech recognition cleanly
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

    if (this.volumeAnimFrame) {
      cancelAnimationFrame(this.volumeAnimFrame);
      this.volumeAnimFrame = null;
    }
  }

  /**
   * Cancel and discard recording immediately without processing
   */
  public static abort() {
    this.lastCapturedTranscript = '';
    this.stopListening();
  }
}
