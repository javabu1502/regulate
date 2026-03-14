"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Colors ─────────────────────────────────────────────────────────

const STONE_COLORS = [
  { r: 160, g: 150, b: 138 }, // warm sand
  { r: 140, g: 130, b: 118 }, // driftwood
  { r: 175, g: 165, b: 148 }, // pale stone
  { r: 125, g: 135, b: 132 }, // sea grey
  { r: 150, g: 140, b: 125 }, // beach tan
  { r: 135, g: 145, b: 140 }, // grey-teal
  { r: 165, g: 155, b: 140 }, // light sand
  { r: 145, g: 138, b: 128 }, // warm grey
];

// ─── Types ──────────────────────────────────────────────────────────

interface Stone {
  x: number;
  y: number;
  width: number;
  height: number;
  color: { r: number; g: number; b: number };
  shape: number[];
  rotation: number;
  settled: boolean;
  vy: number;
  vx: number;
  vr: number;
  wobble: number;
  wobbleSpeed: number;
  wobblePhase: number;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  radius: number;
  life: number;
}

// ─── Audio ──────────────────────────────────────────────────────────

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

    // Deep, satisfying thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  } catch {
    // Audio not available
  }
}

function playSlideSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    // Audio not available
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function randomStoneShape(): number[] {
  // Big variation — lumpy, angular, smooth, wobbly
  const roughness = 0.2 + Math.random() * 0.4;
  return Array.from({ length: 8 }, () => (Math.random() - 0.5) * roughness * 2);
}

