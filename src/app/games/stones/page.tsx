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
  wobble: number;
  wobbleSpeed: number;
  wobblePhase: number;
}

interface FallingStone extends Stone {
  vx: number;
  vy: number;
  settled: boolean;
  bounceCount: number;
  missed: boolean;
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

function playPlaceSound(pitch: number = 1) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime((120 + Math.random() * 40) * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(60 * pitch, t + 0.25);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  } catch {}
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
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    const bufLen = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2) * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    src.start(t);
  } catch {}
}

// ─── Helpers ────────────────────────────────────────────────────────

function randomStoneShape(): number[] {
  const roughness = 0.15 + Math.random() * 0.3;
  return Array.from({ length: 8 }, () => (Math.random() - 0.5) * roughness * 2);
}

function createStone(x: number, y: number, level: number): Stone {
  // Stones get slightly narrower but stay substantial
  const baseW = 100 - Math.min(level, 8) * 3;
  const baseH = 32 - Math.min(level, 8) * 1;
  const aspectVariance = 0.7 + Math.random() * 0.6;
  const width = Math.max(60, (baseW + (Math.random() - 0.5) * 25) * aspectVariance);
  const height = Math.max(18, (baseH + (Math.random() - 0.5) * 10) / aspectVariance);
  return {
    x,
    y,
    width,
    height,
    color: STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)],
    shape: randomStoneShape(),
    rotation: (Math.random() - 0.5) * 0.06,
    wobble: 0,
    wobbleSpeed: 0.015 + Math.random() * 0.008,
    wobblePhase: Math.random() * Math.PI * 2,
  };
}

