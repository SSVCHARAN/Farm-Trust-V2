/**
 * Farm Trust Universal Voice Input Service
 * 
 * Provides rock-solid speech input across all browsers:
 * 1. Chromium (Chrome, Edge, Android Chrome): Native Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * 2. Firefox, Safari & unsupported browsers: High-accuracy MediaRecorder -> Backend Speech Recognition (/api/voice/transcribe).
 * 3. Continuous accumulation (interim + final) so zero words are dropped.
 * 4. Animated waveform visual feedback.
 * 5. Distinct error classification: 'permission-denied' | 'no-speech' | 'network' | 'unsupported' | 'unknown'.
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
  private static activeMediaRecorder: MediaRecorder | null = null;
  private static activeStream: MediaStream | null = null;
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
   * Check if native Web Speech Recognition is supported (Chrome/Edge/Brave)
   */
  public static isNativeSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Check if audio capture is supported in this browser (Firefox/Safari/Opera)
   */
  public static isMediaRecorderSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  public static isSupported(): boolean {
    return this.isNativeSpeechSupported() || this.isMediaRecorderSupported();
  }

  /**
   * Start listening:
   * Uses native Web Speech API when available (Chrome/Edge), or seamlessly falls back to
   * MediaRecorder + server transcription in Firefox/Safari without user interruption.
   */
  public static async startListening(options: VoiceListenOptions): Promise<void> {
    this.stopListening();
    this.lastCapturedTranscript = '';

    const { onStateChange, onError } = options;

    if (this.isNativeSpeechSupported()) {
      this.isRecording = true;
      this.startNativeRecognition(options);
      return;
    }

    if (this.isMediaRecorderSupported()) {
      this.isRecording = true;
      this.startMediaRecorderCapture(options);
      return;
    }

    if (onStateChange) onStateChange('idle');
    if (onError) {
      onError(
        'unsupported',
        'Voice input is not supported in this browser. Please use typed input.'
      );
    }
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
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      this.startWaveformAnimation(onVolumeChange);

      recognition.onstart = () => {
        this.isRecording = true;
        if (onStateChange) onStateChange('listening');
      };

      recognition.onresult = (event: any) => {
        let fullFinal = '';
        let fullInterim = '';

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

          if (onVolumeChange) {
            const dynamicVol = Math.min(95, 45 + Math.min(50, candidate.length * 2));
            onVolumeChange(dynamicVol);
          }

          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            deliverFinal(candidate);
          }, silenceTimeoutMs);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        if (err === 'aborted') return;
        if (isDelivered) return;

        const candidate = this.lastCapturedTranscript.trim();
        if (candidate && (err === 'no-speech' || err === 'network')) {
          deliverFinal(candidate);
          return;
        }

        this.stopListening();
        if (onStateChange) onStateChange('idle');

        if (err === 'not-allowed' || err === 'permission-denied') {
          if (onError) onError('permission-denied', 'Microphone permission blocked.');
        } else if (err === 'no-speech') {
          if (onError) onError('no-speech', 'No speech detected.');
        } else if (err === 'network') {
          if (onError) onError('network', 'Speech service network error.');
        } else {
          if (onError) onError('unknown', `Speech error: ${err}`);
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
      }, maxDurationMs);

      this.activeRecognition = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Native SpeechRecognition error, attempting MediaRecorder capture:', err);
      if (this.isMediaRecorderSupported()) {
        this.startMediaRecorderCapture(options);
      } else {
        this.stopListening();
        if (onStateChange) onStateChange('idle');
        if (onError) onError('unknown', err.message || 'Could not start speech recognition.');
      }
    }
  }

  /**
   * MediaRecorder Audio Capture + Server Transcription (Firefox / Safari)
   */
  private static async startMediaRecorderCapture(options: VoiceListenOptions) {
    const {
      lang = 'te-IN',
      onInterim,
      onFinal,
      onError,
      onStateChange,
      onVolumeChange,
      maxDurationMs = 12000,
    } = options;

    try {
      if (onStateChange) onStateChange('requesting-permission');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;
      this.isRecording = true;
      if (onStateChange) onStateChange('listening');

      this.startWaveformAnimation(onVolumeChange);

      if (onInterim) {
        onInterim(lang.startsWith('te') ? 'వింటున్నాము... మాట్లాడండి' : 'Listening... Speak now');
      }

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
      this.activeMediaRecorder = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const streamTracks = stream.getTracks();
        streamTracks.forEach((track) => track.stop());

        if (chunks.length === 0) {
          if (onError) onError('no-speech', 'No speech detected.');
          if (onStateChange) onStateChange('idle');
          return;
        }

        const actualMime = recorder.mimeType || chosenMime || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: actualMime });

        if (audioBlob.size < 500) {
          if (onError) onError('no-speech', 'Recording too short.');
          if (onStateChange) onStateChange('idle');
          return;
        }

        if (onStateChange) onStateChange('processing');
        if (onInterim) {
          onInterim(lang.startsWith('te') ? 'మాట గుర్తిస్తున్నాము...' : 'Transcribing voice...');
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const response = await fetch('/api/voice/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: actualMime,
                language: lang,
              }),
            });

            const data = await response.json();
            if (response.ok && data.success && data.transcript?.trim()) {
              this.lastCapturedTranscript = data.transcript.trim();
              onFinal(data.transcript.trim());
            } else {
              if (onError) onError('no-speech', data.error || 'Could not understand voice.');
            }
          };
        } catch (postErr) {
          console.error('Transcription API request failed:', postErr);
          if (onError) onError('network', 'Failed to reach speech recognition server.');
        } finally {
          if (onStateChange) onStateChange('idle');
        }
      };

      recorder.start(250);

      this.maxDurationTimer = setTimeout(() => {
        if (this.activeMediaRecorder && this.activeMediaRecorder.state === 'recording') {
          try {
            this.activeMediaRecorder.stop();
          } catch (_) {}
        }
      }, maxDurationMs);

    } catch (err: any) {
      this.stopListening();
      if (onStateChange) onStateChange('idle');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (onError) onError('permission-denied', 'Microphone permission blocked.');
      } else {
        if (onError) onError('unknown', err.message || 'Microphone failed to start.');
      }
    }
  }

  /**
   * Smooth waveform animation while listening
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
        this.activeRecognition.onresult = null;
        this.activeRecognition.onerror = null;
        this.activeRecognition.onend = null;
        this.activeRecognition.stop();
      } catch (_) {}
      this.activeRecognition = null;
    }

    if (this.activeMediaRecorder && this.activeMediaRecorder.state === 'recording') {
      try {
        this.activeMediaRecorder.stop();
      } catch (_) {}
    }
    this.activeMediaRecorder = null;

    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.activeStream = null;
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
