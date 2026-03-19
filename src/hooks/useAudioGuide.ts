"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const VOICE_ENABLED_KEY = "regulate-voice-enabled";

function isVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VOICE_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

// ─── iOS Audio Unlock ──────────────────────────────────────────────
// iOS Safari blocks audio playback until a user gesture "unlocks" it.
// We create a shared Audio element and play silence on the first tap.
// After that, changing .src and calling .play() works reliably.

let sharedAudioUnlocked = false;

function unlockAudio() {
  if (sharedAudioUnlocked) return;
  try {
    // AudioContext unlock
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    if (ctx.state === "suspended") ctx.resume();
    sharedAudioUnlocked = true;
  } catch {
    // Non-critical
  }
}

if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "keydown"];
  const handler = () => {
    unlockAudio();
    events.forEach((e) => document.removeEventListener(e, handler, true));
  };
  events.forEach((e) => document.addEventListener(e, handler, { capture: true, once: false, passive: true }));
}

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * Hook for playing voice guidance audio files.
 * Reuses a single Audio element per module for iOS reliability.
 *
 * Usage:
 *   const audio = useAudioGuide("body-scan");
 *   audio.play("head-face"); // plays /audio/body-scan/head-face.mp3
 */
export function useAudioGuide(module: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create a persistent Audio element for this module
  useEffect(() => {
    const audio = new Audio();
    audio.setAttribute("playsinline", "true");
    audio.preload = "auto";

    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("error", () => setIsPlaying(false));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("playing", () => setIsPlaying(true));

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load(); // Release resources
      audioRef.current = null;
    };
  }, [module]);

  const play = useCallback(
    (step: string) => {
      if (!isVoiceEnabled()) return;

      const audio = audioRef.current;
      if (!audio) return;

      const path = `/audio/${module}/${step}.mp3`;

      // If already playing this exact file, let it continue
      if (audio.src.endsWith(path) && !audio.paused && !audio.ended) return;

      // Change source and play
      audio.src = path;
      audio.load();
      audio.play().catch(() => {
        // File missing or blocked — silently fail
        setIsPlaying(false);
      });
    },
    [module]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, play, pause, stop };
}