function drawStone(ctx: CanvasRenderingContext2D, stone: Stone, alpha: number = 1) {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.rotation + stone.wobble);

  const { width, height, color, shape } = stone;
  const hw = width / 2;
  const hh = height / 2;

  ctx.beginPath();
  ctx.moveTo(-hw * (1 + shape[0]), 0);
  ctx.bezierCurveTo(
    -hw * (0.7 + shape[1]), -hh * (1.05 + shape[2]),
    hw * (0.7 + shape[3]), -hh * (1 + shape[4]),
    hw * (1 + shape[5]), 0,
  );
  ctx.bezierCurveTo(
    hw * (0.7 + shape[6]), hh * (1.05 + shape[7]),
    -hw * (0.7 + shape[0]), hh * (1 + shape[1]),
    -hw * (1 + shape[0]), 0,
  );
  ctx.closePath();

  const grad = ctx.createLinearGradient(-hw, -hh, hw * 0.3, hh);
  grad.addColorStop(0, `rgba(${color.r + 30}, ${color.g + 30}, ${color.b + 30}, ${0.95 * alpha})`);
  grad.addColorStop(0.4, `rgba(${color.r + 10}, ${color.g + 10}, ${color.b + 10}, ${0.9 * alpha})`);
  grad.addColorStop(1, `rgba(${color.r - 15}, ${color.g - 15}, ${color.b - 15}, ${0.85 * alpha})`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = `rgba(${color.r - 25}, ${color.g - 25}, ${color.b - 25}, ${0.2 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Top highlight
  ctx.beginPath();
  ctx.ellipse(-hw * 0.1, -hh * 0.3, hw * 0.5, hh * 0.3, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * alpha})`;
  ctx.fill();

  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────────

export default function StoneStackingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const timeRef = useRef(0);

  const towerRef = useRef<Stone[]>([]);
  const dustRef = useRef<DustParticle[]>([]);
  const cameraYRef = useRef(0); // smooth camera

  // Drag state
  const isDraggingRef = useRef(false);
  const dragXRef = useRef(0);
  const activeStoneRef = useRef<Stone | null>(null);
  const fallingRef = useRef<FallingStone | null>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [height, setHeight] = useState(0);
  const [best, setBest] = useState(0);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("regulate-stones-best");
      if (saved) setBest(parseInt(saved, 10));
    } catch {}
  }, []);

  // ── Get tower positions ─────────────────────────────────────

  const getGroundY = useCallback((h: number) => h - 90, []);

  const getTopOfTower = useCallback((h: number) => {
    const tower = towerRef.current;
    if (tower.length === 0) return getGroundY(h);
    const top = tower[tower.length - 1];
    return top.y - top.height / 2;
  }, [getGroundY]);

  // ── Spawn stone at drag position ────────────────────────────

  const spawnStone = useCallback((w: number) => {
    const level = towerRef.current.length;
    const stone = createStone(w / 2, 50, level);
    activeStoneRef.current = stone;
    dragXRef.current = w / 2;
  }, []);

  // ── Main effect ─────────────────────────────────────────────

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
      return top.y - top.height / 2;
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

    // ── Animation loop ──────────────────────────────────────
    function draw() {
      timeRef.current += 1;

      // Background
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0a0f1e");
      bgGrad.addColorStop(1, "#0e1428");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      const tower = towerRef.current;
      const dust = dustRef.current;
      const gy = groundY();
      const active = activeStoneRef.current;
      const falling = fallingRef.current;

      // ── Smooth camera ──────────────────────────────────────
      const towerHeight = tower.length > 0 ? gy - topOfTower() : 0;
      const targetCam = Math.max(0, towerHeight - h * 0.45);
      // Lerp for smooth following
      cameraYRef.current += (targetCam - cameraYRef.current) * 0.06;

      ctx!.save();
      ctx!.translate(0, cameraYRef.current);

      // ── Ground ─────────────────────────────────────────────
      ctx!.beginPath();
      ctx!.moveTo(0, gy);
      ctx!.lineTo(w, gy);
      ctx!.strokeStyle = "rgba(94, 234, 212, 0.12)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Sandy ground fill
      const groundGrad = ctx!.createLinearGradient(0, gy, 0, gy + 50);
      groundGrad.addColorStop(0, "rgba(160, 150, 138, 0.08)");
      groundGrad.addColorStop(1, "rgba(160, 150, 138, 0)");
      ctx!.fillStyle = groundGrad;
      ctx!.fillRect(0, gy, w, 50);

      // ── Update wobble (capped) ─────────────────────────────
      for (let i = 0; i < tower.length; i++) {
        const s = tower[i];
        // Cap wobble so it never gets crazy — max ±0.02 radians
        const wobbleAmount = Math.min(0.02, 0.003 * (i + 1));
        s.wobble = Math.sin(timeRef.current * s.wobbleSpeed + s.wobblePhase) * wobbleAmount;
      }

      // ── Draw tower stones ──────────────────────────────────
      for (const s of tower) {
        drawStone(ctx!, s);
      }

      // ── Landing preview (ghost stone + guide line) ─────────
      if (active && !falling) {
        const landY = topOfTower();
        const previewX = dragXRef.current;
        const previewY = landY - active.height / 2;

        // Ghost stone at landing position
        ctx!.globalAlpha = 0.15;
        const ghost = { ...active, x: previewX, y: previewY, wobble: 0 };
        drawStone(ctx!, ghost);
        ctx!.globalAlpha = 1;

        // Vertical guide line — visible!
        ctx!.beginPath();
        ctx!.setLineDash([6, 6]);
        ctx!.moveTo(previewX, active.y + active.height / 2);
        ctx!.lineTo(previewX, landY);
        ctx!.strokeStyle = "rgba(94, 234, 212, 0.25)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Center indicator on top stone
        const ts = topStone();
        if (ts) {
          ctx!.beginPath();
          ctx!.arc(ts.x, ts.y, 3, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(94, 234, 212, 0.3)";
          ctx!.fill();
        }

        // Draw the active stone at drag position
        active.x = previewX;
        drawStone(ctx!, active);
      }

      // ── Falling stone ──────────────────────────────────────
      if (falling) {
        falling.vy += 0.25;
        falling.y += falling.vy;
        falling.x += falling.vx;

        // If already missed, just let it fall off screen
        if (falling.missed) {
          falling.rotation += falling.vx > 0 ? 0.02 : -0.02;
        } else {
          const targetY = topOfTower();
          const landY = targetY - falling.height / 2;

          if (falling.y >= landY && falling.vy > 0) {
            falling.y = landY;

            const ts = topStone();
            const centerBelow = ts ? ts.x : w / 2;
            const offset = Math.abs(falling.x - centerBelow);
            const tolerance = ts
              ? (ts.width / 2 + falling.width / 2) * 0.9
              : falling.width;

            if (offset < tolerance) {
              // Bounce
              falling.bounceCount++;
              falling.vy *= -0.2;

              if (falling.bounceCount >= 2 || Math.abs(falling.vy) < 0.5) {
                // Settle
                falling.y = landY;
                const settled: Stone = {
                  x: falling.x,
                  y: falling.y,
                  width: falling.width,
                  height: falling.height,
                  color: falling.color,
                  shape: falling.shape,
                  rotation: falling.rotation,
                  wobble: 0,
                  wobbleSpeed: falling.wobbleSpeed,
                  wobblePhase: falling.wobblePhase,
                };
                tower.push(settled);
                const newHeight = tower.length;
                setHeight(newHeight);

                setBest((prev) => {
                  const nb = Math.max(prev, newHeight);
                  try { localStorage.setItem("regulate-stones-best", String(nb)); } catch {}
                  return nb;
                });

                playPlaceSound(1 + tower.length * 0.03);
                haptics.tap();
                spawnDust(falling.x, falling.y + falling.height / 2, 10);

                fallingRef.current = null;
                setTimeout(() => spawnStone(w), 400);
              }
            } else {
              // Miss — slides off sideways
              falling.missed = true;
              falling.vy = -3;
              falling.vx = falling.x > centerBelow ? 4 : -4;
              playSlideSound();
            }
          }
        }

        // Off screen — respawn
        if (falling.y > h + cameraYRef.current + 200) {
          fallingRef.current = null;
          setTimeout(() => spawnStone(w), 600);
        }

        drawStone(ctx!, falling, Math.max(0, 1 - Math.max(0, falling.y - (h + cameraYRef.current)) / 100));
      }

      // ── Dust ───────────────────────────────────────────────
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
  }, [spawnStone, getGroundY]);

  // ── Pointer handlers — drag to position, release to drop ────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!activeStoneRef.current || fallingRef.current) return;
    isDraggingRef.current = true;
    dragXRef.current = e.clientX;
    setHint(false);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !activeStoneRef.current) return;
    dragXRef.current = e.clientX;
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current || !activeStoneRef.current) return;
    isDraggingRef.current = false;

    // Drop the stone
    const stone = activeStoneRef.current;
    stone.x = dragXRef.current;
    fallingRef.current = {
      ...stone,
      vx: 0,
      vy: 0,
      settled: false,
      bounceCount: 0,
      missed: false,
    };
    activeStoneRef.current = null;
  }, []);

  // ── Reset ────────────────────────────────────────────────────

  const resetTower = useCallback(() => {
    towerRef.current = [];
    fallingRef.current = null;
    activeStoneRef.current = null;
    cameraYRef.current = 0;
    setHeight(0);
    setTimeout(() => spawnStone(window.innerWidth), 200);
  }, [spawnStone]);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Stone stacking — drag to position, release to drop"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Top bar — back + stats + reset */}
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

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-3 rounded-full bg-deep/60 px-3.5 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm">
            <span>{height} high</span>
            {best > 0 && (
              <>
                <span className="text-cream-dim/20">·</span>
                <span>best {best}</span>
              </>
            )}
          </div>

          {height > 0 && (
            <button
              className="rounded-full bg-deep/60 px-3 py-1.5 text-xs text-cream-dim/40 backdrop-blur-sm transition-colors hover:text-cream-dim"
              onClick={resetTower}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Drag hint */}
      {hint && height === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <p className="rounded-full bg-deep/60 px-4 py-2 text-xs text-cream-dim/50 backdrop-blur-sm">
            Drag to position · Release to drop
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`transition-transform duration-300 ${showHelp ? "rotate-180" : ""}`}>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-out ${showHelp ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="rounded-2xl border border-teal/15 bg-deep/80 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Stacking takes patience and focus &mdash; two things that are hard when
              you&apos;re stressed. Doing it here, where nothing&apos;s at stake,
              helps your brain practice slowing down.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
