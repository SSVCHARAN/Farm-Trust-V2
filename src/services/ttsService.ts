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
  fallbackText?: string;
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
  private manifestPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-seed static cache manifest for instant neural playback without server dependencies
      this.manifestPromise = this.loadStaticManifest();

      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.addEventListener) {
          window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
        } else {
          window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
        }
        this.ensureVoicesLoaded();
      }
    }
  }

  private async loadStaticManifest(): Promise<void> {
    try {
      const res = await fetch('/audio/cache/manifest.json');
      if (res.ok) {
        const manifest = await res.json();
        for (const item of Object.values(manifest as Record<string, any>)) {
          if (item.url && item.lang) {
            const clean1 = formatVernacularSpeech(item.text, item.lang as TTSLanguage).toLowerCase().trim();
            const clean2 = (item.cleaned || '').toLowerCase().trim();
            const raw = (item.text || '').toLowerCase().trim();

            for (const c of [clean1, clean2, raw]) {
              if (c) {
                this.memoryCache.set(`${item.lang}:${c}`, item.url);
                this.memoryCache.set(`${item.lang}:female:${c}`, item.url);
                this.memoryCache.set(`${item.lang}:male:${c}`, item.url);
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  private findFuzzyStaticAudio(cleanText: string, lang: TTSLanguage): string | null {
    const target = cleanText.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');
    if (!target || target.length < 5) return null;

    const extractNumbers = (str: string): number[] => {
      const matches = str.match(/\d+/g) || [];
      return matches.map(Number).sort((a, b) => a - b);
    };

    const targetNumbers = extractNumbers(cleanText);

    const extractProduce = (str: string): string => {
      const lower = str.toLowerCase();
      if (lower.includes('tomato') || lower.includes('టమాటా')) return 'tomato';
      if (lower.includes('onion') || lower.includes('ఉల్లి')) return 'onion';
      if (lower.includes('rice') || lower.includes('బియ్యం') || lower.includes('వరి')) return 'rice';
      if (lower.includes('chilli') || lower.includes('chili') || lower.includes('మిరప') || lower.includes('మిర్చి')) return 'chilli';
      if (lower.includes('mango') || lower.includes('మామిడి')) return 'mango';
      if (lower.includes('milk') || lower.includes('పాలు')) return 'milk';
      if (lower.includes('ghee') || lower.includes('నెయ్యి')) return 'ghee';
      if (lower.includes('okra') || lower.includes('బెండ')) return 'okra';
      if (lower.includes('potato') || lower.includes('బంగాళాదుంప')) return 'potato';
      return '';
    };

    const targetProduce = extractProduce(cleanText);

    // 1. Direct normalized match or containment (with strict number and produce checks)
    for (const [key, url] of this.memoryCache.entries()) {
      if (key.startsWith(lang)) {
        const textPart = key.split(':').pop() || '';
        const candidateNumbers = extractNumbers(textPart);

        // NUMBERS MUST MATCH: If target specifies numbers (e.g. 67, 100), candidate MUST have the exact same numbers
        if (targetNumbers.length > 0 || candidateNumbers.length > 0) {
          if (targetNumbers.length !== candidateNumbers.length) continue;
          if (!targetNumbers.every((val, idx) => val === candidateNumbers[idx])) continue;
        }

        // PRODUCE MUST MATCH: If target specifies a crop, candidate MUST match that crop
        if (targetProduce && extractProduce(textPart) !== targetProduce) continue;

        const normalized = textPart.replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');
        if (normalized === target || (normalized.length > 8 && (normalized.includes(target) || target.includes(normalized)))) {
          return url;
        }
      }
    }

    // 2. Token overlap similarity for phrases with slight wording differences
    const targetTokens = new Set(
      cleanText
        .toLowerCase()
        .replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2)
    );
    if (targetTokens.size < 2) return null;

    let bestUrl: string | null = null;
    let highestScore = 0;

    for (const [key, url] of this.memoryCache.entries()) {
      if (key.startsWith(lang)) {
        const textPart = key.split(':').pop() || '';
        const candidateNumbers = extractNumbers(textPart);

        // NUMBERS MUST MATCH: Never play audio with wrong prices or quantities
        if (targetNumbers.length > 0 || candidateNumbers.length > 0) {
          if (targetNumbers.length !== candidateNumbers.length) continue;
          if (!targetNumbers.every((val, idx) => val === candidateNumbers[idx])) continue;
        }

        // PRODUCE MUST MATCH: Never play tomato audio for onions
        if (targetProduce && extractProduce(textPart) !== targetProduce) continue;

        const candidateTokens = textPart
          .toLowerCase()
          .replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 2);

        if (candidateTokens.length < 2) continue;

        let intersectionCount = 0;
        for (const token of candidateTokens) {
          if (targetTokens.has(token)) {
            intersectionCount++;
          }
        }

        const score = intersectionCount / Math.max(targetTokens.size, candidateTokens.length);
        if (score > 0.6 && score > highestScore) {
          highestScore = score;
          bestUrl = url;
        }
      }
    }

    return bestUrl;
  }

  /**
   * Mobile Chrome/Safari Autoplay Policy unlocker.
   * MUST be called synchronously inside a user gesture handler (click/tap).
   * Creates and resumes an AudioContext — once resumed from a gesture, the
   * browser grants permanent audio unlock for this page session, meaning ALL
   * subsequent Audio.play() calls (even after async gaps) will succeed.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;

    // Create or resume the AudioContext — this is the correct, lasting unlock
    try {
      if (!(window as any).__farmTrustAudioCtx) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          (window as any).__farmTrustAudioCtx = ctx;
          // Play a zero-duration silent buffer to fully activate it
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          ctx.resume().catch(() => {});
        }
      } else {
        const ctx = (window as any).__farmTrustAudioCtx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    // Also play a silent Audio element to unlock the HTMLAudioElement track
    try {
      const s = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      s.volume = 0;
      s.play().catch(() => {});
    } catch (_) {}
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

    if (this.voices.length > 0) {
      return this.voices;
    }

    if (this.voicesLoadedPromise) {
      return this.voicesLoadedPromise;
    }

    this.voicesLoadedPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let resolved = false;

      const finish = (v: SpeechSynthesisVoice[]) => {
        if (resolved) return;
        resolved = true;
        this.voicesLoadedPromise = null;
        if (v && v.length > 0) {
          this.voices = v;
        }
        resolve(this.voices);
      };

      const onVoicesReady = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          finish(v);
        }
      };

      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesReady, { once: true });
      }

      // Fallback timeout in case voiceschanged already fired or is slow
      setTimeout(() => {
        finish(window.speechSynthesis.getVoices() || []);
      }, 500);
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
    // Only block actual mechanical / robotic synthesizers (espeak, klatt, mbrola)
    return (
      lower.includes('espeak') ||
      lower.includes('klatt') ||
      lower.includes('whisper') ||
      lower.includes('mbrola') ||
      lower.includes('festival') ||
      lower.includes('flite') ||
      lower.includes('pico') ||
      lower.includes('epos')
    );
  }

  private selectBestTeluguVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
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

    // NEVER return Hindi for Telugu. Return null so it never attempts to read Telugu with a Hindi voice.
    return null;
  }

  private selectBestIndianEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const nonRobotic = voices.filter((v) => !this.isRoboticVoice(v.name));
    const pool = nonRobotic.length > 0 ? nonRobotic : voices;

    // 1. Indian English voice (e.g. Google English India, en-IN)
    const enIn = pool.find(
      (v) =>
        v.lang.toLowerCase().replace('_', '-') === 'en-in' ||
        (v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india'))
    );
    if (enIn) return enIn;

    // 2. Google English natural voices on Mobile Chrome (clear, warm, non-robotic)
    const googleEn = pool.find(
      (v) => v.name.toLowerCase().includes('google') && v.lang.toLowerCase().startsWith('en')
    );
    if (googleEn) return googleEn;

    // 3. Natural / Neural / Online English voices
    const enNatural = pool.find(
      (v) => v.lang.toLowerCase().startsWith('en') && this.isHighQualityVoice(v.name)
    );
    if (enNatural) return enNatural;

    // 4. Any English voice
    return pool.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
  }

  /**
   * Safety converter: If Telugu speech is attempted on a device lacking Telugu TTS voices,
   * converts core transactional Telugu phrasing to clean English so the Indian English voice
   * can speak it clearly without choking or producing Hindi garbled sounds.
   */
  private convertTeluguToEnglishPhrase(text: string): string {
    if (!text) return '';
    if (/[a-zA-Z]{3,}/.test(text)) {
      return text;
    }
    const priceMatch = text.match(/ధర\s*కిలోకి\s*([₹\d]+)\s*రూపాయలు/i) || text.match(/కిలోకి\s*([₹\d]+)\s*రూపాయలు/i);
    if (priceMatch) {
      const p = priceMatch[1].replace(/₹/g, '').trim();
      let crop = 'produce';
      if (text.includes('టమాటా') || text.includes('టమాట')) crop = 'tomatoes';
      else if (text.includes('ఉల్లి') || text.includes('ఉల్లిపాయ')) crop = 'onions';
      else if (text.includes('మిరప') || text.includes('మిర్చి')) crop = 'red chillies';
      else if (text.includes('బియ్యం') || text.includes('వరి')) crop = 'rice';
      else if (text.includes('క్యారెట్')) crop = 'carrots';
      else if (text.includes('బంగాళాదుంప') || text.includes('ఆలూ')) crop = 'potatoes';
      return `Set ${crop} price to ${p} rupees per kg?`;
    }

    const stockMatch = text.match(/నిల్వకు\s*(\d+)\s*([^\s]+)\s*చేర్చమంటారా/i) || text.match(/(\d+)\s*(?:కిలోలు|కేజీలు|గ్రాములు)\s*జోడించు/i);
    if (stockMatch) {
      return `Add ${stockMatch[1]} to stock?`;
    }

    if (text.includes('మీ ఉత్పత్తుల జాబితాలో కనిపించలేదు')) {
      return 'That produce is not in your produce list. You can only update produce you currently sell.';
    }

    return text;
  }

  /**
   * Primary Speech Invocation:
   * Uses browser-native SpeechSynthesis with dynamic high-quality voice selection.
   * NO API key required.
   * Checks exact static cache first if available, otherwise immediately speaks
   * using browser SpeechSynthesis with the best available voice.
   */
  public async speak(text: string, lang: TTSLanguage = 'te-IN', options?: TTSOptions): Promise<void> {
    if (!text || typeof window === 'undefined') return;

    // Stop ongoing audio or speech
    this.stop();

    if (!('speechSynthesis' in window)) {
      options?.onError?.(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    // Auto-detect actual language from text to prevent cross-language synthesizer mismatch
    // (e.g. English text passed with default te-IN, or Telugu script passed with en-IN)
    const isTeluguText = /[\u0C00-\u0C7F]/.test(text);
    const isEnglishText = /[a-zA-Z]/.test(text) && !isTeluguText;
    const targetLang: TTSLanguage = isTeluguText ? 'te-IN' : (isEnglishText ? 'en-IN' : lang);

    // 1. Check exact static cache (preserves pre-rendered audio if exact match exists)
    const gender = options?.voiceGender || 'female';
    const cleanLower = text.toLowerCase().trim();
    const cacheKey = `${targetLang}:${gender}:${cleanLower}`;

    const cachedUrl =
      this.memoryCache.get(cacheKey) ||
      this.memoryCache.get(`${targetLang}:${cleanLower}`) ||
      this.findFuzzyStaticAudio(text, targetLang);

    if (cachedUrl) {
      this.playAudioFile(cachedUrl, options, text, targetLang);
      return;
    }

    // 2. Pure Browser SpeechSynthesis with Dynamic Voice Selection
    await this.speakBrowserSpeech(text, targetLang, options);
  }

  private playAudioFile(url: string, options?: TTSOptions, _fallbackText?: string, _lang?: TTSLanguage): void {
    try {
      this.lastAudioUrl = url;
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.preload = 'auto';

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
        console.warn('[TTS] Audio file playback failed, falling back to browser synthesis:', e);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        if (_fallbackText && _lang) {
          this.speakBrowserSpeech(_fallbackText, _lang, options);
        } else {
          options?.onEnd?.();
        }
      };

      audio.play().catch((playErr) => {
        console.warn('[TTS] Audio play() blocked by autoplay, falling back to browser synthesis:', playErr);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        if (_fallbackText && _lang) {
          this.speakBrowserSpeech(_fallbackText, _lang, options);
        } else {
          options?.onEnd?.();
        }
      });
    } catch (err) {
      console.warn('[TTS] Failed to initialize Audio element:', err);
      options?.onEnd?.();
    }
  }

  private async speakBrowserSpeech(text: string, lang: TTSLanguage, options?: TTSOptions): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onEnd?.();
      return;
    }

    // Await asynchronous voice resolution before creating utterance
    await this.ensureVoicesLoaded();

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        // Allow Chrome audio worker to flush cancellation queue before queueing new utterance
        await new Promise((r) => setTimeout(r, 50));
      }
      // Only resume if actually paused — unconditional resume() on an idle synth corrupts
      // Chrome's internal utterance state machine and causes it to fire spurious onend after word 1
      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch (_) {}
      }

      // Select best voice dynamically
      const voice = this.getBestVoice(lang);

      // Check if a genuine Telugu voice was found
      const hasTeluguVoice = voice && (
        voice.lang.toLowerCase().replace('_', '-').startsWith('te') ||
        voice.name.toLowerCase().includes('telugu') ||
        voice.name.includes('తెలుగు')
      );

      let textToSpeak = text;
      let utteranceLang: TTSLanguage = lang;
      let selectedVoice = voice;

      // If Telugu was requested but the device does not have a Telugu voice installed,
      // fall back gracefully to the Indian English voice with the English fallback text.
      // This prevents Hindi voices from reading Telugu text and producing nonsensical gibberish!
      if (lang === 'te-IN' && !hasTeluguVoice) {
        selectedVoice = this.selectBestIndianEnglishVoice(this.voices);
        utteranceLang = 'en-IN';
        if (options?.fallbackText) {
          textToSpeak = options.fallbackText;
        } else {
          textToSpeak = this.convertTeluguToEnglishPhrase(text);
        }
      }

      const cleanText = formatVernacularSpeech(textToSpeak, utteranceLang);
      if (!cleanText) return;

      this.lastText = text;
      this.lastLang = lang;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Natural conversational rates (avoiding robotic, overly fast, or dragging delivery)
      utterance.rate = options?.rate ?? (utteranceLang === 'te-IN' ? 0.92 : 0.96);
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = 1.0;

      // Ensure the selected voice matches the target language family (en for English, te for Telugu)
      const langFamily = utteranceLang.slice(0, 2).toLowerCase();
      const voiceMatchesLang = Boolean(
        selectedVoice &&
        selectedVoice.lang.toLowerCase().startsWith(langFamily)
      );

      if (selectedVoice && voiceMatchesLang) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.voice = null;
        utterance.lang = utteranceLang;
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

      // Retain reference on window object to prevent Chrome V8 garbage collection
      (window as any).__farmTrustUtterance = utterance;
      this.currentUtterance = utterance;

      // Chrome Mobile speech resume
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (_) {}

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isAudioPlaying = false;
      this.stopKeepAlive();
      this.currentUtterance = null;
      console.warn('[TTS] SpeechSynthesis failed:', err);
      options?.onEnd?.();
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
