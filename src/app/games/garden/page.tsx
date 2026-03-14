"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Constants ──────────────────────────────────────────────────────

const INHALE_DURATION = 4000; // ms
const EXHALE_DURATION = 6000; // ms

const FLOWER_COLORS = [
  "#5eead4", // teal
  "#f4845f", // coral
  "#c4b5fd", // lavender
  "#fcd34d", // candle
  "#f9a8d4", // pink
  "#86efac", // mint
];

// Simple SVG flower components
const FLOWER_VARIANTS = [
  // 6-petal daisy
  (color: string) => (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="20"
          cy="10"
          rx="5"
          ry="8"
          fill={color}
          opacity="0.8"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="4" fill="#fcd34d" />
    </svg>
  ),
  // 5-petal rounded
  (color: string) => (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle
          key={deg}
          cx="20"
          cy="11"
          r="6"
          fill={color}
          opacity="0.75"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3.5" fill="#fef3c7" />
    </svg>
  ),
  // 4-petal simple
  (color: string) => (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      {[0, 90, 180, 270].map((deg) => (
        <ellipse
          key={deg}
          cx="20"
          cy="11"
          rx="6"
          ry="9"
          fill={color}
          opacity="0.8"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="4" fill="#fed7aa" />
    </svg>
  ),
  // Cluster of circles
  (color: string) => (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      <circle cx="20" cy="14" r="6" fill={color} opacity="0.7" />
      <circle cx="14" cy="22" r="6" fill={color} opacity="0.6" />
      <circle cx="26" cy="22" r="6" fill={color} opacity="0.65" />
      <circle cx="20" cy="20" r="3" fill="#fef9c3" />
    </svg>
  ),
];

// ─── Types ──────────────────────────────────────────────────────────

type BreathPhase = "idle" | "inhale" | "exhale";

interface GardenFlower {
  id: number;
  x: number; // percentage
  y: number; // percentage
  color: string;
  variant: number;
  size: number; // px
  rotation: number; // deg
  scale: number; // final scale when settled
}

// ─── Stars (subtle background dots) ─────────────────────────────────

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1 + Math.random() * 1.5,
  opacity: 0.15 + Math.random() * 0.2,
}));

// ─── Component ──────────────────────────────────────────────────────

