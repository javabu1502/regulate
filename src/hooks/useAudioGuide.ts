"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { voiceGuidance } from "@/lib/voice-guidance";

const VOICE_ENABLED_KEY = "regulate-voice-enabled";

function isVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VOICE_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

// ─── Playback ───────────────────────────────────────────────────────
// This used to drive one HTMLAudioElement and swap its `src` for each step,
// with an "unlock" that created a throwaway AudioContext and discarded it.
// On iOS a media element is only cleared for programmatic playback right
// after a user gesture, and reassigning src revokes that, so the first cue of
// a session played and every one after it failed silently. Nobody noticed
// because the voice had no toggle until recently.
//
// Web Audio does not have that problem: once the shared context has been
// resumed inside a gesture it stays usable for the rest of the session. Clips
// are small, so decoded buffers are cached and each one is fetched once.

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Resume the one context everything plays through, on the first gesture. */
function unlock() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    // A silent tick: some browsers only consider a context started once
    // something has actually been scheduled on it.
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* non-critical */
  }
}

if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "keydown"];
  const handler = () => unlock();
  events.forEach((e) =>
    document.addEventListener(e, handler, { capture: true, passive: true }),
  );
}

async function loadClip(path: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(path);
  if (cached) return cached;
  const pending = inflight.get(path);
  if (pending) return pending;

  const c = getCtx();
  if (!c) return null;

  const job = (async () => {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      const buf = await c.decodeAudioData(bytes);
      buffers.set(path, buf);
      return buf;
    } catch {
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, job);
  return job;
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Plays the recorded voice for one module.
 *
 *   const audio = useAudioGuide("body-scan");
 *   audio.play("head-face"); // /audio/body-scan/head-face.mp3
 *
 * Pass the step's own wording as the second argument and it is spoken aloud
 * when the clip is missing, so a step is never silently skipped:
 *   audio.play("body-shaking-1", "Start with your hands. Shake them out.");
 */
export function useAudioGuide(module: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const playIdRef = useRef(0);

  const stopCurrent = useCallback(() => {
    const src = sourceRef.current;
    sourceRef.current = null;
    gainRef.current = null;
    if (src) {
      try {
        src.onended = null;
        src.stop();
      } catch {
        /* already finished */
      }
    }
  }, []);

  const play = useCallback(
    (step: string, fallbackText?: string) => {
      if (!isVoiceEnabled()) return;
      const c = getCtx();
      if (!c) return;
      if (c.state === "suspended") c.resume().catch(() => {});

      const path = `/audio/${module}/${step}.mp3`;
      const id = ++playIdRef.current;

      voiceGuidance.stop();
      stopCurrent();

      loadClip(path).then((buf) => {
        // A newer step started while this was loading.
        if (playIdRef.current !== id) return;

        if (!buf) {
          // No recording for this step. Speak it rather than go quiet.
          if (fallbackText) voiceGuidance.speak(fallbackText);
          return;
        }

        try {
          const src = c.createBufferSource();
          const gain = c.createGain();
          gain.gain.value = 1;
          src.buffer = buf;
          src.connect(gain);
          gain.connect(c.destination);
          src.onended = () => {
            if (sourceRef.current === src) {
              sourceRef.current = null;
              setIsPlaying(false);
            }
          };
          sourceRef.current = src;
          gainRef.current = gain;
          src.start(0);
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
          if (fallbackText) voiceGuidance.speak(fallbackText);
        }
      });
    },
    [module, stopCurrent],
  );

  const pause = useCallback(() => {
    voiceGuidance.stop();
    stopCurrent();
    setIsPlaying(false);
  }, [stopCurrent]);

  const stop = useCallback(() => {
    voiceGuidance.stop();
    stopCurrent();
    setIsPlaying(false);
  }, [stopCurrent]);

  // Leaving a screen should not leave a clip talking over the next one.
  useEffect(() => {
    return () => {
      voiceGuidance.stop();
      const src = sourceRef.current;
      sourceRef.current = null;
      if (src) {
        try {
          src.onended = null;
          src.stop();
        } catch {
          /* already finished */
        }
      }
    };
  }, []);

  return { isPlaying, play, pause, stop };
}
