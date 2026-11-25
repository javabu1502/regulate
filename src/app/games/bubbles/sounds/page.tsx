"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isGameSoundEnabled, setGameSoundEnabled } from "@/lib/game-sound";
import { haptics } from "@/lib/haptics";

// ─── Ten pops to choose between ─────────────────────────────────────
// TEMPORARY. This page exists so one of these can be picked by ear on a
// real phone, which is the only way to judge a sound. Once there is an
// answer, the winner moves into the bubbles game and this route goes.
//
// They are all synthesised the way the game synthesises its own, rather
// than being recordings, so what is heard here is exactly what would ship.

let audioCtx: AudioContext | null = null;

function ctxOf(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** A burst of noise, shaped by how fast it decays. */
function noise(ctx: AudioContext, t: number, dur: number, curve: number) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, curve);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.start(t);
  return src;
}

function gain(ctx: AudioContext, t: number, peak: number, decay: number, attack = 0.001) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  return g;
}

function tone(
  ctx: AudioContext, t: number, type: OscillatorType,
  from: number, to: number, dur: number,
) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function band(ctx: AudioContext, type: BiquadFilterType, freq: number, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

interface Pop {
  id: number;
  name: string;
  note: string;
  play: () => void;
}

const POPS: Pop[] = [
  {
    id: 1,
    name: "Fidget popper",
    note: "What the game plays today. A membrane snap with a low thock under it.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const g1 = gain(ctx, t, 0.5, 0.015);
      noise(ctx, t, 0.008, 8).connect(g1); g1.connect(ctx.destination);
      const base = 150 + Math.random() * 80;
      const g2 = gain(ctx, t, 0.35, 0.05);
      tone(ctx, t, "sine", base, base * 0.4, 0.04).connect(g2); g2.connect(ctx.destination);
      const g3 = gain(ctx, t, 0.08, 0.02);
      tone(ctx, t, "square", 800 + Math.random() * 200, 600, 0.015).connect(g3);
      g3.connect(ctx.destination);
    },
  },
  {
    id: 2,
    name: "Soft bubble",
    note: "A pure blip falling in pitch. No click at all, the gentlest of the ten.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const f = 420 + Math.random() * 120;
      const g = gain(ctx, t, 0.3, 0.12, 0.004);
      tone(ctx, t, "sine", f, f * 0.35, 0.1).connect(g); g.connect(ctx.destination);
    },
  },
  {
    id: 3,
    name: "Wet pop",
    note: "Noise through a filter that sweeps upward. Closest to a real bubble bursting.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const bp = band(ctx, "bandpass", 500, 6);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 0.05);
      const g = gain(ctx, t, 0.6, 0.07);
      noise(ctx, t, 0.07, 3).connect(bp); bp.connect(g); g.connect(ctx.destination);
    },
  },
  {
    id: 4,
    name: "Cork",
    note: "Hollow and woody, like a bottle. Low and round with no brightness.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const bp = band(ctx, "bandpass", 320 + Math.random() * 60, 9);
      const g = gain(ctx, t, 0.9, 0.09);
      noise(ctx, t, 0.09, 4).connect(bp); bp.connect(g); g.connect(ctx.destination);
      const g2 = gain(ctx, t, 0.22, 0.07);
      tone(ctx, t, "sine", 190, 120, 0.06).connect(g2); g2.connect(ctx.destination);
    },
  },
  {
    id: 5,
    name: "Water drop",
    note: "Pitch rising instead of falling, which is what makes a droplet sound like one.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const f = 300 + Math.random() * 80;
      const g = gain(ctx, t, 0.28, 0.14, 0.003);
      tone(ctx, t, "sine", f, f * 3.2, 0.12).connect(g); g.connect(ctx.destination);
    },
  },
  {
    id: 6,
    name: "Tongue click",
    note: "Dry and quick, up near the top. Reads as a tap more than a pop.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const bp = band(ctx, "bandpass", 1800 + Math.random() * 400, 4);
      const g = gain(ctx, t, 0.5, 0.025);
      noise(ctx, t, 0.02, 6).connect(bp); bp.connect(g); g.connect(ctx.destination);
    },
  },
  {
    id: 7,
    name: "Soap bubble",
    note: "Airy and high with no pitch in it. Barely there.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const hp = band(ctx, "highpass", 2600);
      const g = gain(ctx, t, 0.35, 0.05);
      noise(ctx, t, 0.05, 2.5).connect(hp); hp.connect(g); g.connect(ctx.destination);
    },
  },
  {
    id: 8,
    name: "Deep thock",
    note: "The heaviest one. Low, felt more than heard, with a long-ish tail.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const base = 95 + Math.random() * 25;
      const g = gain(ctx, t, 0.5, 0.17, 0.002);
      tone(ctx, t, "sine", base, base * 0.5, 0.15).connect(g); g.connect(ctx.destination);
      const g2 = gain(ctx, t, 0.18, 0.012);
      noise(ctx, t, 0.01, 7).connect(g2); g2.connect(ctx.destination);
    },
  },
  {
    id: 9,
    name: "Glass tink",
    note: "Bright and glassy, two notes that do not quite agree. The sharpest of the ten.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const f = 1250 + Math.random() * 180;
      const g = gain(ctx, t, 0.16, 0.22, 0.002);
      tone(ctx, t, "triangle", f, f * 0.94, 0.2).connect(g);
      const g2 = gain(ctx, t, 0.07, 0.14, 0.002);
      tone(ctx, t, "sine", f * 2.74, f * 2.6, 0.12).connect(g2);
      g.connect(ctx.destination); g2.connect(ctx.destination);
    },
  },
  {
    id: 10,
    name: "Paper",
    note: "Muffled and soft, everything bright taken off it. The quietest.",
    play: () => {
      const ctx = ctxOf(); const t = ctx.currentTime;
      const lp = band(ctx, "lowpass", 700, 0.8);
      const g = gain(ctx, t, 0.55, 0.045);
      noise(ctx, t, 0.045, 5).connect(lp); lp.connect(g); g.connect(ctx.destination);
    },
  },
];

export default function PopSoundsPage() {
  const [muted, setMuted] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  useEffect(() => {
    setMuted(!isGameSoundEnabled());
  }, []);

  const play = useCallback((p: Pop) => {
    try { p.play(); } catch { /* sound is optional */ }
    haptics.light();
    setLast(p.id);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <div className="w-full max-w-md">
        <Link
          href="/games/bubbles"
          className="mb-6 inline-flex items-center gap-1 text-xs text-cream-dim/60 transition-colors hover:text-cream-dim"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Bubbles
        </Link>

        <h1 className="text-xl font-light tracking-tight text-cream">Pick a pop</h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-dim/70">
          Tap each one to hear it. Tap again to hear it twice in a row, which
          is closer to how it will actually feel. Then tell me the number.
        </p>

        {muted && (
          <button
            onClick={() => { setGameSoundEnabled(true); setMuted(false); }}
            className="mt-5 w-full rounded-xl bg-teal/20 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/30"
          >
            Sound is off. Turn it on.
          </button>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          {POPS.map((p) => (
            <button
              key={p.id}
              onClick={() => play(p)}
              className={`flex items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
                last === p.id
                  ? "border-teal/30 bg-deep/60"
                  : "border-teal/12 bg-deep/50 hover:border-teal/25"
              }`}
            >
              <span className="mt-0.5 w-5 shrink-0 text-sm tabular-nums text-cream-dim/35">
                {p.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-cream">{p.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-cream-dim/50">
                  {p.note}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-cream-dim/30">
          This page is temporary and comes out once one is chosen.
        </p>
      </div>
    </div>
  );
}
