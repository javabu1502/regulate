"use client";

// ─── Voice Guidance via Web Speech API ──────────────────────────────
// Speaks instructions aloud during exercises. No audio files needed.

const STORAGE_KEY = "regulate-voice-enabled";

class VoiceGuidance {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.enabled = stored === "1";
      } catch { /* */ }
    }
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
    utterance.rate = options?.rate ?? 0.85; // Slightly slower than normal
    utterance.pitch = options?.pitch ?? 0.95; // Slightly lower pitch for calm
    utterance.volume = options?.volume ?? 0.8;

    // Try to find a calm-sounding voice
    const voices = this.synth.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel")
    );
    if (preferred) utterance.voice = preferred;

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
