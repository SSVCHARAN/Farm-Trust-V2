/**
 * Vernacular Speech Synthesis (TTS) Service for Farm Trust
 * 
 * Multi-Tier Natural Human Speech Architecture:
 * 1. Tier 1 (Primary): High-Fidelity Neural AI Voice via Backend (/api/tts/speak)
 *    - Telugu: te-IN-ShrutiNeural (warm, natural, authentic female Indian Telugu)
 *    - English: en-IN-NeerjaExpressiveNeural (natural, clear, warm Indian English)
 *    - Zero paid API keys required; pre-cached on server for instantaneous response.
 *    - Played via native HTMLAudioElement for true human voice fidelity.
 * 
 * 2. Tier 2 (Offline / Network Fallback): Intelligent Browser SpeechSynthesis
 *    - Automatic ranking of natural / neural browser voices.
 *    - Explicitly avoids robotic/mechanical fallback voices (e.g. espeak).
 *    - Conversational rate & pitch calibration for maximum clarity.
 */

export type TTSLanguage = 'te-IN' | 'en-IN';
export type TTSContext = 'confirmation' | 'order' | 'inventory' | 'price' | 'sales' | 'error' | 'guidance';

export interface TTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onLoading?: (isLoading: boolean) => void;
  rate?: number;
  pitch?: number;
  voiceGender?: 'female' | 'male';
  context?: TTSContext;
}

/**
 * Normalizes numbers, currency symbols, and jargon into natural conversational words.
 * Prevents the synthesizer from reading punctuation marks, hashtags, or raw currency symbols.
 */
