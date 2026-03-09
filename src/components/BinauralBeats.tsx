"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Presets ────────────────────────────────────────────────────────

export interface BinauralPreset {
  id: string;
  name: string;
  description: string;
  leftHz: number;
  rightHz: number;
  beatHz: number;
}

export const binauralPresets: BinauralPreset[] = [
  { id: "calm", name: "Calm", description: "10Hz alpha — anxiety relief", leftHz: 200, rightHz: 210, beatHz: 10 },
  { id: "focus", name: "Focus", description: "40Hz gamma — grounding", leftHz: 200, rightHz: 240, beatHz: 40 },
  { id: "sleep", name: "Sleep", description: "4Hz delta — wind-down", leftHz: 180, rightHz: 184, beatHz: 4 },
  { id: "balance", name: "Balance", description: "6Hz theta — body scan", leftHz: 200, rightHz: 206, beatHz: 6 },
];

const HEADPHONES_KEY = "regulate-headphones-dismissed";
const FADE_DURATION = 3; // seconds

// ─── Floating pill (shown when beats are playing) ───────────────────

export function BinauralPill({
  preset,
  onStop,
}: {
  preset: BinauralPreset;
  onStop: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-teal/25 bg-deep/90 px-4 py-2 backdrop-blur-md shadow-lg shadow-teal/5">
      <div className="flex h-6 w-6 items-center justify-center">
        <div className="h-2 w-2 animate-pulse rounded-full bg-teal-soft" />
      </div>
      <span className="text-xs text-cream-dim">{preset.name}</span>
      <button
        onClick={onStop}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-blue/50 text-cream-dim hover:text-cream"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Toggle for module config screens ───────────────────────────────

export function BinauralToggle({
  presetId,
  isPlaying,
  onToggle,
}: {
  presetId: string;
  isPlaying: boolean;
  onToggle: (presetId: string) => void;
}) {
  const preset = binauralPresets.find((p) => p.id === presetId);
  if (!preset) return null;

  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-sm text-cream-dim">Binaural beats</span>
        <span className="ml-1.5 text-xs text-cream-dim/40">({preset.name})</span>
      </div>
      <button
        onClick={() => onToggle(presetId)}
        className={`h-7 w-12 rounded-full transition-colors ${isPlaying ? "bg-teal/40" : "bg-slate-blue/50"}`}
      >
        <div className={`h-5 w-5 rounded-full bg-cream transition-transform ${isPlaying ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

// ─── Headphones notice ──────────────────────────────────────────────

export function HeadphonesNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-teal/20 bg-deep p-6 text-center">
        <div className="mb-4 flex justify-center">
          <svg className="h-8 w-8 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18V12C3 7 7 3 12 3C17 3 21 7 21 12V18" />
            <rect x="3" y="15" width="4" height="5" rx="1" />
            <rect x="17" y="15" width="4" height="5" rx="1" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-cream">Headphones needed</h3>
        <p className="mt-2 text-sm text-cream-dim">
          Binaural beats work by sending slightly different frequencies to each ear. You&apos;ll need headphones for the full effect.
        </p>
        <button
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-teal/20 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── Hook for binaural beats engine ─────────────────────────────────

export function useBinauralBeats() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<BinauralPreset | null>(null);
  const [volume, setVolume] = useState(30);
  const [showHeadphones, setShowHeadphones] = useState(false);

  const maxGain = volume / 100 * 0.15; // Max volume is soft

  // Update volume while playing
  useEffect(() => {
    if (gainRef.current && isPlaying) {
      gainRef.current.gain.setTargetAtTime(volume / 100 * 0.15, audioCtxRef.current!.currentTime, 0.1);
    }
  }, [volume, isPlaying]);

  const start = useCallback((presetId: string) => {
    const preset = binauralPresets.find((p) => p.id === presetId);
    if (!preset) return;

    // Check headphones notice
    if (typeof window !== "undefined" && !localStorage.getItem(HEADPHONES_KEY)) {
      setShowHeadphones(true);
      localStorage.setItem(HEADPHONES_KEY, "1");
    }

    // Stop previous if running
    if (leftOscRef.current) {
      try { leftOscRef.current.stop(); } catch { /* already stopped */ }
    }
    if (rightOscRef.current) {
      try { rightOscRef.current.stop(); } catch { /* already stopped */ }
    }

    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(maxGain, ctx.currentTime + FADE_DURATION);
    gain.connect(ctx.destination);
    gainRef.current = gain;

    // Left oscillator
    const merger = ctx.createChannelMerger(2);
    merger.connect(gain);

    const leftOsc = ctx.createOscillator();
    const leftGain = ctx.createGain();
    leftOsc.type = "sine";
    leftOsc.frequency.value = preset.leftHz;
    leftGain.gain.value = 1;
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    const rightGain = ctx.createGain();
    rightOsc.type = "sine";
    rightOsc.frequency.value = preset.rightHz;
    rightGain.gain.value = 1;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    leftOsc.start();
    rightOsc.start();

    leftOscRef.current = leftOsc;
    rightOscRef.current = rightOsc;
    setActivePreset(preset);
    setIsPlaying(true);
  }, [maxGain]);

  const stop = useCallback(() => {
    if (!audioCtxRef.current || !gainRef.current) {
      setIsPlaying(false);
      setActivePreset(null);
      return;
    }

    const ctx = audioCtxRef.current;
    const gain = gainRef.current;

    gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_DURATION / 3);

    setTimeout(() => {
      try { leftOscRef.current?.stop(); } catch { /* */ }
      try { rightOscRef.current?.stop(); } catch { /* */ }
      leftOscRef.current = null;
      rightOscRef.current = null;
      setIsPlaying(false);
      setActivePreset(null);
    }, FADE_DURATION * 1000);
  }, []);

  const toggle = useCallback((presetId: string) => {
    if (isPlaying && activePreset?.id === presetId) {
      stop();
    } else {
      start(presetId);
    }
  }, [isPlaying, activePreset, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { leftOscRef.current?.stop(); } catch { /* */ }
      try { rightOscRef.current?.stop(); } catch { /* */ }
    };
  }, []);

  const dismissHeadphones = useCallback(() => setShowHeadphones(false), []);

  return {
    isPlaying,
    activePreset,
    volume,
    setVolume,
    start,
    stop,
    toggle,
    showHeadphones,
    dismissHeadphones,
  };
}
