"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playGrowSound() {
  try {
    if (!isGameSoundEnabled()) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Soft rising chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(392, t); // G4
    osc.frequency.exponentialRampToValueAtTime(784, t + 0.6); // G5
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);

    // Harmonic shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(523.25, t + 0.1); // C5
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.04, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.1);
    osc2.stop(t + 1.2);
  } catch {}
}

function playBloomSound() {
  try {
    if (!isGameSoundEnabled()) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Bright bell — two harmonics
    const freqs = [659.25, 987.77]; // E5, B5
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.5);
    }
  } catch {}
}

// ─── Constants ──────────────────────────────────────────────────────

const BREATH_PATTERNS = [
  { label: "4 : 6", inhale: 4000, exhale: 6000, hold: 0 },
  { label: "4 : 4", inhale: 4000, exhale: 4000, hold: 0 },
  { label: "4 : 7 : 8", inhale: 4000, exhale: 8000, hold: 7000 },
];

const PETAL_COLORS = [
  ["#f9a8d4", "#f472b6"], // pink
  ["#c4b5fd", "#a78bfa"], // lavender
  ["#fcd34d", "#fbbf24"], // gold
  ["#5eead4", "#2dd4bf"], // teal
  ["#fca5a5", "#f87171"], // coral
  ["#93c5fd", "#60a5fa"], // sky blue
  ["#86efac", "#4ade80"], // mint
];

interface Flower {
  id: number;
  x: number; // canvas x position
  groundY: number; // where ground is at this x
  stemHeight: number; // full stem height
  petalColor: string[];
  petalCount: number; // 5-8
  petalSize: number; // radius
  bloomTime: number; // timestamp when bloom started
  swayOffset: number; // random phase
  leafSide: number; // -1 or 1
}

// ─── Component ──────────────────────────────────────────────────────

