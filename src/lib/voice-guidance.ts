"use client";

// ─── Voice Guidance via Web Speech API ──────────────────────────────
// Speaks instructions aloud during exercises.
// Optimized for the softest, most natural female voice available.

const STORAGE_KEY = "regulate-voice-enabled";

class VoiceGuidance {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.enabled = stored === "1";
      } catch { /* */ }

      // Pre-cache best voice once voices load
      this.synth.addEventListener("voiceschanged", () => {
        this.cachedVoice = this.findBestVoice();
      });
      // Also try immediately (voices may already be loaded)
      this.cachedVoice = this.findBestVoice();
    }
  }

  private findBestVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (voices.length === 0) return null;

    // Ranked preference: soft female voices first
    // Samantha (macOS) is the best browser TTS voice for calm/soothing
    // Zarvox/Alex/etc are robotic and should be avoided
    const preferredNames = [
      "Samantha",        // macOS — warm, natural female
      "Moira",           // macOS — soft Irish female
      "Tessa",           // macOS — gentle South African female
      "Fiona",           // macOS — warm Scottish female
      "Google US English", // Chrome — decent female
      "Karen",           // macOS — Australian female
      "Victoria",        // macOS — US female
      "Allison",         // macOS — US female
    ];

    for (const name of preferredNames) {
      const voice = voices.find(
        (v) => v.name.includes(name) && v.lang.startsWith("en")
      );
      if (voice) return voice;
    }

    // Fallback: find any English female voice (avoid names like Alex, Daniel, Fred, etc.)
    const maleNames = ["Alex", "Daniel", "Fred", "Ralph", "Albert", "Bruce", "Junior", "Zarvox", "Trinoids", "Whisper", "Bad News", "Good News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Deranged", "Pipe Organ"];
    const englishFemale = voices.find(
      (v) => v.lang.startsWith("en") && !maleNames.some((m) => v.name.includes(m))
    );
    if (englishFemale) return englishFemale;

    // Last resort: any English voice
    return voices.find((v) => v.lang.startsWith("en")) || null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch { /* */ }
    if (!on) this.stop();
  }

  toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    return next;
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.enabled || !this.synth) return;

    // Cancel any current speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.75;  // Slow and gentle
    utterance.pitch = options?.pitch ?? 1.0; // Natural pitch (Samantha sounds best at 1.0)
    utterance.volume = options?.volume ?? 0.7; // Soft, not overpowering

    // Use cached best voice
    if (!this.cachedVoice) {
      this.cachedVoice = this.findBestVoice();
    }
    if (this.cachedVoice) {
      utterance.voice = this.cachedVoice;
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }
}

export const voiceGuidance = new VoiceGuidance();
