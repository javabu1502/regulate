"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";

// ─── Colors ─────────────────────────────────────────────────────────

const RIPPLE_PALETTE = [
  { r: 94, g: 234, b: 212 },  // teal #5eead4
  { r: 153, g: 246, b: 228 }, // teal-soft #99f6e4
  { r: 250, g: 245, b: 239 }, // cream #faf5ef
  { r: 125, g: 211, b: 200 }, // muted teal
  { r: 180, g: 240, b: 225 }, // light teal
];

// ─── Types ──────────────────────────────────────────────────────────

interface Ripple {
  x: number;
  y: number;
  rings: RippleRing[];
  birth: number;
}

interface RippleRing {
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  color: { r: number; g: number; b: number };
  lineWidth: number;
}

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playDropSound() {
  try {
    if (!isGameSoundEnabled()) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Water drop: quick sine with fast decay
    osc.type = "sine";
    const baseFreq = 400 + Math.random() * 200;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      baseFreq * 0.4,
      ctx.currentTime + 0.3,
    );

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    // Simple reverb-like tail using delay
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.08;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.3;

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

let tapCount = 0;

function createRipple(x: number, y: number, small: boolean = false): Ripple {
  tapCount++;
  const ringCount = small ? 2 : 3;
  const rings: RippleRing[] = [];

  // Every 5th tap: random color from palette; else default teal
  const useSpecialColor = tapCount % 5 === 0;
  const baseColor = useSpecialColor
    ? RIPPLE_PALETTE[Math.floor(Math.random() * RIPPLE_PALETTE.length)]
    : RIPPLE_PALETTE[0]; // teal

  for (let i = 0; i < ringCount; i++) {
    rings.push({
      radius: 0,
      maxRadius: small ? 60 + i * 25 : 120 + i * 40 + Math.random() * 30,
      speed: small ? 1.2 + i * 0.15 : 1.5 + i * 0.2,
      opacity: small ? 0.4 : 0.5 - i * 0.1,
      color: i === 0 ? baseColor : RIPPLE_PALETTE[Math.min(i, RIPPLE_PALETTE.length - 1)],
      lineWidth: small ? 1 : 1.5 - i * 0.2,
    });
  }

  return { x, y, rings, birth: Date.now() };
}

// ─── Affirmations ───────────────────────────────────────────────────

const RIPPLE_AFFIRMATIONS = [
  "You are here.",
  "This moment is enough.",
  "Breathe.",
  "You are safe.",
  "Let it pass.",
  "Nothing to fix right now.",
  "Just be.",
  "You're okay.",
  "Soften.",
  "One breath at a time.",
  "You don't have to hold it all.",
  "Rest here.",
];

// ─── Component ──────────────────────────────────────────────────────

export default function RipplePoolPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragThrottleRef = useRef(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showAffirmations, setShowAffirmations] = useState(true);
  const [currentAffirmation, setCurrentAffirmation] = useState<string | null>(null);
  const [affirmationVisible, setAffirmationVisible] = useState(false);
  const affirmationIndexRef = useRef(0);

  // Cycle affirmations every ~12 seconds
  useEffect(() => {
    if (!showAffirmations) {
      setCurrentAffirmation(null);
      setAffirmationVisible(false);
      return;
    }

    // Show first one after 5 seconds
    const initialDelay = setTimeout(() => {
      setCurrentAffirmation(RIPPLE_AFFIRMATIONS[0]);
      setAffirmationVisible(true);
      affirmationIndexRef.current = 1;
    }, 5000);

    const interval = setInterval(() => {
      // Fade out
      setAffirmationVisible(false);

      // After fade out, swap text and fade in
      setTimeout(() => {
        const idx = affirmationIndexRef.current % RIPPLE_AFFIRMATIONS.length;
        setCurrentAffirmation(RIPPLE_AFFIRMATIONS[idx]);
        setAffirmationVisible(true);
        affirmationIndexRef.current = idx + 1;
      }, 1500);
    }, 12000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [showAffirmations]);

  // ── Create ripple at position ─────────────────────────────────

  const addRipple = useCallback((x: number, y: number, small: boolean = false) => {
    ripplesRef.current.push(createRipple(x, y, small));
    if (!small) {
      playDropSound();
    }
    haptics.subtle();
  }, []);

  // ── Main effect ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    // ── Draw water surface gradient ───────────────────────────
    function drawWaterSurface() {
      // Base: deep dark blue-black
      const grad = ctx!.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.7,
      );
      grad.addColorStop(0, "rgba(18, 28, 50, 1)");    // slightly lighter center
      grad.addColorStop(0.5, "rgba(15, 22, 41, 1)");   // deep
      grad.addColorStop(1, "rgba(10, 15, 30, 1)");     // midnight edges

      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);
    }

    // ── Animation loop ────────────────────────────────────────
    function draw() {
      drawWaterSurface();

      const ripples = ripplesRef.current;

      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        let allDone = true;

        for (const ring of ripple.rings) {
          ring.radius += ring.speed;

          // Fade as ring expands
          const progress = ring.radius / ring.maxRadius;
          const currentOpacity = ring.opacity * (1 - progress);

          if (progress >= 1) continue;
          allDone = false;

          // Check for intersections with other ripples for brightness boost
          let intersectionBoost = 0;
          for (let j = 0; j < ripples.length; j++) {
            if (j === i) continue;
            const other = ripples[j];
            const dx = ripple.x - other.x;
            const dy = ripple.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            for (const otherRing of other.rings) {
              const otherProgress = otherRing.radius / otherRing.maxRadius;
              if (otherProgress >= 1) continue;

              // If rings are close to touching, boost brightness
              const ringDiff = Math.abs(dist - (ring.radius + otherRing.radius));
              const ringOverlap = Math.abs(dist - Math.abs(ring.radius - otherRing.radius));
              const closeness = Math.min(ringDiff, ringOverlap);

              if (closeness < 15) {
                intersectionBoost += 0.15 * (1 - closeness / 15) * (1 - otherProgress);
              }
            }
          }

          const finalOpacity = Math.min(0.8, currentOpacity + intersectionBoost);

          // Draw ring
          ctx!.beginPath();
          ctx!.arc(ripple.x, ripple.y, ring.radius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${ring.color.r}, ${ring.color.g}, ${ring.color.b}, ${finalOpacity})`;
          ctx!.lineWidth = ring.lineWidth * (1 - progress * 0.5);
          ctx!.stroke();

          // Subtle glow around ring
          if (finalOpacity > 0.1) {
            ctx!.beginPath();
            ctx!.arc(ripple.x, ripple.y, ring.radius, 0, Math.PI * 2);
            ctx!.strokeStyle = `rgba(${ring.color.r}, ${ring.color.g}, ${ring.color.b}, ${finalOpacity * 0.15})`;
            ctx!.lineWidth = ring.lineWidth * 4 * (1 - progress);
            ctx!.stroke();
          }
        }

        if (allDone) {
          ripples.splice(i, 1);
        }
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
      isDraggingRef.current = true;
      lastDragPosRef.current = { x: e.clientX, y: e.clientY };
      dragThrottleRef.current = 0;
      addRipple(e.clientX, e.clientY);
    },
    [addRipple],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      dragThrottleRef.current++;
      // Create trail ripples every few pixels moved
      if (dragThrottleRef.current % 3 === 0) {
        const last = lastDragPosRef.current;
        if (last) {
          const dx = e.clientX - last.x;
          const dy = e.clientY - last.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 15) {
            addRipple(e.clientX, e.clientY, true);
            lastDragPosRef.current = { x: e.clientX, y: e.clientY };
          }
        }
      }
    },
    [addRipple],
  );

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Ripple pool - tap the water to create ripples"
    >
      <p className="sr-only">
        A still, dark pool of water. Tap anywhere to create expanding ripples.
        Drag your finger to leave a trail of ripples. A calming, meditative
        experience.
      </p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Top bar — back + affirmation toggle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
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

        <button
          onClick={() => setShowAffirmations(!showAffirmations)}
          onPointerDown={(e) => e.stopPropagation()}
          className={`pointer-events-auto rounded-full px-3 py-1.5 text-xs backdrop-blur-sm transition-all ${
            showAffirmations
              ? "bg-teal/15 text-teal-soft/70"
              : "bg-deep/60 text-cream-dim/40"
          }`}
        >
          {showAffirmations ? "Affirmations on" : "Affirmations off"}
        </button>
      </div>

      {/* Floating affirmation — tappable to dismiss, with ripple animation */}
      {currentAffirmation && showAffirmations && (
        <div
          className="absolute inset-x-0 top-1/3 z-10 flex justify-center"
          style={{ pointerEvents: affirmationVisible ? "auto" : "none" }}
        >
          <button
            onClick={() => {
              setAffirmationVisible(false);
              addRipple(window.innerWidth / 2, window.innerHeight / 3, true);
            }}
            className="max-w-[280px] text-center text-lg font-light tracking-wide text-teal-soft/50 select-none"
            style={{
              opacity: affirmationVisible ? 1 : 0,
              transition: "opacity 1.5s ease-in-out, transform 1.5s ease-in-out",
              transform: affirmationVisible ? "scale(1)" : "scale(0.8)",
              animation: affirmationVisible ? "affirmationRipple 3s ease-in-out infinite" : "none",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {currentAffirmation}
          </button>
        </div>
      )}

      <style>{`
        @keyframes affirmationRipple {
          0%, 100% {
            text-shadow: 0 0 8px rgba(94, 234, 212, 0.15);
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 20px rgba(94, 234, 212, 0.3), 0 0 40px rgba(94, 234, 212, 0.1);
            transform: scale(1.03);
          }
        }
      `}</style>

      {/* How this helps */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
        <div className="pointer-events-auto w-full max-w-md">
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
              Watching ripples spread is one of the simplest ways to practice
              present-moment awareness. Each tap brings you back to right now.
              The expanding circles mirror the way calm can spread through your
              body.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
