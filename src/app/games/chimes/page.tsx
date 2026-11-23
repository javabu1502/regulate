"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled, setGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Bowls ──────────────────────────────────────────────────────────
// The only game here led by sound rather than by what is on screen. Every
// other one needs your eyes; this one works with them closed, and works
// better with headphones.
//
// Nine singing bowls on a pentatonic scale, so no combination can sound
// wrong. Very long decay, so they layer into a drone if you keep going.
// Drag across them to sound the whole set.

// An octave lower than a chime set, where bowls actually live.
const SCALE = [130.81, 146.83, 174.61, 196, 220, 261.63, 293.66, 329.63, 392];

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
    master = audioCtx.createGain();
    master.gain.value = 0.5;
    master.connect(audioCtx.destination);
  }
  return audioCtx;
}

// This started out with a ConvolverNode for room sound, which made it the
// only game here doing something the others do not. It produced no sound at
// all on a real device. The ringing comes from stacked partials and a long
// decay instead, which is the same plain oscillator graph every other game
// in this app already uses.
function strike(freq: number, velocity = 1) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // A singing bowl rather than a struck bar. Three things make the
    // difference: the partials sit at ratios that are not whole multiples of
    // the fundamental, the attack is slow instead of a hit, and each partial
    // is a close pair detuned by a couple of hertz so they beat against each
    // other. That slow wobble is the sound people mean by "singing".
    const partials = [
      { mult: 1,    gain: 0.3,  decay: 11, detune: 1.1 },
      { mult: 2.75, gain: 0.1,  decay: 8,  detune: 1.7 },
      { mult: 5.4,  gain: 0.04, decay: 5,  detune: 2.3 },
      { mult: 8.9,  gain: 0.015, decay: 3, detune: 0 },
    ];

    partials.forEach(({ mult, gain: level, decay, detune }) => {
      const pair = detune > 0 ? [-detune / 2, detune / 2] : [0];
      pair.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq * mult + offset;
        gain.gain.setValueAtTime(0, now);
        // Swelling in rather than striking is most of the character.
        gain.gain.linearRampToValueAtTime((level * velocity) / pair.length, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(gain);
        gain.connect(master ?? ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    });
  } catch {
    /* sound is optional */
  }
}

interface Bar {
  struck: number;   // timestamp of last strike
  energy: number;
}

export default function ChimesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef<Bar[]>(SCALE.map(() => ({ struck: 0, energy: 0 })));
  const sizeRef = useRef({ w: 0, h: 0 });
  const draggingRef = useRef(false);
  const lastBarRef = useRef(-1);

  const [touched, setTouched] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(!isGameSoundEnabled());
  }, []);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = canvasHeight();
      sizeRef.current = { w, h };
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      const bars = barsRef.current;
      const n = bars.length;
      const slot = w / n;
      const barW = Math.min(slot * 0.42, 26);

      for (let i = 0; i < n; i++) {
        const bar = bars[i];
        bar.energy *= reducedMotionRef.current ? 0.9 : 0.975;

        const cx = slot * (i + 0.5);
        // Longer bars sound lower, like a real set.
        const len = h * (0.3 + (1 - i / n) * 0.34);
        const top = (h - len) / 2;

        // Resting bar. Built from arcs rather than roundRect, which only
        // exists in Safari 16.4 and up; where it is missing it throws and
        // takes the whole draw loop down with it.
        const r = barW / 2;
        const x0 = cx - r;
        ctx!.beginPath();
        ctx!.moveTo(x0, top + r);
        ctx!.arc(cx, top + r, r, Math.PI, 0);
        ctx!.lineTo(x0 + barW, top + len - r);
        ctx!.arc(cx, top + len - r, r, 0, Math.PI);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(125, 211, 200, ${0.07 + bar.energy * 0.22})`;
        ctx!.fill();
        ctx!.strokeStyle = `rgba(153, 246, 228, ${0.1 + bar.energy * 0.4})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        // Ringing glow
        if (bar.energy > 0.01) {
          const glow = ctx!.createRadialGradient(cx, h / 2, 0, cx, h / 2, len * 0.6);
          glow.addColorStop(0, `rgba(153, 246, 228, ${0.16 * bar.energy})`);
          glow.addColorStop(1, "rgba(153, 246, 228, 0)");
          ctx!.beginPath();
          ctx!.arc(cx, h / 2, len * 0.6, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const hit = useCallback((clientX: number) => {
    const { w } = sizeRef.current;
    if (!w) return;
    const n = SCALE.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor((clientX / w) * n)));
    // Dragging should brush each chime once, not retrigger the same one.
    if (i === lastBarRef.current) return;
    lastBarRef.current = i;
    barsRef.current[i].struck = performance.now();
    barsRef.current[i].energy = 1;
    strike(SCALE[i]);
    haptics.light();
    if (!touched) setTouched(true);
  }, [touched]);

  const onDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    lastBarRef.current = -1;
    hit(e.clientX);
  }, [hit]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    hit(e.clientX);
  }, [hit]);

  const onUp = useCallback(() => {
    draggingRef.current = false;
    lastBarRef.current = -1;
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Bowls - touch or drag across them to sound them"
    >
      <p className="sr-only">
        Nine singing bowls side by side, low on the left and high on the
        right. Touch one to sound it, or drag across them all. They are tuned
        so that no combination sounds wrong, and each one rings on for a long
        time so they layer over each other. This one works with your eyes
        closed.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Games
        </Link>
      </div>

      {muted && (
        <div className="absolute inset-x-0 bottom-36 flex flex-col items-center gap-2 px-8">
          <p className="text-center text-xs text-cream-dim/60">
            Sound is switched off, and this one is nothing without it.
          </p>
          <button
            onClick={() => {
              setGameSoundEnabled(true);
              setMuted(false);
            }}
            className="rounded-xl bg-teal/20 px-5 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30"
          >
            Turn sound on
          </button>
          <p className="text-center text-[11px] leading-relaxed text-cream-dim/30">
            If it is already on and still silent, check the ring/silent switch
            on the side of your phone.
          </p>
        </div>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {touched
          ? "Let them ring. They layer."
          : "Touch a bowl, or drag across them. Try it with your eyes closed."}
      </p>
    </div>
  );
}
