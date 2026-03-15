"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Optional ambient background audio that plays across all games.
 * Uses synthesized gentle drone — no external audio files needed.
 * Toggle stored in localStorage for persistence.
 */

let audioCtx: AudioContext | null = null;

export default function AmbientAudio() {
  const [playing, setPlaying] = useState(false);
  const nodesRef = useRef<{ gain: GainNode; oscs: OscillatorNode[] } | null>(null);

  // Check saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("regulate-ambient");
      if (saved === "on") {
        // Don't auto-start — needs user gesture. Just show as "on" state ready.
      }
    } catch {}
  }, []);

  const startAmbient = useCallback(() => {
    if (nodesRef.current) return;

    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3); // Very quiet
    masterGain.connect(ctx.destination);

    const oscs: OscillatorNode[] = [];

    // Gentle drone: layered sine waves at consonant intervals
    const freqs = [65.41, 98.0, 130.81, 196.0]; // C2, G2, C3, G3
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // Slow subtle detune for organic feel
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      lfoGain.gain.value = 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const oscGain = ctx.createGain();
      oscGain.gain.value = freq < 100 ? 0.4 : freq < 150 ? 0.25 : 0.15;
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscs.push(osc);
      oscs.push(lfo);
    }

    nodesRef.current = { gain: masterGain, oscs };
  }, []);

  const stopAmbient = useCallback(() => {
    if (!nodesRef.current || !audioCtx) return;
    const { gain, oscs } = nodesRef.current;
    const t = audioCtx.currentTime;
    gain.gain.linearRampToValueAtTime(0, t + 2);
    setTimeout(() => {
      for (const osc of oscs) {
        try { osc.stop(); } catch {}
      }
      nodesRef.current = null;
    }, 2200);
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      stopAmbient();
      setPlaying(false);
      try { localStorage.setItem("regulate-ambient", "off"); } catch {}
    } else {
      startAmbient();
      setPlaying(true);
      try { localStorage.setItem("regulate-ambient", "on"); } catch {}
    }
  }, [playing, startAmbient, stopAmbient]);

  return (
    <button
      onClick={toggle}
      className={`rounded-full px-3 py-1.5 text-xs backdrop-blur-sm transition-all ${
        playing
          ? "bg-teal/15 text-teal-soft/70"
          : "bg-deep/60 text-cream-dim/40"
      }`}
      aria-label={playing ? "Ambient sound on" : "Ambient sound off"}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block mr-1">
        {playing ? (
          <>
            <path d="M2 5h2l4-3v12l-4-3H2V5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 4.5c1 1 1 6 0 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M13 3c1.5 1.5 1.5 8.5 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M2 5h2l4-3v12l-4-3H2V5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 5l4 6M15 5l-4 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </svg>
      {playing ? "Ambient" : "Ambient"}
    </button>
  );
}
