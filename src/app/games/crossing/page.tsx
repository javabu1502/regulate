"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Bilateral stimulation ──────────────────────────────────────────
// A light crosses left to right and back at 1Hz per side, the rate the
// Butterfly Hug exercise uses and the one EMDR research settled on. Here it
// does the alternating for you: nothing to tap, nothing to keep count of.
// Follow it with your eyes, or close them and let the sound and the pulse
// carry it.

const PERIOD_MS = 1000; // one crossing per second, matching bilateral-tapping

// ─── Audio: a soft tone panned to the side the light is on ──────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function playSide(pan: number) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = "sine";
    osc.frequency.value = pan < 0 ? 196 : 220; // a gentle whole tone apart
    panner.pan.value = pan;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch {
    /* sound is optional */
  }
}

export default function CrossingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const lastSideRef = useRef<number>(0);
  const trailRef = useRef<{ x: number; y: number; opacity: number }[]>([]);

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Reduced motion shortens the trail rather than stopping the crossing: the
  // left-right alternation is the whole point and cannot be damped away.
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

    let w = window.innerWidth;
    let h = canvasHeight();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = canvasHeight();
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    startRef.current = performance.now();

    function draw(now: number) {
      // A pause holds the light still rather than losing your place.
      if (pausedRef.current) {
        startRef.current += 16;
      }
      const elapsed = now - startRef.current;

      // Triangle wave: 0 at the left edge, 1 at the right, back again.
      const cycle = (elapsed % (PERIOD_MS * 2)) / (PERIOD_MS * 2);
      const t = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
      // Ease at the turns so it does not snap at the edges.
      const eased = 0.5 - Math.cos(t * Math.PI) / 2;

      const margin = Math.min(70, w * 0.16);
      const x = margin + eased * (w - margin * 2);
      const y = h / 2;

      // Side change: pulse and sound, once per crossing.
      const side = cycle < 0.5 ? 1 : -1;
      if (side !== lastSideRef.current && !pausedRef.current) {
        lastSideRef.current = side;
        playSide(side > 0 ? 0.85 : -0.85);
        haptics.tap();
      }

      ctx!.clearRect(0, 0, w, h);

      // Trail
      const trail = trailRef.current;
      trail.push({ x, y, opacity: 0.5 });
      const maxTrail = reducedMotionRef.current ? 4 : 22;
      while (trail.length > maxTrail) trail.shift();
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const frac = i / trail.length;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 3 + frac * 7, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(167, 203, 197, ${0.03 + frac * 0.1})`;
        ctx!.fill();
      }

      // The light itself
      const glow = ctx!.createRadialGradient(x, y, 0, x, y, 54);
      glow.addColorStop(0, "rgba(167, 203, 197, 0.5)");
      glow.addColorStop(1, "rgba(167, 203, 197, 0)");
      ctx!.beginPath();
      ctx!.arc(x, y, 54, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(x, y, 13, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(250, 245, 239, 0.92)";
      ctx!.fill();

      // A faint line it travels along, so the eye has something to rest on.
      ctx!.beginPath();
      ctx!.moveTo(margin, y);
      ctx!.lineTo(w - margin, y);
      ctx!.strokeStyle = "rgba(128, 166, 161, 0.07)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
    haptics.subtle();
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Crossing - a light moves left and right for bilateral stimulation"
    >
      <p className="sr-only">
        A single light crosses slowly from left to right and back, once per
        second each way, with a soft tone and a pulse on each side. Follow it
        with your eyes or close them and listen. Tap anywhere to pause.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={togglePause}
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

        {paused && (
          <span className="pointer-events-none rounded-full bg-deep/60 px-3 py-1.5 text-xs text-cream-dim/50 backdrop-blur-sm">
            Paused
          </span>
        )}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        Follow it with your eyes, or close them and listen
      </p>
    </div>
  );
}
