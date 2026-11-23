"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Mandala ────────────────────────────────────────────────────────
// Every stroke is mirrored around the centre, so a shaky, aimless movement
// comes back as something ordered. That is the whole point and the reason
// mandala drawing turns up in therapy rooms: you are not being asked to make
// something good, and it comes out symmetrical anyway.
//
// Different from Color Wash, which is a blank canvas. Here the symmetry does
// the composing for you.

const FOLDS = [6, 8, 12] as const;
type Fold = (typeof FOLDS)[number];

const INK = [
  { r: 153, g: 246, b: 228 }, // teal-soft
  { r: 226, g: 203, b: 140 }, // candle
  { r: 199, g: 186, b: 232 }, // lavender
  { r: 250, g: 245, b: 239 }, // cream
];

export default function MandalaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const hueRef = useRef(0);
  const strokesRef = useRef(0);

  const [folds, setFolds] = useState<Fold>(8);
  const foldsRef = useRef<Fold>(8);
  useEffect(() => {
    foldsRef.current = folds;
  }, [folds]);

  const [touched, setTouched] = useState(false);

  // Nothing here moves on its own, so reduce-motion only shortens the fade
  // when the canvas is cleared.
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
      // Keep what is drawn when the viewport changes.
      let snapshot: ImageData | null = null;
      if (canvas!.width > 0 && canvas!.height > 0) {
        try {
          snapshot = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
        } catch {
          snapshot = null;
        }
      }
      sizeRef.current = { w, h };
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      if (snapshot) {
        try {
          ctx!.putImageData(snapshot, 0, 0);
        } catch {
          /* size changed too much; start clean */
        }
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /** Draw one segment, mirrored into every fold and its reflection. */
  const stroke = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const n = foldsRef.current;

    const speed = Math.hypot(to.x - from.x, to.y - from.y);
    // Slower hand, thicker line: rewards unhurried movement without saying so.
    const width = Math.max(1.1, 4.2 - speed * 0.07);

    hueRef.current += 0.0023;
    const c = INK[Math.floor(hueRef.current) % INK.length];
    const cNext = INK[(Math.floor(hueRef.current) + 1) % INK.length];
    const mix = hueRef.current % 1;
    const col = {
      r: Math.round(c.r + (cNext.r - c.r) * mix),
      g: Math.round(c.g + (cNext.g - c.g) * mix),
      b: Math.round(c.b + (cNext.b - c.b) * mix),
    };

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.5)`;

    const fx = from.x - cx, fy = from.y - cy;
    const tx = to.x - cx, ty = to.y - cy;

    for (let i = 0; i < n; i++) {
      ctx.rotate((Math.PI * 2) / n);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // Mirror too, so each petal is symmetrical in itself.
      ctx.beginPath();
      ctx.moveTo(-fx, fy);
      ctx.lineTo(-tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const onDown = useCallback((e: React.PointerEvent) => {
    drawingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
    if (!touched) setTouched(true);
  }, [touched]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const last = lastRef.current;
    if (!last) return;
    const next = { x: e.clientX, y: e.clientY };
    if (Math.hypot(next.x - last.x, next.y - last.y) < 2) return;
    stroke(last, next);
    lastRef.current = next;
    strokesRef.current++;
    if (strokesRef.current % 14 === 0) haptics.subtle();
  }, [stroke]);

  const onUp = useCallback(() => {
    drawingRef.current = false;
    lastRef.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const { w, h } = sizeRef.current;
    haptics.transition();
    if (reducedMotionRef.current) {
      ctx.clearRect(0, 0, w, h);
      return;
    }
    // Fade it out rather than snapping to empty.
    const start = performance.now();
    const step = () => {
      const p = Math.min((performance.now() - start) / 900, 1);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + p * 0.1})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      if (p < 1) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(step);
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Mandala - draw and your strokes mirror around the centre"
    >
      <p className="sr-only">
        A dark canvas. Draw anywhere with a finger and the stroke is repeated
        around the centre, so whatever you draw comes out symmetrical. You can
        change how many times it repeats, and clear it to start again.
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

        <div className="pointer-events-auto flex items-center gap-1.5">
          {FOLDS.map((f) => (
            <button
              key={f}
              onClick={() => setFolds(f)}
              className={`rounded-full px-2.5 py-1.5 text-[11px] backdrop-blur-sm transition-all ${
                folds === f ? "bg-teal/15 text-teal-soft/80" : "bg-deep/60 text-cream-dim/40"
              }`}
              aria-label={`Mirror ${f} ways`}
              aria-pressed={folds === f}
            >
              {f}
            </button>
          ))}
          <button
            onClick={clear}
            className="rounded-full bg-deep/60 px-3 py-1.5 text-[11px] text-cream-dim/40 backdrop-blur-sm transition-colors hover:text-cream-dim"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {touched ? "Slower strokes come out thicker." : "Draw anywhere. It mirrors itself."}
      </p>
    </div>
  );
}