export function formatVernacularSpeech(text: string, lang: TTSLanguage): string {
  if (!text) return '';

  if (lang === 'te-IN') {
    return text
      // Order IDs: #FT-1024 or FT-1024 -> "ఆర్డర్ 1024"
      .replace(/#?\s*FT-(\d+)/gi, 'ఆర్డర్ $1')
      // Currency + rate: ₹ 35 / kg -> "కిలోకి 35 రూపాయలు"
      .replace(/₹\s*(\d+)\s*\/\s*(?:kg|కిలో|కేజీ)/gi, 'కిలోకి $1 రూపాయలు')
      // Currency alone: ₹ 35 -> "35 రూపాయలు"
      .replace(/₹\s*(\d+)/g, '$1 రూపాయలు')
      // Quantities: 5 kg -> "5 కిలోలు"
      .replace(/(\d+)\s*(?:kg|కిలోలు|కేజీలు)/gi, '$1 కిలోలు')
      .replace(/(\d+)\s*(?:liters|లీటర్లు)/gi, '$1 లీటర్లు')
      // Clean up symbols that cause robotic speech
      .replace(/[*#_~`\[\]()""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    return text
      // Order IDs: #FT-1024 -> "Order 1024"
      .replace(/#?\s*FT-(\d+)/gi, 'Order $1')
      // Currency + rate: ₹ 35 / kg -> "35 rupees per kg"
      .replace(/₹\s*(\d+)\s*\/\s*(?:kg|kilogram)/gi, '$1 rupees per kg')
      // Currency alone: ₹ 35 -> "35 rupees"
      .replace(/₹\s*(\d+)/g, '$1 rupees')
      // Quantities: 5 kg -> "5 kg"
      .replace(/(\d+)\s*kg\b/gi, '$1 kg')
      .replace(/(\d+)\s*liters?\b/gi, '$1 liters')
      // Clean up symbols
      .replace(/[*#_~`\[\]()""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

class VernacularTTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private activeAbortController: AbortController | null = null;
  private memoryCache: Map<string, string> = new Map();
  private voices: SpeechSynthesisVoice[] = [];
  private isAudioPlaying: boolean = false;
  private isAudioLoading: boolean = false;
  private lastText: string = '';
  private lastLang: TTSLanguage = 'te-IN';
  private lastAudioUrl: string | null = null;
  private keepAliveTimer: any = null;
  private voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-seed static cache manifest for instant neural playback without server dependencies
      this.loadStaticManifest();

      if ('speechSynthesis' in window) {
        this.ensureVoicesLoaded();
        if (window.speechSynthesis.addEventListener) {
          window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
        }
        window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
      }
    }
  }

  private async loadStaticManifest(): Promise<void> {
    try {
      const res = await fetch('/audio/cache/manifest.json');
      if (res.ok) {
        const manifest = await res.json();
        for (const item of Object.values(manifest as Record<string, any>)) {
          if (item.text && item.url && item.lang) {
            const clean = formatVernacularSpeech(item.text, item.lang as TTSLanguage);
            this.memoryCache.set(`${item.lang}:female:${clean.toLowerCase()}`, item.url);
            this.memoryCache.set(`${item.lang}:male:${clean.toLowerCase()}`, item.url);
            this.memoryCache.set(`${item.lang}:female:${item.text.toLowerCase().trim()}`, item.url);
            this.memoryCache.set(`${item.lang}:male:${item.text.toLowerCase().trim()}`, item.url);
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Mobile Chrome Autoplay Policy unlocker.
   * Called synchronously on user touch / click (e.g. tapping the mic or a button).
   * Unlocks both HTMLAudioElement and SpeechSynthesis so subsequent async speech works seamlessly.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;

    // 1. Silent HTMLAudioElement prime
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0.01;
      silentAudio.play().then(() => {
        silentAudio.pause();
      }).catch(() => {});
    } catch (_) {}

    // 2. Prime SpeechSynthesis on mobile Chrome
    if ('speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0.01;
        window.speechSynthesis.speak(u);
      } catch (_) {}
    }
  }

  private refreshVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
      }
    }
  }

  /**
   * Safely awaits asynchronous voice population across Chrome, Edge, Safari, and Firefox.
   */
  public async ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices && currentVoices.length > 0) {
      this.voices = currentVoices;
      return currentVoices;
    }

    if (this.voicesLoadedPromise) {
      return this.voicesLoadedPromise;
    }

    this.voicesLoadedPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let resolved = false;

      const onVoicesReady = () => {
        if (resolved) return;
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          resolved = true;
          this.voices = v;
          resolve(v);
        }
      };

      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesReady, { once: true });
      }
      window.speechSynthesis.onvoiceschanged = onVoicesReady;

      // Fallback timeout in case voiceschanged already fired or is not implemented
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.voices = window.speechSynthesis.getVoices() || [];
          resolve(this.voices);
        }
      }, 350);
    });

    return this.voicesLoadedPromise;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  public isLoading(): boolean {
    return this.isAudioLoading;
  }

  public isSpeaking(): boolean {
    return (
      this.isAudioPlaying ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking)
    );
  }

  /**
   * Selects the highest quality natural voice for the target language.
   * Prioritizes Natural, Neural, Online, and Google voice profiles; avoids robotic espeak.
   */
  public getBestVoice(lang: TTSLanguage): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }

    if (!this.voices || this.voices.length === 0) {
      return null;
    }

    if (lang === 'te-IN') {
      return this.selectBestTeluguVoice(this.voices);
    } else {
      return this.selectBestIndianEnglishVoice(this.voices);
    }
  }

  private isHighQualityVoice(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes('natural') ||
      lower.includes('online') ||
      lower.includes('neural') ||
      lower.includes('google') ||
      lower.includes('expressive')
    );
  }

  private isRoboticVoice(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.includes('espeak') || lower.includes('klatt') || lower.includes('whisper');
  }

  private selectBestTeluguVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Filter out robotic voices if higher quality alternatives exist
    const nonRobotic = voices.filter((v) => !this.isRoboticVoice(v.name));
    const pool = nonRobotic.length > 0 ? nonRobotic : voices;

    // 1. Natural / Neural Telugu voices
    const teNatural = pool.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-').startsWith('te') || v.name.toLowerCase().includes('telugu')) &&
        this.isHighQualityVoice(v.name)
    );
    if (teNatural) return teNatural;

    // 2. Exact match te-IN or te_IN
    const teExact = pool.find((v) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return l === 'te-in' || l === 'te';
    });
    if (teExact) return teExact;

    // 3. Named Telugu
    const teNamed = pool.find(
      (v) => v.name.toLowerCase().includes('telugu') || v.name.includes('తెలుగు')
    );
    if (teNamed) return teNamed;

    // 4. Any voice starting with 'te'
    const teAny = pool.find((v) => v.lang.toLowerCase().startsWith('te'));
    if (teAny) return teAny;

    // 5. Fallback: Indic natural voices (Hindi or Indian English with Natural/Google engine)
    const indicNatural = pool.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-').startsWith('hi') ||
          v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
          v.name.toLowerCase().includes('india')) &&
        this.isHighQualityVoice(v.name)
    );
    if (indicNatural) return indicNatural;

    const indicAny = pool.find(
      (v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('hi') ||
        v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
        v.name.toLowerCase().includes('india')
    );
    if (indicAny) return indicAny;

    return null;
  }

  private selectBestIndianEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const nonRobotic = voices.filter((v) => !this.isRoboticVoice(v.name));
    const pool = nonRobotic.length > 0 ? nonRobotic : voices;

    // 1. Natural / Neural Indian English voices
    const enInNatural = pool.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-') === 'en-in' || v.name.toLowerCase().includes('india')) &&
        this.isHighQualityVoice(v.name)
    );
    if (enInNatural) return enInNatural;

    // 2. Exact match en-IN or contains 'India' in voice name
    const enInExact = pool.find((v) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return l === 'en-in' || v.name.toLowerCase().includes('india');
    });
    if (enInExact) return enInExact;

    // 3. Any English Natural voice
    const enNatural = pool.find(
      (v) => v.lang.toLowerCase().startsWith('en') && this.isHighQualityVoice(v.name)
    );
    if (enNatural) return enNatural;

    return pool.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
  }

  /**
   * Primary Speech Invocation:
   * First attempts server-side neural speech (/api/tts/speak) which provides human studio-quality audio.
   * If offline or server unavailable, falls back to the browser's speech synthesis engine.
   */
  public async speak(text: string, lang: TTSLanguage = 'te-IN', options?: TTSOptions): Promise<void> {
    if (!text || typeof window === 'undefined') return;

    // Stop ongoing audio or speech
    this.stop();

    const cleanText = formatVernacularSpeech(text, lang);
    if (!cleanText) return;

    this.lastText = text;
    this.lastLang = lang;

    const cacheKey = `${lang}:${options?.voiceGender || 'female'}:${cleanText.toLowerCase()}`;
    const cachedUrl = this.memoryCache.get(cacheKey);

    if (cachedUrl) {
      this.playAudioFile(cachedUrl, options, cleanText, lang);
      return;
    }

    // ─── TIER 1: Natural Neural Voice via Backend API ───
    this.isAudioLoading = true;
    options?.onLoading?.(true);

    const controller = new AbortController();
    this.activeAbortController = controller;

    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          language: lang,
          voiceGender: options?.voiceGender || 'female',
          context: options?.context,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.audioUrl) {
          this.memoryCache.set(cacheKey, data.audioUrl);
          this.isAudioLoading = false;
          options?.onLoading?.(false);
          this.playAudioFile(data.audioUrl, options, cleanText, lang);
          return;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User deliberately cancelled or requested another audio
        return;
      }
      console.warn('Backend neural TTS call failed, falling back to browser synthesis:', err);
    } finally {
      this.isAudioLoading = false;
      options?.onLoading?.(false);
    }

    // ─── TIER 2: Browser SpeechSynthesis Fallback ───
    this.speakBrowserFallback(cleanText, lang, options);
  }

  private playAudioFile(url: string, options?: TTSOptions, fallbackText?: string, lang?: TTSLanguage): void {
    try {
      this.lastAudioUrl = url;
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isAudioPlaying = true;
        options?.onStart?.();
      };

      audio.onended = () => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        options?.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('Audio file playback failed, falling back to browser synthesis:', e);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        if (fallbackText && lang) {
          this.speakBrowserFallback(fallbackText, lang, options);
        } else {
          options?.onError?.(e);
        }
      };

      audio.play().catch((playErr) => {
        console.warn('Audio play() interrupted or rejected:', playErr);
        if (fallbackText && lang) {
          this.speakBrowserFallback(fallbackText, lang, options);
        } else {
          options?.onError?.(playErr);
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Audio element:', err);
      if (fallbackText && lang) {
        this.speakBrowserFallback(fallbackText, lang, options);
      } else {
        options?.onError?.(err);
      }
    }
  }

  private async speakBrowserFallback(cleanText: string, lang: TTSLanguage, options?: TTSOptions): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onError?.(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    await this.ensureVoicesLoaded();

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options?.rate ?? (lang === 'te-IN' ? 0.92 : 0.96);
      utterance.pitch = options?.pitch ?? 1.0;

      const voice = this.getBestVoice(lang);
      if (voice) {
        // Guard: Never pass Telugu unicode text to a non-Telugu browser voice (avoids robotic metallic pipes)
        const isTe = lang.startsWith('te');
        const voiceIsTelugu =
          voice.lang.toLowerCase().startsWith('te') || voice.name.toLowerCase().includes('telugu');
        if (isTe && !voiceIsTelugu) {
          console.warn('No genuine Telugu browser voice installed; avoiding metallic pipe audio distortion.');
          options?.onEnd?.();
          return;
        }
        utterance.voice = voice;
        utterance.lang = voice.lang || lang;
      } else {
        if (lang.startsWith('te')) {
          console.warn('No Telugu voice found in browser voices; avoiding robotic pipe fallback.');
          options?.onEnd?.();
          return;
        }
        utterance.lang = lang;
      }

      utterance.onstart = () => {
        this.isAudioPlaying = true;
        this.startKeepAlive();
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.isAudioPlaying = false;
        this.stopKeepAlive();
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isAudioPlaying = false;
        this.stopKeepAlive();
        this.currentUtterance = null;
        if ((e as any).error !== 'canceled' && (e as any).error !== 'interrupted') {
          options?.onError?.(e);
        }
      };

      (window as any).__farmTrustUtterance = utterance;
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isAudioPlaying = false;
      this.stopKeepAlive();
      console.warn('Browser TTS speech error:', err);
      options?.onError?.(err);
    }
  }

  // Workaround for Chrome SpeechSynthesis 14s audio pause bug
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch((err) => console.warn('Audio resume error:', err));
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }

    this.stopKeepAlive();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      this.currentUtterance = null;
    }

    this.isAudioPlaying = false;
    this.isAudioLoading = false;
  }

  public replay(options?: TTSOptions): void {
    if (this.lastAudioUrl) {
      this.playAudioFile(this.lastAudioUrl, options, this.lastText, this.lastLang);
    } else if (this.lastText) {
      this.speak(this.lastText, this.lastLang, options);
    }
  }
}

export const TTSService = new VernacularTTSService();
