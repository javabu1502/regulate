"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Tide ───────────────────────────────────────────────────────────
// Burn is for things you want gone. This is for things you can set down and
// let be taken, which is a different feeling and often the more useful one.
//
// Put a stone on the sand. The water comes up on its own slow count, reaches
// it, and takes it. You do not have to do anything else, and nothing is
// destroyed on purpose; it just goes.
//
// The tide runs at about four and a half breaths a minute, slower than
// resting breathing, because an external rhythm that little bit slower than
// yours is the thing a nervous system tends to follow.

const TIDE_MS = 13000;

interface Stone {
  x: number;
  y: number;
  r: number;
  taken: boolean;
  takenAt: number;
  drift: number;
  tone: number;
}

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

/** Filtered noise, which is most of what a wave is. */
function wash(intensity: number) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const dur = 3.2;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Pink-ish: smoothed white noise reads as water rather than static.
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(900, now + dur * 0.35);
    filter.frequency.linearRampToValueAtTime(300, now + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07 * intensity, now + dur * 0.35);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + dur);
  } catch {
    /* sound is optional */
  }
}

export default function TidePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const stonesRef = useRef<Stone[]>([]);
  const lastPhaseRef = useRef(-1);
  const startRef = useRef(0);

  const [placed, setPlaced] = useState(0);
  const [taken, setTaken] = useState(0);

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
    startRef.current = performance.now();

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      const elapsed = now - startRef.current;
      const t = (elapsed % TIDE_MS) / TIDE_MS;
      // In and out, smooth at both ends.
      const reach = 0.5 - Math.cos(t * Math.PI * 2) / 2;

      // Waves come in sets, and the furthest one reaches ground the others
      // missed. Without this the top tenth of the sand was out of the water's
      // range, so a stone put down up there simply stayed, which is the one
      // thing this game should never do.
      const cycle = Math.floor(elapsed / TIDE_MS);
      const big = cycle % 4 === 3;
      const span = big ? 1.02 : 0.74 + ((cycle * 37) % 11) / 100;

      const sandTop = h * 0.52;
      const waterLine = h - (h - sandTop) * (0.1 + reach * span);

      ctx!.clearRect(0, 0, w, h);

      // Sand
      ctx!.fillStyle = "rgba(214, 189, 146, 0.05)";
      ctx!.fillRect(0, sandTop, w, h - sandTop);

      // Wet line left behind by the furthest reach
      ctx!.fillStyle = "rgba(128, 166, 161, 0.04)";
      ctx!.fillRect(0, waterLine, w, h - waterLine);

      // Water, with a soft edge that ripples a little
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      ctx!.lineTo(0, waterLine);
      const wobble = reducedMotionRef.current ? 0 : 1;
      for (let x = 0; x <= w; x += 12) {
        const edge =
          waterLine +
          Math.sin(x * 0.02 + now / 900) * 3 * wobble +
          Math.sin(x * 0.045 + now / 1400) * 2 * wobble;
        ctx!.lineTo(x, edge);
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();
      const water = ctx!.createLinearGradient(0, waterLine, 0, h);
      water.addColorStop(0, "rgba(125, 176, 170, 0.17)");
      water.addColorStop(1, "rgba(61, 90, 128, 0.3)");
      ctx!.fillStyle = water;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(0, waterLine);
      for (let x = 0; x <= w; x += 12) {
        ctx!.lineTo(x, waterLine + Math.sin(x * 0.02 + now / 900) * 3 * wobble);
      }
      ctx!.strokeStyle = "rgba(167, 203, 197, 0.22)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Stones
      for (const s of stonesRef.current) {
        if (!s.taken && s.y > waterLine) {
          s.taken = true;
          s.takenAt = now;
          setTaken((n) => n + 1);
          haptics.subtle();
        }

        let x = s.x;
        let alpha = 0.5;
        if (s.taken) {
          const age = (now - s.takenAt) / 2600;
          if (age >= 1) continue;
          // Carried out sideways and down as it goes.
          x += s.drift * age * 34;
          alpha = 0.5 * (1 - age);
        }

        ctx!.beginPath();
        ctx!.ellipse(x, s.y, s.r, s.r * 0.72, 0, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(250, 245, 239, ${alpha})`;
        ctx!.fill();
      }
      stonesRef.current = stonesRef.current.filter(
        (s) => !s.taken || now - s.takenAt < 2600,
      );

      // One wash per cycle, at the top of the reach.
      const phase = t < 0.5 ? 0 : 1;
      if (phase !== lastPhaseRef.current) {
        if (lastPhaseRef.current === 0 && phase === 1) wash(1);
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

  const place = useCallback((e: React.PointerEvent) => {
    const { w, h } = sizeRef.current;
    const sandTop = h * 0.52;
    // Only on the sand. Tapping the water does nothing, which is the point.
    const y = Math.max(sandTop + 12, Math.min(h - 20, e.clientY));
    stonesRef.current.push({
      x: Math.max(16, Math.min(w - 16, e.clientX)),
      y,
      r: 5 + Math.random() * 4,
      taken: false,
      takenAt: 0,
      drift: Math.random() > 0.5 ? 1 : -1,
      tone: Math.random(),
    });
    setPlaced((n) => n + 1);
    haptics.light();
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Tide - set a stone on the sand and let the water take it"
    >
      <p className="sr-only">
        A shoreline. The water comes up and goes back out on a slow count of
        about thirteen seconds. Touch the sand to set down a stone. When the
        water reaches it, it is carried out and gone. Nothing is destroyed and
        there is nothing to do but put things down.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={place}
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
        {placed === 0
          ? "Touch the sand to set something down."
          : taken === 0
            ? "Wait for the water. Every fourth wave comes in further."
            : "It comes back in a moment. You can put down as much as you like."}
      </p>
    </div>
  );
}
