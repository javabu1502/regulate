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
// We create a shared AudioContext and resume it on the first tap/click.
// Once unlocked, all subsequent Audio() calls work normally.

let audioUnlocked = false;
let sharedCtx: AudioContext | null = null;

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    if (!sharedCtx) {
      sharedCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (sharedCtx.state === "suspended") {
      sharedCtx.resume();
    }
    // Play a silent buffer to fully unlock HTML5 Audio on iOS
    const buffer = sharedCtx.createBuffer(1, 1, 22050);
    const source = sharedCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedCtx.destination);
    source.start(0);
    audioUnlocked = true;
  } catch {
    // Ignore — non-critical
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
 * Falls back silently if audio file doesn't exist or voice is disabled.
 *
 * Usage:
 *   const audio = useAudioGuide("body-scan");
 *   audio.play("head-face"); // plays /audio/body-scan/head-face.mp3
 */
export function useAudioGuide(module: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(
    (step: string) => {
      if (!isVoiceEnabled()) return;

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const path = `/audio/${module}/${step}.mp3`;
      const audio = new Audio(path);
      audio.setAttribute("playsinline", "true");

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.addEventListener("error", () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audioRef.current = audio;

      // Just play directly — the browser handles buffering.
      // .play() returns a promise; it will buffer and start automatically.
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // File missing or blocked — silently fail
          setIsPlaying(false);
          audioRef.current = null;
        });
    },
    [module]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, play, pause, stop };
}
