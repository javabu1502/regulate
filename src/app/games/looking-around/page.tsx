"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── The one game here that gently wakes you up ─────────────────────
// Every other game in the app calms or discharges, which is wrong for
// shutdown: a frozen nervous system needs a little activation, not more
// quiet. This is the orienting exercise as a game. A soft light appears
// somewhere in the periphery, you turn your head and look at it, you touch
// it, another appears elsewhere. That outward scanning is what tells a body
// the room is safe.
//
// No timer, no score, no miss. Lights wait as long as they need to.

interface Light {
  x: number;
  y: number;
  born: number;
  found: boolean;
  foundAt: number;
}

// Deliberately opposite corners and edges, so each one asks for a real head
// turn rather than an eye flick.
const ZONES: { x: [number, number]; y: [number, number] }[] = [
  { x: [0.08, 0.3], y: [0.12, 0.35] },
  { x: [0.7, 0.92], y: [0.12, 0.35] },
  { x: [0.08, 0.3], y: [0.62, 0.85] },
  { x: [0.7, 0.92], y: [0.62, 0.85] },
  { x: [0.4, 0.6], y: [0.08, 0.22] },
  { x: [0.4, 0.6], y: [0.75, 0.9] },
  { x: [0.05, 0.18], y: [0.42, 0.58] },
  { x: [0.82, 0.95], y: [0.42, 0.58] },
];

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

/** A rising two-note chime: upward, because the point is mild activation. */
function playFound() {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.07, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.75);
    });
  } catch {
    /* sound is optional */
  }
}

export default function LookingAroundPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lightRef = useRef<Light | null>(null);
  const lastZoneRef = useRef<number>(-1);
  const sizeRef = useRef({ w: 0, h: 0 });

  const [foundCount, setFoundCount] = useState(0);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const spawn = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    // Never the same zone twice running: the turn is the exercise.
    let zone = Math.floor(Math.random() * ZONES.length);
    if (zone === lastZoneRef.current) zone = (zone + 1 + Math.floor(Math.random() * 3)) % ZONES.length;
    lastZoneRef.current = zone;
    const z = ZONES[zone];
    lightRef.current = {
      x: (z.x[0] + Math.random() * (z.x[1] - z.x[0])) * w,
      y: (z.y[0] + Math.random() * (z.y[1] - z.y[0])) * h,
      born: performance.now(),
      found: false,
      foundAt: 0,
    };
  }, []);

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
    spawn();

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      const light = lightRef.current;
      if (light) {
        if (light.found) {
          // A short bloom, then the next one.
          const since = now - light.foundAt;
          const dur = reducedMotionRef.current ? 240 : 650;
          const p = Math.min(since / dur, 1);
          const r = 16 + p * 46;
          ctx!.beginPath();
          ctx!.arc(light.x, light.y, r, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(153, 246, 228, ${0.35 * (1 - p)})`;
          ctx!.lineWidth = 2 * (1 - p);
          ctx!.stroke();
          if (p >= 1) spawn();
        } else {
          // Breathes in slowly so it draws the eye without startling.
          const age = (now - light.born) / 1000;
          const pulse = reducedMotionRef.current
            ? 0.72
            : 0.55 + Math.sin(age * 1.5) * 0.18;
          const appear = Math.min(age / 0.9, 1);

          const glow = ctx!.createRadialGradient(light.x, light.y, 0, light.x, light.y, 62);
          glow.addColorStop(0, `rgba(226, 203, 140, ${0.42 * pulse * appear})`);
          glow.addColorStop(1, "rgba(226, 203, 140, 0)");
          ctx!.beginPath();
          ctx!.arc(light.x, light.y, 62, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(light.x, light.y, 11 * appear, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(245, 232, 198, ${0.9 * appear})`;
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
  }, [spawn]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const light = lightRef.current;
    if (!light || light.found) return;
    const dx = e.clientX - light.x;
    const dy = e.clientY - light.y;
    // Generous target: this is not a test of aim.
    if (Math.sqrt(dx * dx + dy * dy) > 90) return;
    light.found = true;
    light.foundAt = performance.now();
    playFound();
    haptics.tap();
    setFoundCount((c) => c + 1);
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Looking around - find and touch each light as it appears"
    >
      <p className="sr-only">
        One soft light appears at a time, somewhere toward the edge of the
        screen. Look for it, then touch it, and another appears somewhere
        else. There is no timer and nothing to miss. Looking around the room
        is how the body checks that it is safe.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
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

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {foundCount === 0
          ? "Find the light. Turn your head if you need to."
          : "Keep going for as long as it feels good."}
      </p>
    </div>
  );
}
