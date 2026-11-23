"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { haptics, getHapticsEnabled } from "@/lib/haptics";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Nothing to do ──────────────────────────────────────────────────
// The lowest door in the app. Breathing Garden paces your breath, which is
// work; every other game wants a finger. When someone is too far gone to
// follow an instruction, there should still be something to open.
//
// A shape expands and contracts at a slow, fixed rate. You are not asked to
// breathe with it. If your breathing happens to fall in with it, that is the
// whole mechanism, and it works without being told to.

const CYCLE_MS = 11000; // ~5.5 breaths/min, the coherence rate the app uses

export default function NothingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastPhaseRef = useRef<number>(-1);

  const [pulseOn, setPulseOn] = useState(false);
  const pulseOnRef = useRef(false);
  useEffect(() => {
    pulseOnRef.current = pulseOn;
  }, [pulseOn]);

  const [hapticsAvailable, setHapticsAvailable] = useState(false);
  useEffect(() => {
    setHapticsAvailable(
      getHapticsEnabled() && typeof navigator !== "undefined" && "vibrate" in navigator,
    );
  }, []);

  // Reduced motion narrows how far the shape travels. It keeps moving, since
  // a shape that does not move is not a rhythm to settle into, but it moves
  // much less.
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

    const start = performance.now();

    function draw(now: number) {
      const cycle = ((now - start) % CYCLE_MS) / CYCLE_MS;
      // Smooth in and out, no corners.
      const eased = 0.5 - Math.cos(cycle * Math.PI * 2) / 2;

      const base = Math.min(w, h) * 0.17;
      const travel = reducedMotionRef.current ? base * 0.18 : base * 0.62;
      const r = base + eased * travel;

      const cx = w / 2;
      const cy = h / 2;

      ctx!.clearRect(0, 0, w, h);

      // Outer haze
      const haze = ctx!.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.1);
      haze.addColorStop(0, `rgba(128, 166, 161, ${0.09 + eased * 0.05})`);
      haze.addColorStop(1, "rgba(128, 166, 161, 0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
      ctx!.fillStyle = haze;
      ctx!.fill();

      // The shape
      const body = ctx!.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r);
      body.addColorStop(0, `rgba(167, 203, 197, ${0.3 + eased * 0.1})`);
      body.addColorStop(1, `rgba(125, 176, 170, ${0.1 + eased * 0.06})`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = body;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(167, 203, 197, ${0.16 + eased * 0.1})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // One pulse at each turn, if asked for, so it can be followed with the
      // screen face down.
      const phase = cycle < 0.5 ? 0 : 1;
      if (phase !== lastPhaseRef.current) {
        if (lastPhaseRef.current !== -1 && pulseOnRef.current) {
          if (phase === 0) haptics.exhaleGuide();
          else haptics.inhaleGuide();
        }
        lastPhaseRef.current = phase;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Nothing to do - a shape that slowly expands and contracts"
    >
      <p className="sr-only">
        A soft shape slowly grows and shrinks, about five and a half times a
        minute. Nothing is asked of you. There is nothing to tap and nothing
        to follow. You can watch it or put the screen down.
      </p>

      <canvas ref={canvasRef} className="absolute inset-0 touch-none" />

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

        {hapticsAvailable && (
          <button
            onClick={() => setPulseOn((p) => !p)}
            className={`pointer-events-auto rounded-full px-3 py-1.5 text-xs backdrop-blur-sm transition-all ${
              pulseOn ? "bg-teal/15 text-teal-soft/70" : "bg-deep/60 text-cream-dim/40"
            }`}
          >
            {pulseOn ? "Pulse on" : "Pulse off"}
          </button>
        )}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        Nothing to do here. Watch it, or don&apos;t.
      </p>
    </div>
  );
}
