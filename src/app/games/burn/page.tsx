"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Ember particle type ────────────────────────────────────────────

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
}

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playCrackle() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Fire crackle: short burst of noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  } catch {
    // Audio not available
  }
}

// ─── Component ──────────────────────────────────────────────────────

type BurnPhase = "write" | "burning" | "done";

export default function BurnNotePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const burnProgressRef = useRef(0);
  const crackleTimerRef = useRef(0);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<BurnPhase>("write");
  const [burnOpacity, setBurnOpacity] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // ── Start burn ────────────────────────────────────────────────

  const startBurn = useCallback(() => {
    if (!text.trim()) return;
    setPhase("burning");
    burnProgressRef.current = 0;
    haptics.tap();
    playCrackle();
  }, [text]);

  // ── Canvas animation for fire/embers ──────────────────────────

  useEffect(() => {
    if (phase !== "burning") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

    embersRef.current = [];
    burnProgressRef.current = 0;
    crackleTimerRef.current = 0;

    const BURN_DURATION = 180; // frames (~3 seconds)
    const noteTop = h * 0.25;
    const noteBottom = h * 0.65;
    const noteLeft = w * 0.1;
    const noteRight = w * 0.9;

    function spawnEmbers(burnLine: number) {
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const x = noteLeft + Math.random() * (noteRight - noteLeft);
        embersRef.current.push({
          x,
          y: burnLine + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1 - Math.random() * 2.5,
          radius: 1 + Math.random() * 3,
          opacity: 0.8 + Math.random() * 0.2,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          color:
            Math.random() > 0.5
              ? { r: 255, g: 140 + Math.floor(Math.random() * 60), b: 30 }
              : { r: 255, g: 80 + Math.floor(Math.random() * 40), b: 20 },
        });
      }
    }

    function draw() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, w, h);

      burnProgressRef.current += 1;
      const progress = Math.min(burnProgressRef.current / BURN_DURATION, 1);
      const burnLine = noteTop + (noteBottom - noteTop) * progress;

      // Update note opacity
      setBurnOpacity(1 - progress);

      // Spawn embers along the burn line
      if (progress < 1) {
        spawnEmbers(burnLine);
      }

      // Crackle sound periodically
      crackleTimerRef.current++;
      if (crackleTimerRef.current % 25 === 0 && progress < 0.9) {
        playCrackle();
      }

      // Draw burn glow line
      if (progress < 1) {
        const glowGrad = ctx2d.createLinearGradient(0, burnLine - 30, 0, burnLine + 10);
        glowGrad.addColorStop(0, "rgba(255, 100, 20, 0)");
        glowGrad.addColorStop(0.4, `rgba(255, 140, 40, ${0.4 * (1 - progress)})`);
        glowGrad.addColorStop(0.6, `rgba(255, 80, 20, ${0.6 * (1 - progress)})`);
        glowGrad.addColorStop(1, "rgba(80, 20, 5, 0)");
        ctx2d.fillStyle = glowGrad;
        ctx2d.fillRect(noteLeft - 20, burnLine - 30, noteRight - noteLeft + 40, 40);
      }

      // Draw embers
      const embers = embersRef.current;
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.02; // float upward
        e.vx *= 0.99;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) {
          embers.splice(i, 1);
          continue;
        }

        const alpha = e.opacity * lifeRatio;
        const r = e.radius * (0.5 + lifeRatio * 0.5);

        // Glow
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r * 3, 0, Math.PI * 2);
        const glowGrad = ctx2d.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
        glowGrad.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.3})`);
        glowGrad.addColorStop(1, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, 0)`);
        ctx2d.fillStyle = glowGrad;
        ctx2d.fill();

        // Core
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`;
        ctx2d.fill();
      }

      // Check if burn is complete
      if (progress >= 1 && embers.length === 0) {
        setPhase("done");
        return;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  // ── Reset ─────────────────────────────────────────────────────

  function reset() {
    setText("");
    setPhase("write");
    setBurnOpacity(1);
    embersRef.current = [];
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-dvh flex-col items-center bg-midnight">
      {/* Back button */}
      <div className="absolute left-0 top-0 z-20 p-5">
        <Link
          href="/games"
          className="inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Games
        </Link>
      </div>

      {/* Canvas for fire effects — overlays everything during burn */}
      {phase === "burning" && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10"
        />
      )}

      {/* Write phase */}
      {phase === "write" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pt-20 pb-12">
          <h1 className="mb-2 text-xl font-light tracking-tight text-cream">
            Write it down
          </h1>
          <p className="mb-8 text-sm text-cream-dim/50">
            Whatever you need to let go of.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write here..."
            rows={8}
            autoFocus
            className="w-full rounded-2xl border border-candle/15 bg-candle/5 px-5 py-4 text-base leading-relaxed text-cream placeholder:text-cream-dim/30 focus:border-candle/30 focus:outline-none resize-none"
          />

          <button
            onClick={startBurn}
            disabled={!text.trim()}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-candle/15 px-8 py-3.5 text-base font-medium text-candle transition-colors hover:bg-candle/25 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M9 2C9 2 6 5 6 8.5C6 10.5 7.5 12 9 12C10.5 12 12 10.5 12 8.5C12 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Burn it
          </button>
        </div>
      )}

      {/* Burning phase — note fading away */}
      {phase === "burning" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6">
          <div
            className="w-full rounded-2xl border border-candle/15 bg-candle/5 px-5 py-4 transition-opacity"
            style={{ opacity: burnOpacity }}
          >
            <p className="whitespace-pre-wrap text-base leading-relaxed text-cream">
              {text}
            </p>
          </div>
        </div>
      )}

      {/* Done phase */}
      {phase === "done" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-light text-cream/80">Gone.</p>
          <p className="mt-3 text-sm text-cream-dim/50">
            You don&apos;t have to carry that anymore.
          </p>

          <button
            onClick={reset}
            className="mt-8 rounded-2xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
          >
            Write another
          </button>
        </div>
      )}

      {/* How this helps */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-5">
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-deep/70 px-4 py-3 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
          >
            How this helps
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-300 ${showHelp ? "rotate-180" : ""}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showHelp ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-teal/15 bg-deep/80 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Writing something down and destroying it can genuinely reduce
              how much it bothers you. Research backs this up — the physical
              act of letting go helps your brain let go too.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
