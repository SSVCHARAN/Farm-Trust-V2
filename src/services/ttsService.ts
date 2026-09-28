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
  private manifestPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-seed static cache manifest for instant neural playback without server dependencies
      this.manifestPromise = this.loadStaticManifest();

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

    // 1. Direct normalized match or containment
    for (const [key, url] of this.memoryCache.entries()) {
      if (key.startsWith(lang)) {
        const textPart = key.split(':').pop() || '';
        const normalized = textPart.replace(/[^a-z0-9\u0C00-\u0C7F]/g, '');
        if (normalized === target || (normalized.length > 8 && (normalized.includes(target) || target.includes(normalized)))) {
          return url;
        }
      }
    }

    // 2. Token overlap similarity for phrases with slightly different phrasing
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
        if (score > 0.55 && score > highestScore) {
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
    return (
      lower.includes('espeak') ||
      lower.includes('klatt') ||
      lower.includes('whisper') ||
      lower.includes('mbrola') ||
      lower.includes('festival') ||
      lower.includes('flite') ||
      lower.includes('pico') ||
      lower.includes('epos') ||
      // Linux espeak-ng often names voices like "English (Great Britain)" from espeak
      (lower.includes('english') && !lower.includes('google') && !lower.includes('natural') && !lower.includes('neural') && !lower.includes('online') &&
        typeof navigator !== 'undefined' && /linux/i.test(navigator.platform || ''))
    );
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

    // NEVER return Hindi for Telugu. Return null so it never attempts to read Telugu with a Hindi voice.
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

    // 0. Instant Synchronous Cache Check (preserves user interaction context for mobile autoplay)
    const gender = options?.voiceGender || 'female';
    const cleanLower = cleanText.toLowerCase().trim();
    const rawLower = text.toLowerCase().trim();
    const cacheKey = `${lang}:${gender}:${cleanLower}`;

    let cachedUrl =
      this.memoryCache.get(cacheKey) ||
      this.memoryCache.get(`${lang}:${gender}:${rawLower}`) ||
      this.memoryCache.get(`${lang}:${cleanLower}`) ||
      this.memoryCache.get(`${lang}:${rawLower}`) ||
      this.findFuzzyStaticAudio(cleanText, lang) ||
      this.findFuzzyStaticAudio(text, lang);

    if (cachedUrl) {
      this.playAudioFile(cachedUrl, options, cleanText, lang);
      return;
    }

    // If manifest was still in flight on first launch, await it once and retry lookup
    if (this.manifestPromise) {
      try {
        await this.manifestPromise;
      } catch (_) {}

      cachedUrl =
        this.memoryCache.get(cacheKey) ||
        this.memoryCache.get(`${lang}:${gender}:${rawLower}`) ||
        this.memoryCache.get(`${lang}:${cleanLower}`) ||
        this.memoryCache.get(`${lang}:${rawLower}`) ||
        this.findFuzzyStaticAudio(cleanText, lang) ||
        this.findFuzzyStaticAudio(text, lang);

      if (cachedUrl) {
        this.playAudioFile(cachedUrl, options, cleanText, lang);
        return;
      }
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
          this.memoryCache.set(`${lang}:${cleanLower}`, data.audioUrl);
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

    // ─── TIER 2: Browser SpeechSynthesis Fallback (English only, never Telugu) ───
    // For Telugu: pre-rendered audio is the ONLY allowed source. If it's missing, silent end.
    if (lang.startsWith('te')) {
      console.info('[TTS] No pre-rendered Telugu clip found. Ending silently (no espeak fallback).');
      options?.onEnd?.();
    } else {
      this.speakBrowserFallback(cleanText, lang, options);
    }
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
        console.warn('[TTS] Pre-rendered audio file playback failed (no browser TTS fallback):', e);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        // Silent end — never fall back to espeak/Hindi
        options?.onEnd?.();
      };

      audio.play().catch((playErr) => {
        console.warn('[TTS] Audio play() rejected (autoplay policy or format):', playErr);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        // Silent end — never fall back to espeak/Hindi
        options?.onEnd?.();
      });
    } catch (err) {
      console.warn('[TTS] Failed to initialize Audio element:', err);
      options?.onEnd?.();
    }
  }

  private async speakBrowserFallback(cleanText: string, lang: TTSLanguage, options?: TTSOptions): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onEnd?.();
      return;
    }

    await this.ensureVoicesLoaded();

    try {
      window.speechSynthesis.cancel();

      const voice = this.getBestVoice(lang);

      // ── Telugu: no native te-IN voice → silent bail (never espeak/Hindi) ──
      if (lang.startsWith('te')) {
        if (!voice) {
          console.info('[TTS] No Telugu voice available; skipping browser TTS for Telugu.');
          options?.onEnd?.();
          return;
        }
        const voiceIsTelugu = voice.lang.toLowerCase().startsWith('te') || voice.name.toLowerCase().includes('telugu');
        if (!voiceIsTelugu) {
          console.info('[TTS] Telugu guard: non-Telugu voice would play — aborting to prevent Hindi/espeak audio.');
          options?.onEnd?.();
          return;
        }
      }

      // ── English: skip if only espeak or robotic voices available ──
      if (lang.startsWith('en')) {
        const availableEnVoices = this.voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        const hasGoodEnVoice = availableEnVoices.some(v =>
          !this.isRoboticVoice(v.name) &&
          (this.isHighQualityVoice(v.name) || v.name.toLowerCase().includes('google') || !v.name.toLowerCase().includes('espeak'))
        );
        if (!hasGoodEnVoice || !voice) {
          console.info('[TTS] No quality English voice; skipping browser TTS to avoid robotic audio.');
          options?.onEnd?.();
          return;
        }
        if (this.isRoboticVoice(voice.name)) {
          console.info('[TTS] Robotic voice detected; skipping browser TTS.');
          options?.onEnd?.();
          return;
        }
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options?.rate ?? (lang === 'te-IN' ? 0.9 : 0.95);
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = 1.0;

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || lang;
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
