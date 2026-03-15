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
  placedAt: number;
}

interface Constellation {
  // The full path the finger drew (for smooth lines)
  path: { x: number; y: number }[];
  // Stars placed along the path
  stars: PlacedStar[];
  opacity: number;
  targetOpacity: number;
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

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Audio ─────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playPlaceSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const freq = 600 + Math.random() * 300;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.1);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {
    // Audio not available
  }
}

// ── Component ─────────────────────────────────────────────────────────

export default function StarCreatorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef(0);
  const bgStarsRef = useRef<BackgroundStar[]>([]);
  const sparklesRef = useRef<SparkleParticle[]>([]);

  // Current in-progress path while dragging
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const currentStarsRef = useRef<PlacedStar[]>([]);
  const lastStarPosRef = useRef<{ x: number; y: number } | null>(null);

  // Completed constellations
  const completedRef = useRef<Constellation[]>([]);
  const hasLoadedRef = useRef(false);

  // Load saved constellations
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      const saved = localStorage.getItem("regulate-stars-constellations");
      if (saved) {
        const parsed = JSON.parse(saved) as Constellation[];
        completedRef.current = parsed;
        countRef.current = parsed.length;
        setCount(parsed.length);
      }
    } catch {}
  }, []);

  // Pointer state
  const pointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Fade-out animation for clear
  const clearingRef = useRef(false);
  const clearOpacityRef = useRef(1);

  const [count, setCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<"draw" | "tap">("draw");
  const [showHint, setShowHint] = useState(false);

  // Show first-time hint
  useEffect(() => {
    try {
      if (!localStorage.getItem("regulate-stars-hint-seen")) {
        setShowHint(true);
      }
    } catch {}
  }, []);
  const modeRef = useRef<"draw" | "tap">("draw");
  const countRef = useRef(0);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Line draw animations for tap mode
  const lineAnimsRef = useRef<{ fromIdx: number; startFrame: number; duration: number }[]>([]);

  // ── Finish current constellation ────────────────────────────────

  const finishConstellation = useCallback(() => {
    const path = currentPathRef.current;
    const stars = currentStarsRef.current;
    if (stars.length < 2 || path.length < 2) {
      currentPathRef.current = [];
      currentStarsRef.current = [];
      lastStarPosRef.current = null;
      return;
    }

    completedRef.current.push({
      path: [...path],
      stars: [...stars],
      opacity: 1,
      targetOpacity: 0.08,
    });

    currentPathRef.current = [];
    currentStarsRef.current = [];
    lastStarPosRef.current = null;

    countRef.current += 1;
    setCount(countRef.current);
    haptics.complete();

    // Persist constellations
    try {
      const toSave = completedRef.current.map(c => ({
        path: c.path,
        stars: c.stars,
        opacity: c.targetOpacity,
        targetOpacity: c.targetOpacity,
      }));
      localStorage.setItem("regulate-stars-constellations", JSON.stringify(toSave));
    } catch {}
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

  // ── Sparkle helper ──────────────────────────────────────────────

  const addSparkles = useCallback((x: number, y: number, n = 2) => {
    if (sparklesRef.current.length >= 40) return;
    for (let i = 0; i < n; i++) {
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

    // ── Draw a smooth path ─────────────────────────────────────

    function drawPath(
      path: { x: number; y: number }[],
      opacity: number,
      lineWidth: number,
    ) {
      if (path.length < 2) return;
      ctx!.strokeStyle = `rgba(94, 234, 212, ${opacity})`;
      ctx!.lineWidth = lineWidth;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(path[0].x, path[0].y);

      // Use quadratic curves for smoothness
      if (path.length === 2) {
        ctx!.lineTo(path[1].x, path[1].y);
      } else {
        for (let i = 1; i < path.length - 1; i++) {
          const midX = (path[i].x + path[i + 1].x) / 2;
          const midY = (path[i].y + path[i + 1].y) / 2;
          ctx!.quadraticCurveTo(path[i].x, path[i].y, midX, midY);
        }
        const last = path[path.length - 1];
        ctx!.lineTo(last.x, last.y);
      }
      ctx!.stroke();
    }

    // ── Animation loop ──────────────────────────────────────────

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx!.fillStyle = "#0a0f1e";
      ctx!.fillRect(0, 0, w, h);

      frameRef.current += 1;
      const frame = frameRef.current;

      // Global opacity for clearing
      let globalOpacity = 1;
      if (clearingRef.current) {
        clearOpacityRef.current -= 0.02;
        globalOpacity = Math.max(0, clearOpacityRef.current);
        if (globalOpacity <= 0) {
          clearingRef.current = false;
          clearOpacityRef.current = 1;
          completedRef.current = [];
          currentPathRef.current = [];
          currentStarsRef.current = [];
          lastStarPosRef.current = null;
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
        if (c.opacity > c.targetOpacity) {
          c.opacity = Math.max(c.targetOpacity, c.opacity - 0.005);
        }

        const op = c.opacity * globalOpacity;

        // Draw smooth path
        drawPath(c.path, op * 0.5, 1.5);

        // Stars
        for (const s of c.stars) {
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(153, 246, 228, ${op * 0.7})`;
          ctx!.fill();
        }
      }

      // ── Current constellation ───────────────────────────────
      const currentPath = currentPathRef.current;
      const currentStars = currentStarsRef.current;

      // Draw mode: draw the smooth path
      if (modeRef.current === "draw" && currentPath.length > 1) {
        drawPath(currentPath, 0.5 * globalOpacity, 2);
      }

      // Tap mode: draw animated lines between stars
      if (modeRef.current === "tap" && currentStars.length >= 2) {
        for (let i = 0; i < currentStars.length - 1; i++) {
          const from = currentStars[i];
          const to = currentStars[i + 1];
          // Find animation for this segment
          const anim = lineAnimsRef.current.find(a => a.fromIdx === i);
          let progress = 1;
          if (anim) {
            progress = Math.min(1, (frame - anim.startFrame) / anim.duration);
          }
          const endX = from.x + (to.x - from.x) * progress;
          const endY = from.y + (to.y - from.y) * progress;
          ctx!.strokeStyle = `rgba(94, 234, 212, ${0.5 * globalOpacity})`;
          ctx!.lineWidth = 2;
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(from.x, from.y);
          ctx!.lineTo(endX, endY);
          ctx!.stroke();
        }
      }

      // Draw current stars with glow
      for (const star of currentStars) {
        const age = frame - star.placedAt;
        const pulseIntensity = Math.max(0, 1 - age / 60);
        const pulse = 1 + 0.3 * pulseIntensity * Math.sin(age * 0.15);
        const glowRadius = 18 * pulse;

        // Glow
        const glow = ctx!.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, glowRadius,
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

  // ── Mode toggle ─────────────────────────────────────────────

  const toggleMode = useCallback(() => {
    const next = modeRef.current === "draw" ? "tap" : "draw";
    modeRef.current = next;
    setMode(next);
    // Reset any in-progress constellation on mode switch
    currentPathRef.current = [];
    currentStarsRef.current = [];
    lastStarPosRef.current = null;
    lastTapRef.current = null;
    lineAnimsRef.current = [];
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== canvasRef.current) return;

      const pos = { x: e.clientX, y: e.clientY };

      if (modeRef.current === "draw") {
        pointerDownRef.current = true;
        isDraggingRef.current = false;

        // Start a new path
        currentPathRef.current = [pos];
        currentStarsRef.current = [{
          x: pos.x,
          y: pos.y,
          placedAt: frameRef.current,
        }];
        lastStarPosRef.current = pos;

        addSparkles(pos.x, pos.y, 4);
        playPlaceSound();
        haptics.tap();
      } else {
        // Tap mode — place a star, connect to previous
        const now = Date.now();
        const lastTap = lastTapRef.current;

        // Double-tap to finish constellation (within 400ms and 50px)
        if (lastTap && now - lastTap.time < 400 && dist(pos, lastTap) < 50) {
          lastTapRef.current = null;
          if (currentStarsRef.current.length >= 2) {
            finishConstellation();
          }
          return;
        }

        lastTapRef.current = { time: now, x: pos.x, y: pos.y };

        // Place new star
        const newStar: PlacedStar = {
          x: pos.x,
          y: pos.y,
          placedAt: frameRef.current,
        };

        const stars = currentStarsRef.current;

        // Add line segment from previous star
        if (stars.length > 0) {
          const prev = stars[stars.length - 1];
          // Add path points for the line
          currentPathRef.current.push({ x: prev.x, y: prev.y });
          currentPathRef.current.push(pos);
          // Animate the line
          lineAnimsRef.current.push({
            fromIdx: stars.length - 1,
            startFrame: frameRef.current,
            duration: 15,
          });
        } else {
          currentPathRef.current = [pos];
        }

        stars.push(newStar);
        lastStarPosRef.current = pos;

        addSparkles(pos.x, pos.y, 4);
        playPlaceSound();
        haptics.tap();
      }
    },
    [addSparkles, finishConstellation],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (modeRef.current === "tap") return;
      if (!pointerDownRef.current) return;

      isDraggingRef.current = true;
      const pos = { x: e.clientX, y: e.clientY };

      // Add to path (thin out points that are too close)
      const path = currentPathRef.current;
      if (path.length > 0) {
        const last = path[path.length - 1];
        if (dist(last, pos) >= 4) {
          path.push(pos);
        }
      }

      // Place a star every ~70px
      const lastStar = lastStarPosRef.current;
      if (lastStar && dist(lastStar, pos) >= 70) {
        currentStarsRef.current.push({
          x: pos.x,
          y: pos.y,
          placedAt: frameRef.current,
        });
        lastStarPosRef.current = pos;
        addSparkles(pos.x, pos.y, 3);
        playPlaceSound();
      }

      // Trail sparkles
      if (Math.random() < 0.3) {
        addSparkles(pos.x, pos.y, 1);
      }
    },
    [addSparkles],
  );

  const onPointerUp = useCallback(() => {
    if (modeRef.current === "tap") return;
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;

    // Add a final star at the end if far enough from last
    const path = currentPathRef.current;
    const lastStar = lastStarPosRef.current;
    if (path.length > 0 && lastStar) {
      const endPos = path[path.length - 1];
      if (dist(lastStar, endPos) > 20) {
        currentStarsRef.current.push({
          x: endPos.x,
          y: endPos.y,
          placedAt: frameRef.current,
        });
      }
    }

    // Auto-finish if we drew something
    if (currentStarsRef.current.length >= 2) {
      finishConstellation();
    } else {
      // Just a tap — keep the single star visible briefly, then clear
      if (currentStarsRef.current.length === 1) {
        const star = currentStarsRef.current[0];
        completedRef.current.push({
          path: [{ x: star.x, y: star.y }],
          stars: [star],
          opacity: 0.8,
          targetOpacity: 0.08,
        });
      }
      currentPathRef.current = [];
      currentStarsRef.current = [];
      lastStarPosRef.current = null;
    }

    isDraggingRef.current = false;
  }, [finishConstellation]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      style={{ backgroundColor: "#0a0f1e" }}
      role="application"
      aria-label="Constellation creator — drag to draw constellations in the sky"
    >
      <p className="sr-only">
        Draw constellations by dragging your finger across the sky. Stars appear
        along your path, connected by glowing lines. Each stroke becomes its own
        constellation.
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

      {/* First-time hint overlay */}
      {showHint && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          onClick={() => {
            setShowHint(false);
            try { localStorage.setItem("regulate-stars-hint-seen", "1"); } catch {}
          }}
        >
          <div className="max-w-[260px] rounded-2xl border border-teal/20 bg-deep/90 px-6 py-5 text-center backdrop-blur-md">
            <p className="text-sm leading-relaxed text-cream">
              Drag your finger across the sky to draw constellations. Switch to Tap mode to place stars one by one.
            </p>
            <p className="mt-3 text-[11px] text-cream-dim/40">Tap anywhere to start</p>
          </div>
        </div>
      )}

      {/* Counter */}
      <div className="pointer-events-none absolute right-5 top-5 z-10">
        <span className="text-xs text-cream-dim/40">
          {count > 0
            ? `${count} constellation${count !== 1 ? "s" : ""}`
            : mode === "draw" ? "Draw across the sky" : "Tap to place stars, double-tap to finish"}
        </span>
      </div>

      {/* Bottom toolbar */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 p-5"
        data-ui
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full px-1 py-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={toggleMode}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-deep/70 px-4 py-2.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream active:scale-95"
            aria-label={`Switch to ${mode === "draw" ? "tap" : "draw"} mode`}
          >
            {mode === "draw" ? "Draw" : "Tap"}
          </button>
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], "constellation.png", { type: "image/png" });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  try { await navigator.share({ files: [file], title: "My Constellation" }); } catch {}
                } else {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "constellation.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }, "image/png");
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-deep/70 px-4 py-2.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream active:scale-95"
            aria-label="Save constellation image"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5 7l3 3 3-3M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Save
          </button>
          <button
            onClick={clearAll}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full bg-deep/70 px-4 py-2.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream active:scale-95"
            aria-label="Clear all constellations"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Clear sky
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
              Drawing patterns engages your motor cortex and visual focus at the
              same time. This kind of dual-attention task is similar to bilateral
              stimulation &mdash; it helps your brain process and settle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
