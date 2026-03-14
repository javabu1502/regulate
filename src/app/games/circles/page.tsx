"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Colors ─────────────────────────────────────────────────────────

const PALETTE = [
  { r: 94, g: 234, b: 212, name: "teal" },
  { r: 244, g: 132, b: 95, name: "coral" },
  { r: 196, g: 181, b: 253, name: "lavender" },
  { r: 252, g: 211, b: 77, name: "candle" },
];

// ─── Types ──────────────────────────────────────────────────────────

interface Ring {
  radius: number;
  targetRadius: number;
  opacity: number;
}

interface RingSet {
  x: number;
  y: number;
  rings: Ring[];
  color: { r: number; g: number; b: number };
  settled: boolean;
  settleProgress: number; // 0..1
  shimmerOffset: number;
}

interface ActiveBreath {
  x: number;
  y: number;
  rings: Ring[];
  color: { r: number; g: number; b: number };
  elapsed: number; // ms held
  pulsePhase: number;
}

// ─── Component ──────────────────────────────────────────────────────

export default function BreathingCirclesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const ringSetsRef = useRef<RingSet[]>([]);
  const activeBreathRef = useRef<ActiveBreath | null>(null);
  const holdStartRef = useRef<number>(0);
  const colorIndexRef = useRef(0);
  const [showHelp, setShowHelp] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const breathCountRef = useRef(0);
  const lastTimeRef = useRef(0);

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
    lastTimeRef.current = performance.now();

    // ── Animation loop ────────────────────────────────────────
    function draw(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50); // cap at 50ms
      lastTimeRef.current = timestamp;

      // Background
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0a0f1e");
      bgGrad.addColorStop(0.5, "#0d1326");
      bgGrad.addColorStop(1, "#0a1020");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      const ringSets = ringSetsRef.current;
      const active = activeBreathRef.current;

      // Draw settled ring sets
      for (const set of ringSets) {
        if (!set.settled) {
          // Animate settling
          set.settleProgress = Math.min(1, set.settleProgress + dt * 0.003);
          if (set.settleProgress >= 1) {
            set.settled = true;
          }
        }

        set.shimmerOffset += dt * 0.001;
        const shimmer = set.settled
          ? 0.03 * Math.sin(set.shimmerOffset * 2)
          : 0;

        for (let i = 0; i < set.rings.length; i++) {
          const ring = set.rings[i];

          // Settle animation: rings contract slightly to their target
          const currentRadius = set.settled
            ? ring.targetRadius
            : ring.radius +
              (ring.targetRadius - ring.radius) * set.settleProgress;

          const baseOpacity = ring.opacity * (set.settled ? 0.6 : 0.8);
          const finalOpacity = Math.max(0, baseOpacity + shimmer);

          // Glow
          ctx!.beginPath();
          ctx!.arc(set.x, set.y, currentRadius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${set.color.r}, ${set.color.g}, ${set.color.b}, ${finalOpacity * 0.2})`;
          ctx!.lineWidth = 6;
          ctx!.stroke();

          // Ring
          ctx!.beginPath();
          ctx!.arc(set.x, set.y, currentRadius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${set.color.r}, ${set.color.g}, ${set.color.b}, ${finalOpacity})`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }
      }

      // Draw active breath rings
      if (active) {
        active.elapsed += dt;
        active.pulsePhase += dt * 0.005;

        // Over 4 seconds, grow to 4-5 rings
        const progress = Math.min(active.elapsed / 4000, 1);
        const targetRingCount = Math.floor(1 + progress * 4); // 1 to 5

        // Add rings as needed
        while (active.rings.length < targetRingCount) {
          active.rings.push({
            radius: 8,
            targetRadius: 20 + active.rings.length * 28,
            opacity: 0.7 - active.rings.length * 0.1,
          });
        }

        // Expand all rings outward
        for (let i = 0; i < active.rings.length; i++) {
          const ring = active.rings[i];
          const expandTarget = 30 + i * 35 + progress * 60;
          ring.radius += (expandTarget - ring.radius) * 0.03;

          // Pulsing effect
          const pulse = 1 + 0.04 * Math.sin(active.pulsePhase + i * 0.8);
          const drawRadius = ring.radius * pulse;

          // Glow
          ctx!.beginPath();
          ctx!.arc(active.x, active.y, drawRadius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${active.color.r}, ${active.color.g}, ${active.color.b}, ${ring.opacity * 0.25})`;
          ctx!.lineWidth = 8;
          ctx!.stroke();

          // Ring
          ctx!.beginPath();
          ctx!.arc(active.x, active.y, drawRadius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${active.color.r}, ${active.color.g}, ${active.color.b}, ${ring.opacity})`;
          ctx!.lineWidth = 2;
          ctx!.stroke();
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
      holdStartRef.current = Date.now();
      const color = PALETTE[colorIndexRef.current % PALETTE.length];

      activeBreathRef.current = {
        x: e.clientX,
        y: e.clientY,
        rings: [
          {
            radius: 8,
            targetRadius: 20,
            opacity: 0.7,
          },
        ],
        color: { r: color.r, g: color.g, b: color.b },
        elapsed: 0,
        pulsePhase: 0,
      };

      haptics.breatheIn();
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    const active = activeBreathRef.current;
    if (!active) return;

    const holdDuration = Date.now() - holdStartRef.current;

    // Only count as a breath if held for 2+ seconds
    if (holdDuration >= 2000) {
      // Convert active rings to a settled ring set
      const settledRings = active.rings.map((ring, i) => ({
        radius: ring.radius,
        targetRadius: 20 + i * 28, // Contract to tighter spacing
        opacity: ring.opacity,
      }));

      ringSetsRef.current.push({
        x: active.x,
        y: active.y,
        rings: settledRings,
        color: active.color,
        settled: false,
        settleProgress: 0,
        shimmerOffset: Math.random() * Math.PI * 2,
      });

      colorIndexRef.current++;
      breathCountRef.current++;
      setBreathCount(breathCountRef.current);
      haptics.breatheOut();
    }

    activeBreathRef.current = null;
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Breathing circles - hold to create expanding rings"
    >
      <p className="sr-only">
        A dark sky. Hold anywhere to create concentric circles that expand with
        your breath. Release to let them settle. Each breath cycle adds a
        permanent ring pattern. A visual breathing meditation.
      </p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Back button */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-5">
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

      {/* Breath counter */}
      {breathCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center">
          <span className="text-sm text-cream-dim/60">
            {breathCount} {breathCount === 1 ? "breath" : "breaths"}
          </span>
        </div>
      )}

      {/* How this helps */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
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
              Watching circles expand and settle mirrors the rhythm of calm
              breathing. Each ring you create is proof that your body knows how
              to slow down.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
