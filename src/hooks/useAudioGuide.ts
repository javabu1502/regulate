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

      audio.addEventListener("canplaythrough", () => {
        audio.play().catch(() => {
          // Audio file doesn't exist or can't play — silently fail
        });
        setIsPlaying(true);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.addEventListener("error", () => {
        // File doesn't exist — silently fall back
        setIsPlaying(false);
        audioRef.current = null;
      });

      audioRef.current = audio;
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
