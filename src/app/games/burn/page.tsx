"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Particle types ─────────────────────────────────────────────────

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
}

interface Smoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
  gray: number;
}

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playCrackle() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Fire crackle: short burst of noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  } catch {
    // Audio not available
  }
}

// ─── Component ──────────────────────────────────────────────────────

type BurnPhase = "write" | "burning" | "done";

export default function BurnNotePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const smokeRef = useRef<Smoke[]>([]);
  const burnProgressRef = useRef(0);
  const crackleTimerRef = useRef(0);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<BurnPhase>("write");
  const [showHelp, setShowHelp] = useState(false);

  // ── Start burn ────────────────────────────────────────────────

  const startBurn = useCallback(() => {
    if (!text.trim()) return;
    setPhase("burning");
    burnProgressRef.current = 0;
    haptics.tap();
    playCrackle();
  }, [text]);

  // ── Canvas animation for fire/embers/smoke ─────────────────────

  useEffect(() => {
    if (phase !== "burning") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

    embersRef.current = [];
    smokeRef.current = [];
    burnProgressRef.current = 0;
    crackleTimerRef.current = 0;

    const BURN_DURATION = 240; // frames (~4 seconds for more drama)
    // Note geometry matches the rendered paper note
    const noteLeft = (w - Math.min(w - 48, 448)) / 2;
    const noteRight = (w + Math.min(w - 48, 448)) / 2;
    const noteTop = h * 0.22;
    const noteBottom = h * 0.62;
    const noteW = noteRight - noteLeft;
    const noteH = noteBottom - noteTop;

    // Burn edge noise — creates a jagged, organic burn line
    const edgeSegments = 60;
    const edgeNoise: number[] = [];
    for (let i = 0; i <= edgeSegments; i++) {
      edgeNoise.push((Math.random() - 0.5) * 35);
    }

    function getBurnEdgeY(x: number, baseBurnY: number): number {
      const t = (x - noteLeft) / noteW;
      const idx = t * edgeSegments;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, edgeSegments);
      const frac = idx - i0;
      const noise = edgeNoise[i0] * (1 - frac) + edgeNoise[i1] * frac;
      // Add a wave pattern on top
      const wave = Math.sin(t * Math.PI * 5 + baseBurnY * 0.03) * 8;
      return baseBurnY + noise + wave;
    }

    function spawnEmbers(baseBurnY: number) {
      const count = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const x = noteLeft + Math.random() * noteW;
        const edgeY = getBurnEdgeY(x, baseBurnY);
        const isHot = Math.random() > 0.3;
        embersRef.current.push({
          x,
          y: edgeY + (Math.random() - 0.5) * 15,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -1.5 - Math.random() * 3,
          radius: 1.5 + Math.random() * 4,
          opacity: 0.9 + Math.random() * 0.1,
          life: 0,
          maxLife: 50 + Math.random() * 60,
          color: isHot
            ? { r: 255, g: 200 + Math.floor(Math.random() * 55), b: 50 + Math.floor(Math.random() * 80) }
            : { r: 255, g: 100 + Math.floor(Math.random() * 60), b: 10 + Math.floor(Math.random() * 30) },
        });
      }
    }

    function spawnSmoke(baseBurnY: number) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const x = noteLeft + Math.random() * noteW;
        smokeRef.current.push({
          x,
          y: getBurnEdgeY(x, baseBurnY) - 5,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.8 - Math.random() * 1.5,
          radius: 8 + Math.random() * 15,
          opacity: 0.15 + Math.random() * 0.2,
          life: 0,
          maxLife: 80 + Math.random() * 60,
          gray: 180 + Math.floor(Math.random() * 75),
        });
      }
    }

    function draw() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, w, h);

      burnProgressRef.current += 1;
      const progress = Math.min(burnProgressRef.current / BURN_DURATION, 1);

      // Burn goes from bottom up
      const baseBurnY = noteBottom - noteH * progress;

      // ── Draw the paper note ──────────────────────────────────
      // Only draw the portion above the burn line
      if (progress < 1) {
        ctx2d.save();

        // Clip to the unburned region (above the jagged burn edge)
        ctx2d.beginPath();
        ctx2d.moveTo(noteLeft - 2, noteTop - 5);
        ctx2d.lineTo(noteRight + 2, noteTop - 5);
        // Walk across the burn edge
        for (let i = edgeSegments; i >= 0; i--) {
          const x = noteLeft + (i / edgeSegments) * noteW;
          const y = getBurnEdgeY(x, baseBurnY);
          ctx2d.lineTo(x, y);
        }
        ctx2d.closePath();
        ctx2d.clip();

        // Parchment background
        const paperGrad = ctx2d.createLinearGradient(noteLeft, noteTop, noteRight, noteBottom);
        paperGrad.addColorStop(0, "#f5e6c8");
        paperGrad.addColorStop(0.3, "#f0ddb8");
        paperGrad.addColorStop(0.7, "#e8d1a5");
        paperGrad.addColorStop(1, "#e0c795");

        // Draw paper with slightly rough edges (rounded rect)
        const radius = 16;
        ctx2d.beginPath();
        ctx2d.moveTo(noteLeft + radius, noteTop);
        ctx2d.lineTo(noteRight - radius, noteTop);
        ctx2d.quadraticCurveTo(noteRight, noteTop, noteRight, noteTop + radius);
        ctx2d.lineTo(noteRight, noteBottom - radius);
        ctx2d.quadraticCurveTo(noteRight, noteBottom, noteRight - radius, noteBottom);
        ctx2d.lineTo(noteLeft + radius, noteBottom);
        ctx2d.quadraticCurveTo(noteLeft, noteBottom, noteLeft, noteBottom - radius);
        ctx2d.lineTo(noteLeft, noteTop + radius);
        ctx2d.quadraticCurveTo(noteLeft, noteTop, noteLeft + radius, noteTop);
        ctx2d.closePath();
        ctx2d.fillStyle = paperGrad;
        ctx2d.fill();

        // Paper texture — subtle noise
        for (let i = 0; i < 200; i++) {
          const px = noteLeft + Math.random() * noteW;
          const py = noteTop + Math.random() * noteH;
          ctx2d.fillStyle = `rgba(${120 + Math.random() * 40}, ${100 + Math.random() * 30}, ${60 + Math.random() * 30}, ${0.03 + Math.random() * 0.04})`;
          ctx2d.fillRect(px, py, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }

        // Paper edge shadow
        ctx2d.shadowColor = "rgba(0,0,0,0.15)";
        ctx2d.shadowBlur = 12;
        ctx2d.shadowOffsetX = 0;
        ctx2d.shadowOffsetY = 2;

        // Draw text on paper
        ctx2d.shadowColor = "transparent";
        ctx2d.shadowBlur = 0;
        const textPadding = 20;
        const fontSize = 16;
        const lineHeight = fontSize * 1.6;
        ctx2d.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
        ctx2d.fillStyle = "#3d2e1c";
        ctx2d.textBaseline = "top";

        const maxTextW = noteW - textPadding * 2;
        const lines = wrapText(ctx2d, text, maxTextW);
        for (let li = 0; li < lines.length; li++) {
          const ly = noteTop + textPadding + li * lineHeight;
          if (ly + lineHeight < getBurnEdgeY(noteLeft + noteW / 2, baseBurnY)) {
            ctx2d.fillStyle = "#3d2e1c";
          } else {
            ctx2d.fillStyle = `rgba(61, 46, 28, ${Math.max(0, 0.5)})`;
          }
          ctx2d.fillText(lines[li], noteLeft + textPadding, ly);
        }

        ctx2d.restore();

        // ── Char/darkening zone above burn edge ─────────────────
        // Darkened area just above the burn line (paper curling/charring)
        const charHeight = 40;
        ctx2d.save();
        ctx2d.beginPath();
        // Clip to the char zone
        for (let i = 0; i <= edgeSegments; i++) {
          const x = noteLeft + (i / edgeSegments) * noteW;
          const y = getBurnEdgeY(x, baseBurnY);
          if (i === 0) ctx2d.moveTo(x, y - charHeight);
          else ctx2d.lineTo(x, y - charHeight);
        }
        for (let i = edgeSegments; i >= 0; i--) {
          const x = noteLeft + (i / edgeSegments) * noteW;
          const y = getBurnEdgeY(x, baseBurnY);
          ctx2d.lineTo(x, y);
        }
        ctx2d.closePath();
        ctx2d.clip();

        // Gradient from transparent to dark brown/black at edge
        const charGrad = ctx2d.createLinearGradient(0, baseBurnY - charHeight, 0, baseBurnY + 10);
        charGrad.addColorStop(0, "rgba(60, 30, 5, 0)");
        charGrad.addColorStop(0.3, "rgba(50, 25, 5, 0.3)");
        charGrad.addColorStop(0.6, "rgba(35, 15, 3, 0.6)");
        charGrad.addColorStop(0.85, "rgba(20, 8, 2, 0.85)");
        charGrad.addColorStop(1, "rgba(5, 2, 0, 0.95)");
        ctx2d.fillRect(noteLeft - 5, baseBurnY - charHeight - 10, noteW + 10, charHeight + 20);
        ctx2d.fillStyle = charGrad;
        ctx2d.fillRect(noteLeft - 5, baseBurnY - charHeight - 10, noteW + 10, charHeight + 20);

        ctx2d.restore();

        // ── Glowing fire edge ───────────────────────────────────
        // Draw a bright, prominent fire line along the burn edge
        ctx2d.save();
        ctx2d.globalCompositeOperation = "lighter";

        // Wide ambient glow
        for (let i = 0; i < edgeSegments; i++) {
          const x0 = noteLeft + (i / edgeSegments) * noteW;
          const x1 = noteLeft + ((i + 1) / edgeSegments) * noteW;
          const y0 = getBurnEdgeY(x0, baseBurnY);
          const y1 = getBurnEdgeY(x1, baseBurnY);
          const cx = (x0 + x1) / 2;
          const cy = (y0 + y1) / 2;

          const glowSize = 35 + Math.sin(burnProgressRef.current * 0.15 + i * 0.5) * 10;
          const glowGrad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
          const flicker = 0.6 + Math.sin(burnProgressRef.current * 0.3 + i * 0.7) * 0.2;
          glowGrad.addColorStop(0, `rgba(255, 220, 80, ${0.7 * flicker})`);
          glowGrad.addColorStop(0.2, `rgba(255, 160, 30, ${0.5 * flicker})`);
          glowGrad.addColorStop(0.5, `rgba(255, 80, 10, ${0.3 * flicker})`);
          glowGrad.addColorStop(1, "rgba(200, 40, 0, 0)");
          ctx2d.fillStyle = glowGrad;
          ctx2d.fillRect(cx - glowSize, cy - glowSize, glowSize * 2, glowSize * 2);
        }

        // Bright core fire line
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        for (let i = 0; i <= edgeSegments; i++) {
          const x = noteLeft + (i / edgeSegments) * noteW;
          const y = getBurnEdgeY(x, baseBurnY);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.strokeStyle = `rgba(255, 240, 120, ${0.8 + Math.sin(burnProgressRef.current * 0.2) * 0.2})`;
        ctx2d.shadowColor = "rgba(255, 200, 50, 0.8)";
        ctx2d.shadowBlur = 15;
        ctx2d.stroke();

        // Second pass — orange layer
        ctx2d.lineWidth = 5;
        ctx2d.beginPath();
        for (let i = 0; i <= edgeSegments; i++) {
          const x = noteLeft + (i / edgeSegments) * noteW;
          const y = getBurnEdgeY(x, baseBurnY) + 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.strokeStyle = `rgba(255, 120, 20, ${0.5 + Math.sin(burnProgressRef.current * 0.25 + 1) * 0.15})`;
        ctx2d.shadowColor = "rgba(255, 100, 10, 0.6)";
        ctx2d.shadowBlur = 20;
        ctx2d.stroke();

        // Flickering flame tongues that dance above the burn edge
        for (let i = 0; i < 15; i++) {
          const tx = noteLeft + Math.random() * noteW;
          const baseY = getBurnEdgeY(tx, baseBurnY);
          const flameH = 12 + Math.random() * 25;
          const flameW = 4 + Math.random() * 8;

          const flameGrad = ctx2d.createLinearGradient(tx, baseY, tx, baseY - flameH);
          const rr = Math.random();
          if (rr > 0.6) {
            // Yellow-white flame
            flameGrad.addColorStop(0, "rgba(255, 240, 150, 0.9)");
            flameGrad.addColorStop(0.4, "rgba(255, 200, 60, 0.6)");
            flameGrad.addColorStop(1, "rgba(255, 120, 20, 0)");
          } else if (rr > 0.3) {
            // Orange flame
            flameGrad.addColorStop(0, "rgba(255, 180, 40, 0.8)");
            flameGrad.addColorStop(0.5, "rgba(255, 100, 10, 0.4)");
            flameGrad.addColorStop(1, "rgba(200, 50, 0, 0)");
          } else {
            // Red-orange flame
            flameGrad.addColorStop(0, "rgba(255, 130, 30, 0.7)");
            flameGrad.addColorStop(0.5, "rgba(220, 60, 5, 0.3)");
            flameGrad.addColorStop(1, "rgba(150, 20, 0, 0)");
          }

          ctx2d.beginPath();
          ctx2d.moveTo(tx - flameW / 2, baseY);
          ctx2d.quadraticCurveTo(
            tx - flameW / 4 + Math.sin(burnProgressRef.current * 0.4 + i) * 3,
            baseY - flameH * 0.6,
            tx + Math.sin(burnProgressRef.current * 0.3 + i * 0.7) * 4,
            baseY - flameH
          );
          ctx2d.quadraticCurveTo(
            tx + flameW / 4 + Math.sin(burnProgressRef.current * 0.35 + i) * 3,
            baseY - flameH * 0.6,
            tx + flameW / 2,
            baseY
          );
          ctx2d.closePath();
          ctx2d.fillStyle = flameGrad;
          ctx2d.shadowColor = "transparent";
          ctx2d.shadowBlur = 0;
          ctx2d.fill();
        }

        ctx2d.restore();
      }

      // ── Spawn particles ──────────────────────────────────────
      if (progress < 1) {
        spawnEmbers(baseBurnY);
        if (burnProgressRef.current % 2 === 0) {
          spawnSmoke(baseBurnY);
        }
      }

      // Crackle sound periodically
      crackleTimerRef.current++;
      if (crackleTimerRef.current % 18 === 0 && progress < 0.9) {
        playCrackle();
      }

      // ── Draw smoke particles ─────────────────────────────────
      const smokes = smokeRef.current;
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy *= 0.995;
        s.vx += (Math.random() - 0.5) * 0.15;
        s.radius += 0.3;

        const lifeRatio = 1 - s.life / s.maxLife;
        if (lifeRatio <= 0) {
          smokes.splice(i, 1);
          continue;
        }

        const alpha = s.opacity * lifeRatio * lifeRatio;
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        const smokeGrad = ctx2d.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
        smokeGrad.addColorStop(0, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.6})`);
        smokeGrad.addColorStop(0.5, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.3})`);
        smokeGrad.addColorStop(1, `rgba(${s.gray}, ${s.gray}, ${s.gray}, 0)`);
        ctx2d.fillStyle = smokeGrad;
        ctx2d.fill();
      }

      // ── Draw embers ──────────────────────────────────────────
      const embers = embersRef.current;
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.03; // float upward
        e.vx += (Math.random() - 0.5) * 0.3;
        e.vx *= 0.98;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) {
          embers.splice(i, 1);
          continue;
        }

        const alpha = e.opacity * lifeRatio;
        const r = e.radius * (0.4 + lifeRatio * 0.6);

        // Outer glow
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r * 4, 0, Math.PI * 2);
        const glowGrad = ctx2d.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
        glowGrad.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.4})`);
        glowGrad.addColorStop(1, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, 0)`);
        ctx2d.fillStyle = glowGrad;
        ctx2d.fill();

        // Bright core
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${Math.min(255, e.color.r + 40)}, ${Math.min(255, e.color.g + 60)}, ${Math.min(255, e.color.b + 40)}, ${alpha})`;
        ctx2d.fill();
      }
      ctx2d.restore();

      // ── Ambient fire glow at bottom of screen ────────────────
      if (progress < 0.3) {
        const ambientGrad = ctx2d.createRadialGradient(
          w / 2, h, 0,
          w / 2, h, h * 0.5
        );
        const ambientAlpha = (1 - progress / 0.3) * 0.15;
        ambientGrad.addColorStop(0, `rgba(255, 120, 20, ${ambientAlpha})`);
        ambientGrad.addColorStop(0.5, `rgba(200, 60, 10, ${ambientAlpha * 0.3})`);
        ambientGrad.addColorStop(1, "rgba(150, 30, 0, 0)");
        ctx2d.fillStyle = ambientGrad;
        ctx2d.fillRect(0, h * 0.5, w, h * 0.5);
      }

      // Check if burn is complete
      if (progress >= 1 && embers.length === 0 && smokes.length === 0) {
        setPhase("done");
        return;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, text]);

  // ── Reset ─────────────────────────────────────────────────────

  function reset() {
    setText("");
    setPhase("write");
    embersRef.current = [];
    smokeRef.current = [];
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-dvh flex-col items-center bg-midnight">
      {/* Back button */}
      <div className="absolute left-0 top-0 z-20 p-5">
        <Link
          href="/games"
          className="inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Games
        </Link>
      </div>

      {/* Canvas for fire effects — overlays everything during burn */}
      {phase === "burning" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Write phase */}
      {phase === "write" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pt-20 pb-12">
          <h1 className="mb-2 text-xl font-light tracking-tight text-cream">
            Write it down
          </h1>
          <p className="mb-8 text-sm text-cream-dim/50">
            Whatever you need to let go of.
          </p>

          <div className="relative w-full">
            {/* Paper-styled textarea */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#f5e6c8] via-[#f0ddb8] to-[#e0c795] opacity-[0.07]" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write here..."
              rows={8}
              autoFocus
              className="relative w-full rounded-2xl border border-candle/15 bg-candle/5 px-5 py-4 text-base leading-relaxed text-cream placeholder:text-cream-dim/30 focus:border-candle/30 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={startBurn}
            disabled={!text.trim()}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-candle/15 px-8 py-3.5 text-base font-medium text-candle transition-colors hover:bg-candle/25 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <path d="M9 2C9 2 6 5 6 8.5C6 10.5 7.5 12 9 12C10.5 12 12 10.5 12 8.5C12 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Burn it
          </button>
        </div>
      )}

      {/* Burning phase — canvas handles ALL rendering (paper + fire + text) */}
      {phase === "burning" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6">
          {/* Invisible spacer so canvas knows where the note area is */}
          <div className="w-full" style={{ height: "40vh" }} />
        </div>
      )}

      {/* Done phase */}
      {phase === "done" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-light text-cream/80">Gone.</p>
          <p className="mt-3 text-sm text-cream-dim/50">
            You don&apos;t have to carry that anymore.
          </p>

          <button
            onClick={reset}
            className="mt-8 rounded-2xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
          >
            Write another
          </button>
        </div>
      )}

      {/* How this helps */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-5">
        <div className="w-full max-w-md">
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
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showHelp ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-teal/15 bg-deep/80 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Writing something down and destroying it can genuinely reduce
              how much it bothers you. Research backs this up — the physical
              act of letting go helps your brain let go too.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Text wrapping helper ──────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === "") {
      lines.push("");
      continue;
    }
    const words = para.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}
