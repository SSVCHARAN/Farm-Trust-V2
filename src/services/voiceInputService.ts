/**
 * Farm Trust Universal Voice Input Service
 * 
 * Provides seamless cross-browser speech input:
 * 1. Primary: Native Web Speech API (webkitSpeechRecognition) where available (Chrome, Edge, Safari).
 * 2. Fallback: Universal MediaRecorder + Server Transcription (/api/voice/transcribe) for Firefox, Linux, etc.
 * 3. Real-time AudioContext AnalyserNode for live visual waveform feedback.
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
  private static activeMediaRecorder: MediaRecorder | null = null;
  private static activeStream: MediaStream | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static volumeAnimFrame: number | null = null;
  private static silenceTimer: any = null;
  private static maxDurationTimer: any = null;
  private static speechDetected = false;
  private static isRecording = false;

  /**
   * Check if native Web Speech Recognition is supported
   */
  public static isNativeSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Check if MediaRecorder audio capture is supported (Firefox, Safari, Chrome, etc.)
   */
  public static isMediaRecorderSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Start listening using the best available technology
   */
  public static async startListening(options: VoiceListenOptions): Promise<void> {
    this.stopListening();

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

    this.speechDetected = false;
    this.isRecording = true;

    // Check if native Web Speech API is available AND not desktop Firefox
    // Note: Firefox has experimental SpeechRecognition that requires cloud credentials and fails
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
    const nativeAvailable = this.isNativeSpeechSupported() && !isFirefox;

    if (nativeAvailable) {
      this.startNativeRecognition(options);
    } else if (this.isMediaRecorderSupported()) {
      await this.startMediaRecorderInput(options);
    } else {
      if (onStateChange) onStateChange('idle');
      if (onError) {
        onError('unsupported', 'Voice recording is not supported in this browser environment.');
      }
    }
  }

  /**
   * Path 1: Native Web Speech Recognition (Chrome/Edge/Safari)
   */
  private static startNativeRecognition(options: VoiceListenOptions) {
    const { lang, onInterim, onFinal, onError, onStateChange } = options;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (onStateChange) onStateChange('listening');
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const part = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += part;
          } else {
            interimText += part;
          }
        }

        const candidate = (finalText || interimText).trim();
        if (candidate) {
          if (onInterim) onInterim(candidate);

          if (this.silenceTimer) clearTimeout(this.silenceTimer);

          if (finalText) {
            this.stopListening();
            if (onStateChange) onStateChange('processing');
            onFinal(finalText.trim());
          } else {
            // Auto finish on pause
            this.silenceTimer = setTimeout(() => {
              this.stopListening();
              if (onStateChange) onStateChange('processing');
              onFinal(candidate);
            }, options.silenceTimeoutMs || 1400);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Native speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          if (onError) onError('permission-denied', 'Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          if (onError) onError('no-speech', 'No speech detected.');
        } else {
          // If native recognition fails due to network or service error, try media recorder fallback
          console.info('Switching to MediaRecorder fallback due to native recognition error');
          this.startMediaRecorderInput(options);
        }
      };

      recognition.onend = () => {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
      };

      this.activeRecognition = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Native SpeechRecognition init failed, using MediaRecorder fallback:', err);
      this.startMediaRecorderInput(options);
    }
  }

  /**
   * Path 2: Universal MediaRecorder + Server Transcription (Firefox / Linux / Mobile Fallback)
   */
  private static async startMediaRecorderInput(options: VoiceListenOptions): Promise<void> {
    const { lang, onInterim, onFinal, onError, onStateChange, onVolumeChange, silenceTimeoutMs = 1500, maxDurationMs = 12000 } = options;

    if (onStateChange) onStateChange('requesting-permission');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      console.warn('getUserMedia permission error:', err);
      if (onStateChange) onStateChange('idle');
      if (onError) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          onError('permission-denied', 'Microphone permission blocked. Please enable microphone access in your browser.');
        } else {
          onError('unknown', err.message || 'Could not access microphone.');
        }
      }
      return;
    }

    this.activeStream = stream;
    if (onStateChange) onStateChange('listening');

    // Setup AudioContext for real-time waveform volume visualization and silence detection
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        this.audioContext = audioCtx;
        this.analyserNode = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let consecutiveSilenceFrames = 0;

        const updateVolume = () => {
          if (!this.isRecording || !this.analyserNode) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const volumePercent = Math.min(100, Math.round((avg / 128) * 100));

          if (onVolumeChange) {
            onVolumeChange(volumePercent);
          }

          // Silence detection
          if (avg > 15) {
            this.speechDetected = true;
            consecutiveSilenceFrames = 0;
          } else if (this.speechDetected) {
            consecutiveSilenceFrames++;
            // At ~60fps, 90 frames is ~1.5 seconds of silence
            const framesThreshold = Math.round((silenceTimeoutMs / 1000) * 60);
            if (consecutiveSilenceFrames > framesThreshold) {
              this.stopAndTranscribe(lang, onStateChange, onFinal, onError);
              return;
            }
          }

          this.volumeAnimFrame = requestAnimationFrame(updateVolume);
        };

        this.volumeAnimFrame = requestAnimationFrame(updateVolume);
      }
    } catch (e) {
      console.warn('AudioContext volume monitoring unavailable:', e);
    }

    // Determine supported MIME type
    let mimeType = 'audio/webm';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }

    const recordedChunks: Blob[] = [];
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.activeMediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        this.cleanupAudioContext();
        if (recordedChunks.length === 0) {
          if (onError) onError('no-speech', 'No audio recorded.');
          if (onStateChange) onStateChange('idle');
          return;
        }

        const audioBlob = new Blob(recordedChunks, { type: mimeType });
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
          const base64Audio = await this.blobToBase64(audioBlob);
          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType,
              language: lang,
            }),
          });

          const data = await response.json();
          if (response.ok && data.success && data.transcript?.trim()) {
            onFinal(data.transcript.trim());
          } else {
            console.warn('Transcription failed or empty:', data);
            if (onError) onError('no-speech', data.error || 'Could not understand voice.');
            if (onStateChange) onStateChange('idle');
          }
        } catch (postErr: any) {
          console.error('Failed to send audio for transcription:', postErr);
          if (onError) onError('network', 'Failed to reach speech transcription server.');
          if (onStateChange) onStateChange('idle');
        }
      };

      // Collect data every 250ms
      mediaRecorder.start(250);

      // Max recording duration safeguard
      this.maxDurationTimer = setTimeout(() => {
        this.stopAndTranscribe(lang, onStateChange, onFinal, onError);
      }, maxDurationMs);

    } catch (err: any) {
      console.error('MediaRecorder initialization error:', err);
      this.stopListening();
      if (onError) onError('unknown', err.message || 'MediaRecorder failed to initialize');
      if (onStateChange) onStateChange('idle');
    }
  }

  private static stopAndTranscribe(
    _lang: string,
    onStateChange?: (state: any) => void,
    _onFinal?: (text: string) => void,
    _onError?: (err: any, msg?: string) => void
  ) {
    if (this.activeMediaRecorder && this.activeMediaRecorder.state === 'recording') {
      if (onStateChange) onStateChange('processing');
      try {
        this.activeMediaRecorder.stop();
      } catch (_) {}
    }
  }

  /**
   * Stop any active recording or speech recognition
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
      this.activeStream.getTracks().forEach((track) => track.stop());
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

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // strip data:audio/*;base64, prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
