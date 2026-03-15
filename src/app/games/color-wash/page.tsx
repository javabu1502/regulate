"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";

// ── Colors ────────────────────────────────────────────────────────────
const PALETTE = [
  { r: 94, g: 234, b: 212, label: "Teal" },      // teal #5eead4
  { r: 244, g: 132, b: 95, label: "Coral" },      // coral #f4845f
  { r: 196, g: 181, b: 253, label: "Lavender" },  // lavender #c4b5fd
  { r: 252, g: 211, b: 77, label: "Candle" },     // candle #fcd34d
  { r: 240, g: 235, b: 228, label: "Soft White" }, // soft white
];

// ── Audio ─────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playDabSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Soft watercolor dab: gentle filtered noise
    const bufLen = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 4);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800 + Math.random() * 400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.025, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  } catch {}
}

type BrushSize = "S" | "M" | "L";
const BRUSH_SIZES: Record<BrushSize, number> = { S: 20, M: 40, L: 65 };

// ── Component ─────────────────────────────────────────────────────────

export default function ColorWashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = useRef(0);
  const fadingRef = useRef(false);
  const fadeStartRef = useRef(0);
  const fadeSnapshotRef = useRef<ImageData | null>(null);
  const drawingRef = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [brushSize, setBrushSize] = useState<BrushSize>("M");
  const [showInstruction, setShowInstruction] = useState(true);
  const [autoColor, setAutoColor] = useState(true);
  const hasDrawnRef = useRef(false);
  const autoColorRef = useRef(true);
  const autoColorPhaseRef = useRef(0);

  // Keep refs in sync with state for use inside callbacks
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;
  autoColorRef.current = autoColor;

  // ── Setup canvas ────────────────────────────────────────────────

  const getOffscreen = useCallback(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
    }
    return offscreenRef.current;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const offscreen = getOffscreen();
    const offCtx = offscreen.getContext("2d")!;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Save existing offscreen content
      let savedData: ImageData | null = null;
      if (offscreen.width > 0 && offscreen.height > 0) {
        savedData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      }

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Restore saved data
      if (savedData) {
        offCtx.putImageData(savedData, 0, 0);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    // ── Animation loop ──────────────────────────────────────────

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Handle fade effect
      if (fadingRef.current) {
        const elapsed = performance.now() - fadeStartRef.current;
        const fadeDuration = 2000;
        const progress = Math.min(elapsed / fadeDuration, 1);

        offCtx.clearRect(0, 0, w, h);
        if (fadeSnapshotRef.current) {
          offCtx.putImageData(fadeSnapshotRef.current, 0, 0);
          offCtx.save();
          offCtx.setTransform(1, 0, 0, 1, 0, 0);
          offCtx.fillStyle = `rgba(10, 15, 30, ${progress})`;
          offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
          offCtx.restore();
        }

        if (progress >= 1) {
          fadingRef.current = false;
          fadeSnapshotRef.current = null;
          offCtx.clearRect(0, 0, w, h);
        }
      }

      // Composite offscreen to display canvas
      ctx!.clearRect(0, 0, w, h);
      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.drawImage(offscreen, 0, 0);
      ctx!.restore();

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [getOffscreen]);

  // ── Drawing helpers ─────────────────────────────────────────────

  const drawBrushDot = useCallback(
    (x: number, y: number, radius: number, color: { r: number; g: number; b: number }, opacity: number) => {
      const offscreen = getOffscreen();
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      // Watercolor effect: large soft circle with very low opacity
      const grad = offCtx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`);
      grad.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.7})`);
      grad.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.35})`);
      grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      offCtx.beginPath();
      offCtx.arc(x, y, radius, 0, Math.PI * 2);
      offCtx.fillStyle = grad;
      offCtx.fill();
    },
    [getOffscreen],
  );

  const drawBleed = useCallback(
    (x: number, y: number, radius: number, color: { r: number; g: number; b: number }) => {
      const offscreen = getOffscreen();
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      // Subtle bleed: a much larger, very faint circle around the stroke area
      const bleedRadius = radius * 2.5;
      const grad = offCtx.createRadialGradient(x, y, radius * 0.5, x, y, bleedRadius);
      grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.015)`);
      grad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.008)`);
      grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      offCtx.beginPath();
      offCtx.arc(x, y, bleedRadius, 0, Math.PI * 2);
      offCtx.fillStyle = grad;
      offCtx.fill();
    },
    [getOffscreen],
  );

  // Get the current brush color — auto-cycles or manual pick
  const getCurrentColor = useCallback(() => {
    if (!autoColorRef.current) {
      return PALETTE[selectedColorRef.current];
    }
    // Smoothly interpolate between palette colors
    const phase = autoColorPhaseRef.current;
    const idx = Math.floor(phase) % PALETTE.length;
    const nextIdx = (idx + 1) % PALETTE.length;
    const t = phase - Math.floor(phase);
    const a = PALETTE[idx];
    const b = PALETTE[nextIdx];
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
      label: "auto",
    };
  }, []);

  const drawStrokeBetween = useCallback(
    (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      speed: number,
    ) => {
      // Advance auto color phase while drawing
      if (autoColorRef.current) {
        autoColorPhaseRef.current += 0.003;
      }
      const color = getCurrentColor();
      const baseRadius = BRUSH_SIZES[brushSizeRef.current];

      // Brush size varies with speed: slower = larger
      const speedFactor = Math.max(0.5, 1 - speed * 0.0015);
      const radius = baseRadius * speedFactor;

      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.25)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x0 + dx * t;
        const y = y0 + dy * t;

        // Random offset for organic feel
        const jitter = radius * 0.2;
        const jx = x + (Math.random() - 0.5) * jitter;
        const jy = y + (Math.random() - 0.5) * jitter;

        // Vary opacity per dot for watercolor texture
        const baseOpacity = 0.05 + Math.random() * 0.035; // 0.05-0.085
        const dotRadius = radius + (Math.random() - 0.5) * radius * 0.3;

        drawBrushDot(jx, jy, dotRadius, color, baseOpacity);
      }

      // Draw bleed effect at a few points along the stroke
      const bleedSteps = Math.max(1, Math.ceil(dist / (radius * 2)));
      for (let i = 0; i <= bleedSteps; i++) {
        const t = i / bleedSteps;
        const bx = x0 + dx * t + (Math.random() - 0.5) * radius * 0.5;
        const by = y0 + dy * t + (Math.random() - 0.5) * radius * 0.5;
        drawBleed(bx, by, radius, color);
      }
    },
    [drawBrushDot, drawBleed],
  );

  // ── Fade/clear trigger ────────────────────────────────────────────

  const triggerFade = useCallback(() => {
    if (fadingRef.current) return;
    const offscreen = getOffscreen();
    const offCtx = offscreen.getContext("2d")!;
    fadeSnapshotRef.current = offCtx.getImageData(
      0,
      0,
      offscreen.width,
      offscreen.height,
    );
    fadingRef.current = true;
    fadeStartRef.current = performance.now();
  }, [getOffscreen]);

  // ── Pointer handlers ────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Dismiss instruction on first touch
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        setShowInstruction(false);
      }

      drawingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = performance.now();
      playDabSound();

      // Advance auto color phase
      if (autoColorRef.current) {
        autoColorPhaseRef.current += 0.003;
      }
      const color = getCurrentColor();
      const radius = BRUSH_SIZES[brushSizeRef.current];
      drawBrushDot(e.clientX, e.clientY, radius, color, 0.06);
      drawBleed(e.clientX, e.clientY, radius, color);
    },
    [drawBrushDot, drawBleed, getCurrentColor],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current || !lastPosRef.current) return;

      const now = performance.now();
      const dt = now - lastTimeRef.current;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dt > 0 ? dist / dt : 0;

      drawStrokeBetween(
        lastPosRef.current.x,
        lastPosRef.current.y,
        e.clientX,
        e.clientY,
        speed * 1000, // px/sec
      );

      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;
    },
    [drawStrokeBetween],
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // ── Device shake detection ──────────────────────────────────────

  useEffect(() => {
    let lastShake = 0;
    let lastAccel = { x: 0, y: 0, z: 0 };

    function handleMotion(e: DeviceMotionEvent) {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const dx = acc.x - lastAccel.x;
      const dy = acc.y - lastAccel.y;
      const dz = acc.z - lastAccel.z;
      const force = Math.sqrt(dx * dx + dy * dy + dz * dz);

      lastAccel = { x: acc.x, y: acc.y, z: acc.z };

      if (force > 25) {
        const now = performance.now();
        if (now - lastShake > 2500 && !fadingRef.current) {
          lastShake = now;
          triggerFade();
        }
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [triggerFade]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-midnight" role="application" aria-label="Color wash - draw with your finger or mouse to paint calming colors">
      <p className="sr-only">A freeform drawing canvas. Drag your finger or mouse to paint soft, glowing colors. Shake to clear the canvas. The gentle movement helps your nervous system settle.</p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Instruction overlay — fades out on first touch */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-1000 ${
          showInstruction ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showInstruction}
      >
        <p className="text-lg tracking-wide text-cream-dim/40 select-none">
          Draw with your finger
        </p>
      </div>

      {/* Top bar: back + clear */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-y-px"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Games
        </Link>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], "color-wash.png", { type: "image/png" });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  try { await navigator.share({ files: [file], title: "My Color Wash" }); } catch {}
                } else {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "color-wash.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }, "image/png");
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
            aria-label="Save artwork"
          >
            Save
          </button>
          <button
            onClick={triggerFade}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
            aria-label="Clear canvas"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bottom toolbar: color palette + brush size + how this helps */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-5 pb-5">
        {/* Color palette and brush size row */}
        <div
          className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-deep/70 px-4 py-3 backdrop-blur-sm"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Auto color toggle */}
          <button
            onClick={() => setAutoColor(!autoColor)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-all duration-200 ${
              autoColor
                ? "bg-teal/20 text-teal-soft"
                : "bg-cream/8 text-cream-dim/50"
            }`}
            aria-label={autoColor ? "Auto color on" : "Auto color off"}
          >
            Auto
          </button>

          {/* Color swatches */}
          <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Brush color">
            {PALETTE.map((c, i) => (
              <button
                key={c.label}
                onClick={() => {
                  setSelectedColor(i);
                  setAutoColor(false);
                }}
                className={`h-7 w-7 rounded-full transition-all duration-200 ${
                  !autoColor && selectedColor === i
                    ? "ring-2 ring-cream/70 ring-offset-2 ring-offset-deep/80 scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` }}
                role="radio"
                aria-checked={!autoColor && selectedColor === i}
                aria-label={c.label}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-cream-dim/20" />

          {/* Brush sizes */}
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Brush size">
            {(["S", "M", "L"] as BrushSize[]).map((size) => {
              const dotSize = size === "S" ? "h-2.5 w-2.5" : size === "M" ? "h-4 w-4" : "h-5.5 w-5.5";
              return (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    brushSize === size
                      ? "bg-cream/15"
                      : "hover:bg-cream/8"
                  }`}
                  role="radio"
                  aria-checked={brushSize === size}
                  aria-label={`${size === "S" ? "Small" : size === "M" ? "Medium" : "Large"} brush`}
                >
                  <span
                    className={`${dotSize} rounded-full ${
                      brushSize === size ? "bg-cream" : "bg-cream-dim/60"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* How this helps */}
        <div
          className="pointer-events-auto w-full max-w-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
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
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showHelp ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-teal/15 bg-deep/80 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Repetitive, gentle movement with no goal gives your nervous system
              permission to slow down. The colors and motion engage your senses
              without demanding anything from you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
