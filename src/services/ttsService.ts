/**
 * Vernacular Speech Synthesis (TTS) Service for Farm Trust
 * Pure browser-native Text-To-Speech (SpeechSynthesis API)
 * - Zero paid APIs / zero API keys required
 * - Intelligent voice ranking for Indian Telugu (te-IN) and Indian English (en-IN)
 * - Robust handling of asynchronous voiceschanged lifecycle
 * - Natural conversational rates (0.92 for Telugu, 0.96 for English) & natural pitch (1.0)
 * - Phonetic text formatting for colloquial vernacular comprehension
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
  private voices: SpeechSynthesisVoice[] = [];
  private isAudioPlaying: boolean = false;
  private lastText: string = '';
  private lastLang: TTSLanguage = 'te-IN';
  private keepAliveTimer: any = null;
  private voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.ensureVoicesLoaded();
      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
      }
      window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
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
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isLoading(): boolean {
    return false;
  }

  public isSpeaking(): boolean {
    return (
      this.isAudioPlaying ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking)
    );
  }

  /**
   * Selects the highest quality natural voice for the target language.
   * Prioritizes Natural, Neural, Online, and Google voice profiles.
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

  private selectBestTeluguVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // 1. Natural / Neural Telugu voices (e.g. Google తెలుగు, Microsoft Mohan Online Natural, Microsoft Shruti Online Natural)
    const teNatural = voices.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-').startsWith('te') || v.name.toLowerCase().includes('telugu')) &&
        this.isHighQualityVoice(v.name)
    );
    if (teNatural) return teNatural;

    // 2. Exact match te-IN or te_IN
    const teExact = voices.find((v) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return l === 'te-in' || l === 'te';
    });
    if (teExact) return teExact;

    // 3. Named Telugu
    const teNamed = voices.find(
      (v) => v.name.toLowerCase().includes('telugu') || v.name.includes('తెలుగు')
    );
    if (teNamed) return teNamed;

    // 4. Any voice starting with 'te'
    const teAny = voices.find((v) => v.lang.toLowerCase().startsWith('te'));
    if (teAny) return teAny;

    // 5. Fallback: Indic natural voices (Hindi or Indian English with Natural/Google engine)
    // Avoids falling back to an American English voice that destroys Telugu comprehension
    const indicNatural = voices.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-').startsWith('hi') ||
          v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
          v.name.toLowerCase().includes('india')) &&
        this.isHighQualityVoice(v.name)
    );
    if (indicNatural) return indicNatural;

    const indicAny = voices.find(
      (v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('hi') ||
        v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
        v.name.toLowerCase().includes('india')
    );
    if (indicAny) return indicAny;

    return null;
  }

  private selectBestIndianEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // 1. Natural / Neural Indian English voices (e.g. Google Indian English, Microsoft Neerja Online Natural)
    const enInNatural = voices.find(
      (v) =>
        (v.lang.toLowerCase().replace('_', '-') === 'en-in' || v.name.toLowerCase().includes('india')) &&
        this.isHighQualityVoice(v.name)
    );
    if (enInNatural) return enInNatural;

    // 2. Exact match en-IN or contains 'India' in voice name
    const enInExact = voices.find((v) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return l === 'en-in' || v.name.toLowerCase().includes('india');
    });
    if (enInExact) return enInExact;

    // 3. Any English voice with Natural / Neural quality
    const enNatural = voices.find(
      (v) => v.lang.toLowerCase().startsWith('en') && this.isHighQualityVoice(v.name)
    );
    if (enNatural) return enNatural;

    // 4. Any English voice
    const enAny = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (enAny) return enAny;

    return null;
  }

  /**
   * Speaks the provided text using natural browser SpeechSynthesis.
   * Rate: 0.92 for Telugu (clear syllable delivery), 0.96 for English (conversational Indian cadence).
   * Pitch: 1.0 (natural conversational human pitch).
   */
  public async speak(text: string, lang: TTSLanguage = 'te-IN', options?: TTSOptions): Promise<void> {
    if (!text || typeof window === 'undefined') return;

    // Stop ongoing audio or speech
    this.stop();

    const cleanText = formatVernacularSpeech(text, lang);
    if (!cleanText) return;

    this.lastText = text;
    this.lastLang = lang;

    if (!('speechSynthesis' in window)) {
      options?.onError?.(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    // Await asynchronous voice resolution before creating utterance
    await this.ensureVoicesLoaded();

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Natural conversational rates (avoiding robotic, overly fast, or dragging delivery)
      utterance.rate = options?.rate ?? (lang === 'te-IN' ? 0.92 : 0.96);
      utterance.pitch = options?.pitch ?? 1.0;

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
        if (voice.lang) {
          utterance.lang = voice.lang;
        } else {
          utterance.lang = lang;
        }
      } else {
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
        // Don't flag deliberate interruptions/cancellations as errors
        if ((e as any).error !== 'canceled' && (e as any).error !== 'interrupted') {
          options?.onError?.(e);
        }
      };

      // Retain reference on window object to prevent Chrome V8 garbage collection
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
    this.stopKeepAlive();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      this.currentUtterance = null;
    }

    this.isAudioPlaying = false;
  }

  public replay(options?: TTSOptions): void {
    if (this.lastText) {
      this.speak(this.lastText, this.lastLang, options);
    }
  }
}

export const TTSService = new VernacularTTSService();