export default function BreathingGardenPage() {
  const [flowers, setFlowers] = useState<GardenFlower[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [breathProgress, setBreathProgress] = useState(0); // 0-1
  const [cycleCount, setCycleCount] = useState(0);

  const phaseStartRef = useRef(0);
  const animFrameRef = useRef(0);
  const flowerIdRef = useRef(0);
  const isHoldingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeFlowerRef = useRef<{ x: number; y: number; color: string; variant: number } | null>(null);

  // ── Animate the breathing circle + countdown ─────────────────────

  useEffect(() => {
    if (phase === "idle") return;

    const duration = phase === "inhale" ? INHALE_DURATION : EXHALE_DURATION;
    const totalSeconds = Math.ceil(duration / 1000);

    function tick() {
      const elapsed = Date.now() - phaseStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setBreathProgress(progress);

      const remaining = Math.ceil((duration - elapsed) / 1000);
      setCountdown(Math.max(remaining, 0));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else if (phase === "inhale") {
        // Inhale complete — automatically start exhale
        isHoldingRef.current = false;
        phaseStartRef.current = Date.now();
        setPhase("exhale");
        setBreathProgress(0);
        haptics.tap();
        return;
      } else if (phase === "exhale") {
        // Exhale complete — plant the flower and go idle
        plantFlower();
        setPhase("idle");
        setBreathProgress(0);
        setCountdown(0);
      }
    }

    setCountdown(totalSeconds);
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // ── Plant flower at stored position ──────────────────────────────

  const plantFlower = useCallback(() => {
    const info = activeFlowerRef.current;
    if (!info) return;

    const id = ++flowerIdRef.current;
    const newFlower: GardenFlower = {
      id,
      x: info.x,
      y: info.y,
      color: info.color,
      variant: info.variant,
      size: 36 + Math.random() * 16,
      rotation: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.4,
    };

    setFlowers((prev) => [...prev, newFlower]);
    setCycleCount((c) => c + 1);
    haptics.tap();
    activeFlowerRef.current = null;
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isHoldingRef.current) return;
      if (phase === "exhale") return; // can't interrupt exhale
      isHoldingRef.current = true;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;

      // Store where the flower will go
      activeFlowerRef.current = {
        x: xPct,
        y: yPct,
        color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
        variant: Math.floor(Math.random() * FLOWER_VARIANTS.length),
      };

      // Start inhale
      phaseStartRef.current = Date.now();
      setPhase("inhale");
      setBreathProgress(0);
    },
    [phase],
  );

  const handlePointerUp = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;

    if (phase !== "inhale") return;

    const inhaleDuration = Date.now() - phaseStartRef.current;

    if (inhaleDuration < 1000) {
      // Too short — cancel, no flower
      cancelAnimationFrame(animFrameRef.current);
      setPhase("idle");
      setBreathProgress(0);
      setCountdown(0);
      activeFlowerRef.current = null;
      return;
    }

    // Start exhale
    cancelAnimationFrame(animFrameRef.current);
    phaseStartRef.current = Date.now();
    setPhase("exhale");
    setBreathProgress(0);
  }, [phase]);

  // ── Breathing circle size ────────────────────────────────────────

  let circleScale = 0.4; // idle
  if (phase === "inhale") {
    circleScale = 0.4 + breathProgress * 0.6; // 0.4 → 1.0
  } else if (phase === "exhale") {
    circleScale = 1.0 - breathProgress * 0.6; // 1.0 → 0.4
  }

  const flowerCount = flowers.length;

  // ── Guide text ────────────────────────────────────────────────────

  let guideText = "Press and hold anywhere";
  let subText = "to breathe in";
  if (phase === "inhale") {
    guideText = "Breathe in";
    subText = countdown > 0 ? `${countdown}` : "";
  } else if (phase === "exhale") {
    guideText = "Breathe out";
    subText = countdown > 0 ? `${countdown}` : "";
  }

  return (
    <div
      ref={containerRef}
      className="relative h-dvh w-screen select-none overflow-hidden bg-midnight"
      role="application"
      aria-label="Breathing garden — hold to breathe in, let go to breathe out"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {/* ── Star dots background ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-cream"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* ── Garden flowers ──────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {flowers.map((f) => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: `${f.x}%`,
              top: `${f.y}%`,
              width: f.size,
              height: f.size,
              transform: `translate(-50%, -50%) rotate(${f.rotation}deg) scale(${f.scale})`,
              opacity: 0.8,
              animation: `gentleSway ${5 + (f.id % 3)}s ease-in-out infinite`,
              animationDelay: `${(f.id * 700) % 3000}ms`,
            }}
          >
            {FLOWER_VARIANTS[f.variant](f.color)}
          </div>
        ))}
      </div>

      {/* ── Central breathing guide ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
        {/* Breathing circle */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 160,
            height: 160,
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute rounded-full"
            style={{
              width: 160 * circleScale,
              height: 160 * circleScale,
              background:
                phase === "inhale"
                  ? "radial-gradient(circle, rgba(94, 234, 212, 0.15) 0%, transparent 70%)"
                  : phase === "exhale"
                    ? "radial-gradient(circle, rgba(196, 181, 253, 0.15) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(94, 234, 212, 0.08) 0%, transparent 70%)",
              transition: phase === "idle" ? "all 0.5s ease" : undefined,
              transform: "scale(1.8)",
            }}
          />

          {/* Main circle */}
          <div
            className="absolute rounded-full border-2"
            style={{
              width: 160 * circleScale,
              height: 160 * circleScale,
              borderColor:
                phase === "inhale"
                  ? "rgba(94, 234, 212, 0.4)"
                  : phase === "exhale"
                    ? "rgba(196, 181, 253, 0.4)"
                    : "rgba(94, 234, 212, 0.15)",
              background:
                phase === "inhale"
                  ? "rgba(94, 234, 212, 0.06)"
                  : phase === "exhale"
                    ? "rgba(196, 181, 253, 0.06)"
                    : "rgba(94, 234, 212, 0.03)",
              transition: phase === "idle" ? "all 0.5s ease" : undefined,
            }}
          />

          {/* Countdown number inside circle */}
          {phase !== "idle" && countdown > 0 && (
            <span
              className="relative text-3xl font-light tabular-nums"
              style={{
                color:
                  phase === "inhale"
                    ? "rgba(94, 234, 212, 0.6)"
                    : "rgba(196, 181, 253, 0.6)",
              }}
            >
              {countdown}
            </span>
          )}
        </div>

        {/* Guide text */}
        <div className="mt-8 text-center">
          <p
            className="text-lg font-light tracking-wide"
            style={{
              color:
                phase === "inhale"
                  ? "rgba(94, 234, 212, 0.8)"
                  : phase === "exhale"
                    ? "rgba(196, 181, 253, 0.8)"
                    : "rgba(226, 232, 240, 0.4)",
            }}
          >
            {guideText}
          </p>
          {phase === "idle" && (
            <p className="mt-1 text-sm text-cream/25">{subText}</p>
          )}
        </div>

        {/* Cycle count */}
        {cycleCount > 0 && phase === "idle" && (
          <p className="mt-6 text-xs text-cream/20">
            {cycleCount} breath{cycleCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Back button ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 p-5">
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

      {/* ── Flower counter ────────────────────────────────────────────── */}
      {flowerCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 text-center">
          <p className="text-xs text-cream/25">
            {flowerCount} flower{flowerCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* ── How this helps — collapsible ────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-5">
        <div className="pointer-events-auto w-full max-w-md">
          <button
            onClick={() => setShowHelp(!showHelp)}
            onPointerDown={(e) => e.stopPropagation()}
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
              Breathing out longer than you breathe in &mdash; 4 in, 6 out
              &mdash; tells your nervous system it&apos;s safe to calm down. Each
              flower is one completed breath.
            </div>
          </div>
        </div>
      </div>

      {/* ── Keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes gentleSway {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(3deg);
          }
          75% {
            transform: rotate(-3deg);
          }
        }
      `}</style>
    </div>
  );
}