export default function BreathingGardenPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const timeRef = useRef(0);

  const [phase, setPhase] = useState<"idle" | "inhale" | "exhale" | "rest">("idle");
  const [breathProgress, setBreathProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [patternIdx, setPatternIdx] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const phaseRef = useRef<"idle" | "inhale" | "exhale" | "rest">("idle");
  const progressRef = useRef(0);
  const patternRef = useRef(BREATH_PATTERNS[0]);
  const phaseStartRef = useRef(0);
  const breathAnimRef = useRef(0);

  const flowersRef = useRef<Flower[]>([]);
  const flowerIdRef = useRef(0);
  const tapPosRef = useRef<{ x: number; y: number } | null>(null);

  // Growing flower animation — tracks stem/bloom progress
  const growingRef = useRef<{
    flower: Flower;
    stemProgress: number; // 0-1
    bloomProgress: number; // 0-1
    phase: "stem" | "bloom" | "done";
  } | null>(null);

  // Load saved flowers
  useEffect(() => {
    try {
      const saved = localStorage.getItem("regulate-garden-flowers-v2");
      if (saved) {
        const parsed = JSON.parse(saved) as Flower[];
        flowersRef.current = parsed;
        flowerIdRef.current = parsed.reduce((max, f) => Math.max(max, f.id), 0);
      }
    } catch {}
  }, []);

  // ── Canvas setup & render loop ──────────────────────────────────

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

    // ── Hill / ground function ───────────────────────────────────
    // Two gentle rolling hills
    function getGroundY(x: number): number {
      const base = h * 0.72;
      const hill1 = Math.sin((x / w) * Math.PI * 1.2 + 0.5) * (h * 0.04);
      const hill2 = Math.sin((x / w) * Math.PI * 2.4 + 1.2) * (h * 0.02);
      return base - hill1 - hill2;
    }

    // ── Star field (subtle) ──────────────────────────────────────
    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 600,
      size: 0.5 + Math.random() * 1.5,
      twinkleSpeed: 0.005 + Math.random() * 0.01,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // ── Draw flower ──────────────────────────────────────────────
    function drawFlower(f: Flower, stemProg: number, bloomProg: number) {
      const sway = Math.sin(timeRef.current * 0.015 + f.swayOffset) * 4 * stemProg;
      const stemTop = f.groundY - f.stemHeight * stemProg;

      // Stem
      ctx!.save();
      ctx!.beginPath();
      ctx!.moveTo(f.x, f.groundY);
      // Curved stem
      const cp1x = f.x + sway * 0.3;
      const cp1y = f.groundY - f.stemHeight * stemProg * 0.5;
      const tipX = f.x + sway;
      const tipY = stemTop;
      ctx!.quadraticCurveTo(cp1x, cp1y, tipX, tipY);
      ctx!.strokeStyle = `rgba(34, 130, 80, ${0.7 * Math.min(stemProg * 2, 1)})`;
      ctx!.lineWidth = 2.5;
      ctx!.stroke();

      // Leaf (appears when stem is > 40%)
      if (stemProg > 0.4) {
        const leafProgress = Math.min((stemProg - 0.4) / 0.3, 1);
        const leafY = f.groundY - f.stemHeight * stemProg * 0.45;
        const leafX = f.x + sway * 0.2;
        const leafDir = f.leafSide;

        ctx!.beginPath();
        ctx!.moveTo(leafX, leafY);
        ctx!.quadraticCurveTo(
          leafX + leafDir * 14 * leafProgress,
          leafY - 8 * leafProgress,
          leafX + leafDir * 8 * leafProgress,
          leafY + 4 * leafProgress,
        );
        ctx!.quadraticCurveTo(
          leafX + leafDir * 3,
          leafY + 2,
          leafX,
          leafY,
        );
        ctx!.fillStyle = `rgba(46, 160, 90, ${0.6 * leafProgress})`;
        ctx!.fill();
      }

      // Bloom (petals + center)
      if (bloomProg > 0) {
        const cx = tipX;
        const cy = tipY;
        const petalR = f.petalSize * bloomProg;

        // Outer glow
        const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, petalR * 2.5);
        glow.addColorStop(0, `${f.petalColor[0]}20`);
        glow.addColorStop(1, "transparent");
        ctx!.fillStyle = glow;
        ctx!.fillRect(cx - petalR * 3, cy - petalR * 3, petalR * 6, petalR * 6);

        // Petals
        for (let i = 0; i < f.petalCount; i++) {
          const angle = (i / f.petalCount) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(angle) * petalR * 0.5;
          const py = cy + Math.sin(angle) * petalR * 0.5;

          ctx!.beginPath();
          ctx!.ellipse(
            px,
            py,
            petalR * 0.55,
            petalR * 0.3,
            angle,
            0,
            Math.PI * 2,
          );

          const grad = ctx!.createRadialGradient(px, py, 0, px, py, petalR * 0.55);
          grad.addColorStop(0, f.petalColor[0]);
          grad.addColorStop(1, f.petalColor[1]);
          ctx!.fillStyle = grad;
          ctx!.globalAlpha = 0.85 * bloomProg;
          ctx!.fill();
          ctx!.globalAlpha = 1;
        }

        // Center
        ctx!.beginPath();
        ctx!.arc(cx, cy, petalR * 0.22, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(253, 224, 71, ${0.9 * bloomProg})`;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(cx - petalR * 0.06, cy - petalR * 0.06, petalR * 0.12, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${0.3 * bloomProg})`;
        ctx!.fill();
      }

      ctx!.restore();
    }

    // ── Animation loop ──────────────────────────────────────────
    function draw() {
      timeRef.current += 1;

      // ── Sky gradient ─────────────────────────────────────────
      const sky = ctx!.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0a0f2e");    // deep navy
      sky.addColorStop(0.3, "#121a3a");  // dark blue
      sky.addColorStop(0.6, "#1a1f3a");  // purple-blue
      sky.addColorStop(0.85, "#1e2740"); // horizon
      sky.addColorStop(1, "#1a2235");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, h);

      // ── Stars ─────────────────────────────────────────────────
      for (const s of stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(timeRef.current * s.twinkleSpeed + s.twinkleOffset));
        ctx!.beginPath();
        ctx!.arc(s.x % w, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(220, 230, 255, ${twinkle * 0.4})`;
        ctx!.fill();
      }

      // ── Ground / grass ────────────────────────────────────────
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        ctx!.lineTo(x, getGroundY(x));
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();

      const groundGrad = ctx!.createLinearGradient(0, h * 0.68, 0, h);
      groundGrad.addColorStop(0, "#1a3a2a"); // dark green
      groundGrad.addColorStop(0.3, "#162e24"); // darker
      groundGrad.addColorStop(1, "#0f1f18"); // very dark
      ctx!.fillStyle = groundGrad;
      ctx!.fill();

      // Grass blades at the ground line
      for (let x = 3; x < w; x += 6) {
        const gy = getGroundY(x);
        const bladeH = 6 + Math.sin(x * 0.3) * 4;
        const bladeSway = Math.sin(timeRef.current * 0.02 + x * 0.1) * 2;

        ctx!.beginPath();
        ctx!.moveTo(x, gy);
        ctx!.quadraticCurveTo(x + bladeSway, gy - bladeH * 0.6, x + bladeSway * 1.5, gy - bladeH);
        ctx!.strokeStyle = `rgba(40, 120, 60, ${0.3 + Math.random() * 0.1})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // ── Planting marker (shows where the flower will grow) ───
      const tap = tapPosRef.current;
      const currentPhase = phaseRef.current;
      if (tap && (currentPhase === "inhale" || currentPhase === "exhale")) {
        const markerX = Math.max(w * 0.05, Math.min(w * 0.95, tap.x));
        const markerY = getGroundY(markerX);
        const pulse = 0.4 + 0.3 * Math.sin(timeRef.current * 0.06);
        const markerGlow = ctx!.createRadialGradient(markerX, markerY, 0, markerX, markerY, 12);
        markerGlow.addColorStop(0, `rgba(94, 234, 212, ${pulse * 0.5})`);
        markerGlow.addColorStop(1, "rgba(94, 234, 212, 0)");
        ctx!.fillStyle = markerGlow;
        ctx!.fillRect(markerX - 12, markerY - 12, 24, 24);
        ctx!.beginPath();
        ctx!.arc(markerX, markerY, 3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(94, 234, 212, ${pulse * 0.6})`;
        ctx!.fill();
      }

      // ── Draw existing flowers ─────────────────────────────────
      for (const f of flowersRef.current) {
        drawFlower(f, 1, 1);
      }

      // ── Draw growing flower ───────────────────────────────────
      const growing = growingRef.current;
      if (growing) {
        const elapsed = Date.now() - growing.flower.bloomTime;

        if (growing.phase === "stem") {
          growing.stemProgress = Math.min(elapsed / 800, 1); // 800ms stem growth
          if (growing.stemProgress >= 1) {
            growing.phase = "bloom";
            growing.flower.bloomTime = Date.now();
            playBloomSound();
          }
        } else if (growing.phase === "bloom") {
          const bloomElapsed = Date.now() - growing.flower.bloomTime;
          growing.bloomProgress = Math.min(bloomElapsed / 600, 1); // 600ms bloom
          if (growing.bloomProgress >= 1) {
            growing.phase = "done";
            // Add to permanent collection
            flowersRef.current.push(growing.flower);
            try {
              localStorage.setItem(
                "regulate-garden-flowers-v2",
                JSON.stringify(flowersRef.current),
              );
            } catch {}
            growingRef.current = null;
          }
        }

        if (growing) {
          drawFlower(growing.flower, growing.stemProgress, growing.bloomProgress);
        }
      }

      // ── Breathing circle (lower center) ───────────────────────
      const circleY = h * 0.48;
      const circleX = w / 2;
      const p = phaseRef.current;
      const prog = progressRef.current;

      let radius = 35;
      if (p === "inhale") radius = 35 + prog * 35; // 35→70
      else if (p === "exhale") radius = 70 - prog * 35; // 70→35

      // Soft glow behind
      const glowR = radius * 2.5;
      const glowColor = p === "exhale" ? "rgba(196, 181, 253, 0.08)" : "rgba(94, 234, 212, 0.08)";
      const glow = ctx!.createRadialGradient(circleX, circleY, 0, circleX, circleY, glowR);
      glow.addColorStop(0, glowColor);
      glow.addColorStop(1, "transparent");
      ctx!.fillStyle = glow;
      ctx!.fillRect(circleX - glowR, circleY - glowR, glowR * 2, glowR * 2);

      // Circle outline
      ctx!.beginPath();
      ctx!.arc(circleX, circleY, radius, 0, Math.PI * 2);
      const borderColor =
        p === "inhale"
          ? `rgba(94, 234, 212, ${0.25 + prog * 0.25})`
          : p === "exhale"
            ? `rgba(196, 181, 253, ${0.5 - prog * 0.25})`
            : "rgba(94, 234, 212, 0.12)";
      ctx!.strokeStyle = borderColor;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Fill
      const fillColor =
        p === "inhale"
          ? `rgba(94, 234, 212, ${0.03 + prog * 0.04})`
          : p === "exhale"
            ? `rgba(196, 181, 253, ${0.07 - prog * 0.04})`
            : "rgba(94, 234, 212, 0.02)";
      ctx!.fillStyle = fillColor;
      ctx!.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Breathing animation ─────────────────────────────────────────

  useEffect(() => {
    if (phase === "idle") {
      phaseRef.current = "idle";
      progressRef.current = 0;
      return;
    }

    if (phase === "rest") {
      // Between breaths — wait for user to tap where they want the next flower
      phaseRef.current = "idle";
      progressRef.current = 0;
      setBreathProgress(0);
      setCountdown(0);
      return;
    }

    phaseRef.current = phase;
    const pattern = patternRef.current;
    const duration = phase === "inhale" ? pattern.inhale : pattern.exhale;

    function tick() {
      const elapsed = Date.now() - phaseStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      progressRef.current = progress;
      setBreathProgress(progress);

      const remaining = Math.ceil((duration - elapsed) / 1000);
      setCountdown(Math.max(remaining, 0));

      if (progress < 1) {
        breathAnimRef.current = requestAnimationFrame(tick);
      } else if (phase === "inhale") {
        // → exhale
        phaseStartRef.current = Date.now();
        setPhase("exhale");
        progressRef.current = 0;
        haptics.tap();
      } else if (phase === "exhale") {
        // Breath complete — grow a flower!
        spawnFlower();
        setCycleCount((c) => c + 1);
        setPhase("rest");
        progressRef.current = 0;
        setBreathProgress(0);
        setCountdown(0);
      }
    }

    setCountdown(Math.ceil(duration / 1000));
    breathAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(breathAnimRef.current);
  }, [phase]);

  // ── Spawn flower ──────────────────────────────────────────────

  const spawnFlower = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Use tap position if available, otherwise distribute
    const tap = tapPosRef.current;
    let x: number;
    if (tap) {
      // Clamp to ground area
      const margin = w * 0.05;
      x = Math.max(margin, Math.min(w - margin, tap.x));
    } else {
      const margin = w * 0.08;
      const usableW = w - margin * 2;
      x = margin + Math.random() * usableW;
    }

    // Get ground Y at this position
    const base = h * 0.72;
    const hill1 = Math.sin((x / w) * Math.PI * 1.2 + 0.5) * (h * 0.04);
    const hill2 = Math.sin((x / w) * Math.PI * 2.4 + 1.2) * (h * 0.02);
    const groundY = base - hill1 - hill2;

    const colors = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    const id = ++flowerIdRef.current;

    const flower: Flower = {
      id,
      x,
      groundY,
      stemHeight: 40 + Math.random() * 50,
      petalColor: colors,
      petalCount: 5 + Math.floor(Math.random() * 4),
      petalSize: 10 + Math.random() * 8,
      bloomTime: Date.now(),
      swayOffset: Math.random() * Math.PI * 2,
      leafSide: Math.random() > 0.5 ? 1 : -1,
    };

    growingRef.current = {
      flower,
      stemProgress: 0,
      bloomProgress: 0,
      phase: "stem",
    };

    playGrowSound();
    haptics.tap();
  }, []);

  // ── Start breathing ─────────────────────────────────────────────

  const startBreathing = useCallback((tapX?: number, tapY?: number) => {
    if (phase !== "idle" && phase !== "rest") return;
    if (tapX !== undefined && tapY !== undefined) {
      tapPosRef.current = { x: tapX, y: tapY };
    }
    phaseStartRef.current = Date.now();
    setPhase("inhale");
    progressRef.current = 0;
  }, [phase]);

  const stopBreathing = useCallback(() => {
    cancelAnimationFrame(breathAnimRef.current);
    setPhase("idle");
    phaseRef.current = "idle";
    progressRef.current = 0;
    setBreathProgress(0);
    setCountdown(0);
  }, []);

  // ── Guide text ──────────────────────────────────────────────────

  let guideText = "Tap to begin";
  let subText = "Breathe and grow your garden";
  if (phase === "inhale") {
    guideText = "Breathe in";
    subText = countdown > 0 ? `${countdown}` : "";
  } else if (phase === "exhale") {
    guideText = "Breathe out";
    subText = countdown > 0 ? `${countdown}` : "";
  } else if (phase === "rest") {
    guideText = "Tap to plant another";
    subText = "";
  }

  const flowerCount = flowersRef.current.length + (growingRef.current ? 1 : 0);

  return (
    <div
      className="relative h-dvh w-screen select-none overflow-hidden bg-midnight"
      role="application"
      aria-label="Breathing garden — breathe to grow flowers"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          e.preventDefault();
          if (phase === "idle" || phase === "rest") {
            startBreathing(e.clientX, e.clientY);
          }
        }}
      />

      {/* ── Breathing guide text ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center" style={{ top: "56%" }}>
        <p
          className="text-lg font-light tracking-wide"
          style={{
            color:
              phase === "inhale"
                ? "rgba(94, 234, 212, 0.8)"
                : phase === "exhale"
                  ? "rgba(196, 181, 253, 0.8)"
                  : "rgba(226, 232, 240, 0.35)",
          }}
        >
          {guideText}
        </p>
        {phase !== "idle" && countdown > 0 && (
          <p
            className="mt-1 text-2xl font-light tabular-nums"
            style={{
              color:
                phase === "inhale"
                  ? "rgba(94, 234, 212, 0.5)"
                  : "rgba(196, 181, 253, 0.5)",
            }}
          >
            {countdown}
          </p>
        )}
        {phase === "idle" && (
          <p className="mt-1 text-xs text-cream/20">{subText}</p>
        )}
      </div>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-5">
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
          {/* Pattern selector */}
          <button
            className="rounded-full bg-deep/60 px-3 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm transition-colors hover:text-cream-dim"
            onClick={() => {
              const next = (patternIdx + 1) % BREATH_PATTERNS.length;
              setPatternIdx(next);
              patternRef.current = BREATH_PATTERNS[next];
            }}
          >
            {BREATH_PATTERNS[patternIdx].label}
          </button>

          {/* Stop button (when breathing) */}
          {(phase === "inhale" || phase === "exhale" || phase === "rest") && (
            <button
              className="rounded-full bg-deep/60 px-3 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm transition-colors hover:text-cream-dim"
              onClick={stopBreathing}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Flower counter ──────────────────────────────────────────── */}
      {flowerCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 text-center">
          <p className="text-xs text-cream/25">
            {flowerCount} flower{flowerCount !== 1 ? "s" : ""} · {cycleCount} breath{cycleCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* ── How this helps ──────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-5">
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
              Longer exhales than inhales tell your nervous system it&apos;s safe to calm down.
              Each flower is one completed breath &mdash; watch your garden grow as you settle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