function createStone(x: number, y: number, level: number): Stone {
  // Stones get slightly smaller as you go up, but all are big
  const baseW = 120 - level * 4;
  const baseH = 55 - level * 2;
  // Wide range of shapes — flat slabs, chunky rounds, tall ovals
  const aspectVariance = 0.5 + Math.random() * 1.0; // 0.5x to 1.5x
  const width = Math.max(60, (baseW + (Math.random() - 0.5) * 40) * aspectVariance);
  const height = Math.max(25, (baseH + (Math.random() - 0.5) * 20) / aspectVariance);
  return {
    x,
    y,
    width,
    height,
    color: STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)],
    shape: randomStoneShape(),
    rotation: (Math.random() - 0.5) * 0.08,
    settled: false,
    vy: 0,
    vx: 0,
    vr: 0,
    wobble: 0,
    wobbleSpeed: 0.02 + Math.random() * 0.01,
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  stone: Stone,
  alpha: number = 1,
) {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.rotation + stone.wobble);

  const { width, height, color, shape } = stone;
  const hw = width / 2;
  const hh = height / 2;

  // Organic rounded shape
  ctx.beginPath();
  ctx.moveTo(-hw * (1 + shape[0]), 0);
  ctx.bezierCurveTo(
    -hw * (0.7 + shape[1]),
    -hh * (1.05 + shape[2]),
    hw * (0.7 + shape[3]),
    -hh * (1 + shape[4]),
    hw * (1 + shape[5]),
    0,
  );
  ctx.bezierCurveTo(
    hw * (0.7 + shape[6]),
    hh * (1.05 + shape[7]),
    -hw * (0.7 + shape[0]),
    hh * (1 + shape[1]),
    -hw * (1 + shape[0]),
    0,
  );
  ctx.closePath();

  // Gradient for depth — lighter on top, darker on bottom
  const grad = ctx.createLinearGradient(-hw, -hh, hw * 0.3, hh);
  grad.addColorStop(
    0,
    `rgba(${color.r + 30}, ${color.g + 30}, ${color.b + 30}, ${0.95 * alpha})`,
  );
  grad.addColorStop(
    0.4,
    `rgba(${color.r + 10}, ${color.g + 10}, ${color.b + 10}, ${0.9 * alpha})`,
  );
  grad.addColorStop(
    1,
    `rgba(${color.r - 15}, ${color.g - 15}, ${color.b - 15}, ${0.85 * alpha})`,
  );
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle edge
  ctx.strokeStyle = `rgba(${color.r - 25}, ${color.g - 25}, ${color.b - 25}, ${0.2 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Top highlight — makes it look 3D
  ctx.beginPath();
  ctx.ellipse(-hw * 0.1, -hh * 0.3, hw * 0.5, hh * 0.3, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * alpha})`;
  ctx.fill();

  // Second subtle highlight for realism
  ctx.beginPath();
  ctx.ellipse(hw * 0.2, -hh * 0.15, hw * 0.2, hh * 0.15, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.05 * alpha})`;
  ctx.fill();

  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────────

type GameState = "moving" | "falling" | "settling" | "sliding" | "idle";

export default function StoneStackingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const towerRef = useRef<Stone[]>([]);
  const activeStoneRef = useRef<Stone | null>(null);
  const dustRef = useRef<DustParticle[]>([]);
  const stateRef = useRef<GameState>("idle");
  const moveSpeedRef = useRef(1.2);
  const moveDirRef = useRef(1);

  const [showHelp, setShowHelp] = useState(false);
  const [height, setHeight] = useState(0);
  const [best, setBest] = useState(0);

  // Load best from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("regulate-stones-best");
      if (saved) setBest(parseInt(saved, 10));
    } catch {}
  }, []);

  // ── Spawn a new stone ─────────────────────────────────────────

  const spawnStone = useCallback((canvasW: number) => {
    const level = towerRef.current.length;
    const stone = createStone(canvasW / 2, 45, level);
    activeStoneRef.current = stone;
    stateRef.current = "moving";
    moveDirRef.current = Math.random() > 0.5 ? 1 : -1;
  }, []);

  // ── Drop stone ────────────────────────────────────────────────

  const dropStone = useCallback(() => {
    if (stateRef.current !== "moving" || !activeStoneRef.current) return;
    stateRef.current = "falling";
    activeStoneRef.current.vy = 2;
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
    spawnStone(w);

    function groundY(): number {
      return h - 90;
    }

    function topOfTower(): number {
      const tower = towerRef.current;
      if (tower.length === 0) return groundY();
      const top = tower[tower.length - 1];
      return top.y - top.height;
    }

    function topStone(): Stone | null {
      const tower = towerRef.current;
      return tower.length > 0 ? tower[tower.length - 1] : null;
    }

    function spawnDust(x: number, y: number, count: number = 8) {
      for (let i = 0; i < count; i++) {
        dustRef.current.push({
          x: x + (Math.random() - 0.5) * 50,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 1.5 - 0.5,
          opacity: 0.3 + Math.random() * 0.3,
          radius: 2 + Math.random() * 3,
          life: 40 + Math.random() * 20,
        });
      }
    }

    // ── Animation loop ────────────────────────────────────────
    function draw() {
      // Background
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0a0f1e");
      bgGrad.addColorStop(1, "#0e1428");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      timeRef.current += 1;

      const state = stateRef.current;
      const active = activeStoneRef.current;
      const tower = towerRef.current;
      const dust = dustRef.current;
      const gy = groundY();

      // ── Camera ────────────────────────────────────────────
      const towerHeight = tower.length > 0 ? gy - topOfTower() : 0;
      const cameraShift = Math.max(0, towerHeight - (h * 0.5));

      ctx!.save();
      ctx!.translate(0, cameraShift);

      // Ground — wide, subtle
      ctx!.beginPath();
      ctx!.moveTo(0, gy);
      ctx!.lineTo(w, gy);
      ctx!.strokeStyle = "rgba(94, 234, 212, 0.08)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Sandy ground fill
      const groundGrad = ctx!.createLinearGradient(0, gy, 0, gy + 40);
      groundGrad.addColorStop(0, "rgba(160, 150, 138, 0.06)");
      groundGrad.addColorStop(1, "rgba(160, 150, 138, 0)");
      ctx!.fillStyle = groundGrad;
      ctx!.fillRect(0, gy, w, 40);

      // ── Update wobble ─────────────────────────────────────
      for (const s of tower) {
        s.wobble =
          Math.sin(timeRef.current * s.wobbleSpeed + s.wobblePhase) *
          0.005 *
          (tower.indexOf(s) + 1);
      }

      // ── Move active stone ─────────────────────────────────
      if (state === "moving" && active) {
        const speed = moveSpeedRef.current;
        active.x += moveDirRef.current * speed;

        const margin = active.width / 2 + 15;
        if (active.x > w - margin) {
          active.x = w - margin;
          moveDirRef.current = -1;
        }
        if (active.x < margin) {
          active.x = margin;
          moveDirRef.current = 1;
        }
      }

      // ── Fall active stone ─────────────────────────────────
      if (state === "falling" && active) {
        active.vy += 0.18;
        active.y += active.vy;

        const targetY = topOfTower();

        if (active.y + active.height / 2 >= targetY) {
          active.y = targetY - active.height / 2 + active.height;

          const ts = topStone();
          const centerBelow = ts ? ts.x : w / 2;
          const offset = Math.abs(active.x - centerBelow);
          // Very forgiving — 80% overlap tolerance
          const tolerance = ts
            ? (ts.width / 2 + active.width / 2) * 0.8
            : active.width;

          if (offset < tolerance) {
            // Successful placement
            active.settled = true;
            active.vy = -1;
            stateRef.current = "settling";
            active.y = topOfTower();

            tower.push(active);
            const newHeight = tower.length;
            setHeight(newHeight);

            // Save best
            setBest((prev) => {
              const newBest = Math.max(prev, newHeight);
              try {
                localStorage.setItem("regulate-stones-best", String(newBest));
              } catch {}
              return newBest;
            });

            // Speed increases as tower grows
            moveSpeedRef.current = 1.2 + tower.length * 0.1;

            playPlaceSound();
            haptics.tap();
            spawnDust(active.x, active.y + active.height / 2, 10);
          } else {
            // Miss — stone slides off, but tower stays!
            stateRef.current = "sliding";
            active.vx = active.x > centerBelow ? 2.5 : -2.5;
            active.vr = (Math.random() - 0.5) * 0.05;
            active.vy = -1;
            playSlideSound();
          }
        }
      }

      // ── Settling bounce ───────────────────────────────────
      if (state === "settling" && active) {
        active.vy += 0.3;
        active.y += active.vy;

        const restY =
          tower.length <= 1
            ? gy - active.height / 2
            : tower[tower.length - 2].y -
              tower[tower.length - 2].height -
              active.height / 2 +
              active.height;

        if (active.y >= restY && active.vy > 0) {
          active.y = restY;
          active.vy *= -0.25;

          if (Math.abs(active.vy) < 0.3) {
            active.vy = 0;
            stateRef.current = "idle";
            activeStoneRef.current = null;
            setTimeout(() => spawnStone(w), 400);
          }
        }
      }

      // ── Sliding off — stone slides away, tower stays ──────
      if (state === "sliding" && active) {
        active.vy += 0.2;
        active.y += active.vy;
        active.x += active.vx;
        active.rotation += active.vr;

        if (active.y > h + 100) {
          activeStoneRef.current = null;
          stateRef.current = "idle";
          // Just spawn a new one — don't reset the tower
          setTimeout(() => spawnStone(w), 600);
        }
      }

      // ── Draw tower stones ─────────────────────────────────
      for (const s of tower) {
        drawStone(ctx!, s);
      }

      // Draw active stone
      if (active && state !== "idle") {
        const fadeAlpha =
          state === "sliding"
            ? Math.max(0, 1 - Math.max(0, active.y - h) / 100)
            : 1;
        drawStone(ctx!, active, fadeAlpha);

        // Drop guide line when moving (shows where it'll land)
        if (state === "moving") {
          const landY = topOfTower();
          ctx!.beginPath();
          ctx!.setLineDash([4, 6]);
          ctx!.moveTo(active.x, active.y + active.height / 2);
          ctx!.lineTo(active.x, landY);
          ctx!.strokeStyle = "rgba(94, 234, 212, 0.08)";
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.setLineDash([]);
        }
      }

      // ── Draw dust ─────────────────────────────────────────
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.02;
        d.life -= 1;
        d.opacity *= 0.96;

        if (d.life <= 0) {
          dust.splice(i, 1);
          continue;
        }

        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(180, 170, 155, ${d.opacity})`;
        ctx!.fill();
      }

      ctx!.restore();

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [spawnStone]);

  // ── Handle tap ────────────────────────────────────────────────

  const onPointerDown = useCallback(() => {
    dropStone();
  }, [dropStone]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Stone stacking game - tap to drop stones"
    >
      <p className="sr-only">
        Stones move across the screen. Tap to drop and stack them.
      </p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
      />

      {/* Top bar — back + stats */}
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

        <div className="pointer-events-none flex items-center gap-3 rounded-full bg-deep/60 px-3.5 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm">
          <span>{height} high</span>
          {best > 0 && (
            <>
              <span className="text-cream-dim/20">·</span>
              <span>best {best}</span>
            </>
          )}
        </div>
      </div>

      {/* Tap hint — shows briefly */}
      {height === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <p className="rounded-full bg-deep/60 px-4 py-2 text-xs text-cream-dim/50 backdrop-blur-sm">
            Tap anywhere to drop
          </p>
        </div>
      )}

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
              Stacking takes patience and timing — two things that are hard when
              you&apos;re stressed. Doing it here, where nothing&apos;s at stake,
              helps your brain practice slowing down.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
