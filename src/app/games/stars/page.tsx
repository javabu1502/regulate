"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ── Types ─────────────────────────────────────────────────────────────

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface PlacedStar {
  x: number;
  y: number;
  placedAt: number; // frame when placed, for pulse animation
}

interface Constellation {
  stars: PlacedStar[];
  opacity: number;
  targetOpacity: number;
}

interface LineAnim {
  fromIdx: number;
  startFrame: number;
  duration: number; // frames
}

// ── Helpers ───────────────────────────────────────────────────────────

function generateBackgroundStars(
  w: number,
  h: number,
  count: number,
): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

// ── Component ─────────────────────────────────────────────────────────

export default function StarCreatorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef(0);
  const bgStarsRef = useRef<BackgroundStar[]>([]);
  const sparklesRef = useRef<SparkleParticle[]>([]);

  // Current in-progress constellation
  const currentStarsRef = useRef<PlacedStar[]>([]);
  // Line draw animations for current constellation
  const lineAnimsRef = useRef<LineAnim[]>([]);
  // Completed constellations
  const completedRef = useRef<Constellation[]>([]);

  // Pointer position for sparkle trail
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef(false);

  // Double-tap detection
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );

  // Fade-out animation for clear
  const clearingRef = useRef(false);
  const clearOpacityRef = useRef(1);

  const [count, setCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Force re-render for count (we read refs in canvas, but count is React state)
  const countRef = useRef(0);

  // ── Finish current constellation ────────────────────────────────

  const finishConstellation = useCallback(() => {
    const stars = currentStarsRef.current;
    if (stars.length < 2) return; // need at least 2 stars to form a constellation

    // Move to completed
    completedRef.current.push({
      stars: [...stars],
      opacity: 1,
      targetOpacity: 0.06,
    });

    // Clear current
    currentStarsRef.current = [];
    lineAnimsRef.current = [];

    // Update count
    countRef.current += 1;
    setCount(countRef.current);

    haptics.complete();
  }, []);

  // ── Undo last star ──────────────────────────────────────────────

  const undoStar = useCallback(() => {
    const stars = currentStarsRef.current;
    if (stars.length === 0) return;
    stars.pop();
    // Remove the line animation that connected TO the removed star
    if (lineAnimsRef.current.length > 0) {
      lineAnimsRef.current.pop();
    }
    haptics.tap();
  }, []);

  // ── Clear all ───────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    if (
      completedRef.current.length === 0 &&
      currentStarsRef.current.length === 0
    )
      return;

    clearingRef.current = true;
    clearOpacityRef.current = 1;
    haptics.tap();
  }, []);

  // ── Place a star ────────────────────────────────────────────────

  const placeStar = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      const lastTap = lastTapRef.current;

      // Double-tap detection
      if (
        lastTap &&
        now - lastTap.time < 250 &&
        Math.abs(x - lastTap.x) < 50 &&
        Math.abs(y - lastTap.y) < 50
      ) {
        lastTapRef.current = null;
        finishConstellation();
        return;
      }

      lastTapRef.current = { time: now, x, y };

      const frame = frameRef.current;
      const stars = currentStarsRef.current;

      // Add line animation if there's a previous star
      if (stars.length > 0) {
        lineAnimsRef.current.push({
          fromIdx: stars.length - 1,
          startFrame: frame,
          duration: 12, // ~200ms at 60fps
        });
      }

      stars.push({ x, y, placedAt: frame });
      haptics.tap();
    },
    [finishConstellation],
  );

  // ── Sparkle helper ──────────────────────────────────────────────

  const addSparkles = useCallback((x: number, y: number) => {
    // Cap sparkles at 30 max for performance on older devices
    if (sparklesRef.current.length >= 30) return;
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      sparklesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }, []);

  // ── Setup ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgStarsRef.current = generateBackgroundStars(w, h, 100);
    }

    resize();
    window.addEventListener("resize", resize);

    // ── Animation loop ──────────────────────────────────────────

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Background fill
      ctx!.fillStyle = "#0a0f1e";
      ctx!.fillRect(0, 0, w, h);

      frameRef.current += 1;
      const frame = frameRef.current;

      // Global opacity multiplier for clearing
      let globalOpacity = 1;
      if (clearingRef.current) {
        clearOpacityRef.current -= 0.02; // fade over ~50 frames (~0.8s)
        globalOpacity = Math.max(0, clearOpacityRef.current);
        if (globalOpacity <= 0) {
          clearingRef.current = false;
          clearOpacityRef.current = 1;
          completedRef.current = [];
          currentStarsRef.current = [];
          lineAnimsRef.current = [];
          sparklesRef.current = [];
          countRef.current = 0;
          setCount(0);
        }
      }

      // ── Background stars ────────────────────────────────────
      for (const s of bgStarsRef.current) {
        const twinkle =
          0.15 +
          0.2 *
            Math.sin(frame * 0.02 * s.twinkleSpeed + s.twinkleOffset);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(250, 245, 239, ${twinkle})`;
        ctx!.fill();
      }

      // ── Completed constellations ────────────────────────────
      for (const c of completedRef.current) {
        // Ease opacity toward target
        if (c.opacity > c.targetOpacity) {
          c.opacity = Math.max(
            c.targetOpacity,
            c.opacity - 0.007, // ~2s to fade from 1 to 0.15
          );
        }

        const op = c.opacity * globalOpacity;

        // Lines
        if (c.stars.length > 1) {
          ctx!.strokeStyle = `rgba(94, 234, 212, ${op * 0.4})`;
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.moveTo(c.stars[0].x, c.stars[0].y);
          for (let i = 1; i < c.stars.length; i++) {
            ctx!.lineTo(c.stars[i].x, c.stars[i].y);
          }
          ctx!.stroke();
        }

        // Stars
        for (const s of c.stars) {
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(153, 246, 228, ${op * 0.6})`;
          ctx!.fill();
        }
      }

      // ── Current constellation lines ─────────────────────────
      const currentStars = currentStarsRef.current;
      const lineAnims = lineAnimsRef.current;

      if (currentStars.length > 1) {
        ctx!.strokeStyle = `rgba(94, 234, 212, ${0.4 * globalOpacity})`;
        ctx!.lineWidth = 2;

        for (let i = 0; i < lineAnims.length; i++) {
          const anim = lineAnims[i];
          const fromStar = currentStars[anim.fromIdx];
          const toStar = currentStars[anim.fromIdx + 1];
          if (!fromStar || !toStar) continue;

          const elapsed = frame - anim.startFrame;
          const progress = Math.min(1, elapsed / anim.duration);

          // Ease out
          const eased = 1 - (1 - progress) * (1 - progress);

          const cx = fromStar.x + (toStar.x - fromStar.x) * eased;
          const cy = fromStar.y + (toStar.y - fromStar.y) * eased;

          ctx!.beginPath();
          ctx!.moveTo(fromStar.x, fromStar.y);
          ctx!.lineTo(cx, cy);
          ctx!.stroke();
        }
      }

      // ── Current constellation stars ─────────────────────────
      for (const star of currentStars) {
        const age = frame - star.placedAt;
        // Pulse effect that fades over time
        const pulseIntensity = Math.max(0, 1 - age / 60);
        const pulse = 1 + 0.3 * pulseIntensity * Math.sin(age * 0.15);
        const glowRadius = 20 * pulse;

        // Glow
        const glow = ctx!.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          glowRadius,
        );
        const glowAlpha = (0.4 + 0.2 * pulseIntensity) * globalOpacity;
        glow.addColorStop(0, `rgba(153, 246, 228, ${glowAlpha})`);
        glow.addColorStop(0.5, `rgba(153, 246, 228, ${glowAlpha * 0.3})`);
        glow.addColorStop(1, "rgba(153, 246, 228, 0)");
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, 4 * pulse, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(153, 246, 228, ${0.9 * globalOpacity})`;
        ctx!.fill();
      }

      // ── Sparkle particles ──────────────────────────────────
      const sparkles = sparklesRef.current;
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const p = sparkles[i];
        p.life += 1;
        if (p.life > p.maxLife) {
          sparkles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        const lifeRatio = 1 - p.life / p.maxLife;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(153, 246, 228, ${0.6 * lifeRatio * globalOpacity})`;
        ctx!.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore if target is not the canvas itself (e.g. buttons, links, toolbar)
      if (e.target !== canvasRef.current) return;

      pointerDownRef.current = true;
      pointerRef.current = { x: e.clientX, y: e.clientY };
      lastDragStarRef.current = { x: e.clientX, y: e.clientY };
      placeStar(e.clientX, e.clientY);
      addSparkles(e.clientX, e.clientY);
    },
    [placeStar, addSparkles],
  );

  // Track last drag-placed star position to throttle placement
  const lastDragStarRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (pointerDownRef.current) {
        addSparkles(e.clientX, e.clientY);

        // Place stars while dragging, spaced at least 40px apart
        const last = lastDragStarRef.current;
        if (last) {
          const dx = e.clientX - last.x;
          const dy = e.clientY - last.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= 40) {
            placeStar(e.clientX, e.clientY);
            lastDragStarRef.current = { x: e.clientX, y: e.clientY };
          }
        }
      }
    },
    [addSparkles, placeStar],
  );

  const onPointerUp = useCallback(() => {
    pointerDownRef.current = false;
    lastDragStarRef.current = null;
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      style={{ backgroundColor: "#0a0f1e" }}
      role="application"
      aria-label="Constellation creator - tap to place stars and create your own constellations"
    >
      <p className="sr-only">
        A constellation creation game. Tap anywhere on the sky to place stars.
        Each new star connects to the previous one. Double-tap or press New to
        finish a constellation and start a new one. Creating patterns is
        meditative and calming.
      </p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Back button */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 p-5"
        data-ui
      >
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
      </div>

      {/* Counter */}
      <div className="pointer-events-none absolute right-5 top-5 z-10">
        <span className="text-xs text-cream-dim/40">
          {count > 0
            ? `${count} constellation${count !== 1 ? "s" : ""}`
            : "Tap to place stars"}
        </span>
      </div>

      {/* Bottom toolbar */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 p-5"
        data-ui
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Toolbar buttons */}
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full bg-transparent px-1 py-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={undoStar}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-deep/70 px-4 py-2.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream active:scale-95"
            aria-label="Undo last star"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3 7h7a3 3 0 0 1 0 6H8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 4L3 7l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Undo
          </button>

          <button
            onClick={finishConstellation}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-teal/15 px-4 py-2.5 text-sm text-teal-soft backdrop-blur-sm transition-colors hover:bg-teal/25 active:scale-95"
            aria-label="Finish current constellation and start a new one"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New
          </button>

          <button
            onClick={clearAll}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-deep/70 px-4 py-2.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream active:scale-95"
            aria-label="Clear all constellations"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Clear
          </button>
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
              Tracing patterns engages your motor cortex and visual focus at the
              same time. This kind of dual-attention task is similar to bilateral
              stimulation &mdash; it helps your brain process and settle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
