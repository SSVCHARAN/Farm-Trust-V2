/**
 * Vernacular Speech Synthesis (TTS) Service for Farm Trust
 * Multi-Tier Provider:
 * 1. AI Neural Voice (Gemini Audio / Indian Neural AI via Backend)
 * 2. Instant Pre-warmed & Local Disk Audio Cache (/audio/cache/...)
 * 3. Graceful Fallback to Browser SpeechSynthesis (never breaks)
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

export function formatVernacularSpeech(text: string, lang: TTSLanguage): string {
  if (lang === 'te-IN') {
    return text
      .replace(/(\d+),(\d+)/g, '$1$2')
      .replace(/₹\s*(\d+)\s*\/\s*(?:kg|కిలో|కేజీ)/gi, '$1 రూపాయలు కిలో')
      .replace(/₹\s*(\d+)/g, '$1 రూపాయలు')
      .replace(/(\d+)\s*(?:kg|కిలోలు)/gi, '$1 కిలోలు')
      .replace(/(\d+)\s*(?:liters|లీటర్లు)/gi, '$1 లీటర్లు')
      .replace(/[*#_~`\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    return text
      .replace(/(\d+),(\d+)/g, '$1$2')
      .replace(/₹\s*(\d+)\s*\/\s*(?:kg|kilogram)/gi, '$1 rupees per kg')
      .replace(/₹\s*(\d+)/g, '$1 rupees')
      .replace(/(\d+)\s*kg/gi, '$1 kg')
      .replace(/[*#_~`\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

class VernacularTTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private activeAbortController: AbortController | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isAudioPlaying: boolean = false;
  private isAudioLoading: boolean = false;
  private lastAudioUrl: string | null = null;
  private lastText: string = '';
  private lastLang: TTSLanguage = 'te-IN';
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.voices = window.speechSynthesis.getVoices();
      }
    } catch (_) {
      this.voices = [];
    }
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

  public getBestVoice(lang: TTSLanguage): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) this.loadVoices();

    if (lang === 'te-IN') {
      const teVoice = this.voices.find(
        (v) => v.lang === 'te-IN' || v.lang === 'te_IN' || v.lang.toLowerCase().replace('_', '-') === 'te-in'
      );
      if (teVoice) return teVoice;

      const teAny = this.voices.find((v) => v.lang.toLowerCase().startsWith('te'));
      if (teAny) return teAny;

      const indicVoice = this.voices.find(
        (v) => v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.toLowerCase().startsWith('hi')
      );
      if (indicVoice) return indicVoice;
    }

    const enInVoice = this.voices.find(
      (v) => v.lang === 'en-IN' || v.lang === 'en_IN' || v.lang.toLowerCase().replace('_', '-') === 'en-in'
    );
    if (enInVoice) return enInVoice;

    return this.voices.find((v) => v.lang.toLowerCase().startsWith('en')) || null;
  }

  /**
   * Unified speak API:
   * speak(text, language, options)
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

    // Attempt AI/Neural voice from backend
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
      console.warn('AI Voice service call failed, falling back to browser synthesis:', err);
    } finally {
      this.isAudioLoading = false;
      options?.onLoading?.(false);
    }

    // Graceful fallback to browser speechSynthesis
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

  private speakBrowserFallback(cleanText: string, lang: TTSLanguage, options?: TTSOptions): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onError?.(new Error('Speech synthesis not supported in this browser'));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = options?.rate || (lang === 'te-IN' ? 0.95 : 1.0);
      utterance.pitch = options?.pitch || 1.0;

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.isAudioPlaying = true;
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.isAudioPlaying = false;
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isAudioPlaying = false;
        this.currentUtterance = null;
        options?.onError?.(e);
      };

      (window as any).__farmTrustUtterance = utterance;
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isAudioPlaying = false;
      console.warn('Browser TTS fallback error:', err);
      options?.onError?.(err);
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
    // Abort active fetch request if any
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    // Stop and clear HTML Audio
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }

    // Stop browser synthesis
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
