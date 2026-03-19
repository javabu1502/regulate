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

interface BurnSpot {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
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

    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

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
  const burnSpotsRef = useRef<BurnSpot[]>([]);
  const crackleTimerRef = useRef(0);
  const frameRef = useRef(0);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPointerDownRef = useRef(false);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<BurnPhase>("write");
  const [showHelp, setShowHelp] = useState(false);

  // ── Start burn ────────────────────────────────────────────────

  const startBurn = useCallback(() => {
    if (!text.trim()) return;
    setPhase("burning");
    haptics.tap();
  }, [text]);

  // ── Canvas animation ─────────────────────────────────────────

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
    burnSpotsRef.current = [];
    crackleTimerRef.current = 0;
    frameRef.current = 0;

    // Note geometry
    const noteMaxW = Math.min(w - 48, 448);
    const noteLeft = (w - noteMaxW) / 2;
    const noteRight = noteLeft + noteMaxW;
    const noteTop = h * 0.15;
    const noteBottom = h * 0.65;
    const noteW = noteRight - noteLeft;
    const noteH = noteBottom - noteTop;

    // Create burn mask canvas (tracks what's burned)
    const burnMask = document.createElement("canvas");
    burnMask.width = w;
    burnMask.height = h;
    const burnCtx = burnMask.getContext("2d")!;
    // Start fully transparent (nothing burned)

    // Pre-render the paper + text to an offscreen canvas
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = w * dpr;
    paperCanvas.height = h * dpr;
    const paperCtx = paperCanvas.getContext("2d")!;
    paperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw parchment paper
    const radius = 16;
    paperCtx.beginPath();
    paperCtx.moveTo(noteLeft + radius, noteTop);
    paperCtx.lineTo(noteRight - radius, noteTop);
    paperCtx.quadraticCurveTo(noteRight, noteTop, noteRight, noteTop + radius);
    paperCtx.lineTo(noteRight, noteBottom - radius);
    paperCtx.quadraticCurveTo(noteRight, noteBottom, noteRight - radius, noteBottom);
    paperCtx.lineTo(noteLeft + radius, noteBottom);
    paperCtx.quadraticCurveTo(noteLeft, noteBottom, noteLeft, noteBottom - radius);
    paperCtx.lineTo(noteLeft, noteTop + radius);
    paperCtx.quadraticCurveTo(noteLeft, noteTop, noteLeft + radius, noteTop);
    paperCtx.closePath();

    const paperGrad = paperCtx.createLinearGradient(noteLeft, noteTop, noteRight, noteBottom);
    paperGrad.addColorStop(0, "#f5e6c8");
    paperGrad.addColorStop(0.3, "#f0ddb8");
    paperGrad.addColorStop(0.7, "#e8d1a5");
    paperGrad.addColorStop(1, "#e0c795");
    paperCtx.fillStyle = paperGrad;
    paperCtx.fill();

    // Paper texture
    for (let i = 0; i < 300; i++) {
      const px = noteLeft + Math.random() * noteW;
      const py = noteTop + Math.random() * noteH;
      paperCtx.fillStyle = `rgba(${120 + Math.random() * 40}, ${100 + Math.random() * 30}, ${60 + Math.random() * 30}, ${0.03 + Math.random() * 0.04})`;
      paperCtx.fillRect(px, py, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Draw text
    const textPadding = 20;
    const fontSize = 16;
    const lineHeight = fontSize * 1.6;
    paperCtx.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
    paperCtx.fillStyle = "#3d2e1c";
    paperCtx.textBaseline = "top";
    const maxTextW = noteW - textPadding * 2;
    const lines = wrapText(paperCtx, text, maxTextW);
    for (let li = 0; li < lines.length; li++) {
      paperCtx.fillText(lines[li], noteLeft + textPadding, noteTop + textPadding + li * lineHeight);
    }

    // Paper shadow
    paperCtx.save();
    paperCtx.beginPath();
    paperCtx.moveTo(noteLeft + radius, noteTop);
    paperCtx.lineTo(noteRight - radius, noteTop);
    paperCtx.quadraticCurveTo(noteRight, noteTop, noteRight, noteTop + radius);
    paperCtx.lineTo(noteRight, noteBottom - radius);
    paperCtx.quadraticCurveTo(noteRight, noteBottom, noteRight - radius, noteBottom);
    paperCtx.lineTo(noteLeft + radius, noteBottom);
    paperCtx.quadraticCurveTo(noteLeft, noteBottom, noteLeft, noteBottom - radius);
    paperCtx.lineTo(noteLeft, noteTop + radius);
    paperCtx.quadraticCurveTo(noteLeft, noteTop, noteLeft + radius, noteTop);
    paperCtx.closePath();
    paperCtx.strokeStyle = "rgba(0,0,0,0.08)";
    paperCtx.lineWidth = 1;
    paperCtx.stroke();
    paperCtx.restore();

    function isOnPaper(x: number, y: number): boolean {
      return x >= noteLeft && x <= noteRight && y >= noteTop && y <= noteBottom;
    }

    function spawnEmbersAt(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.5;
        const isHot = Math.random() > 0.3;
        embersRef.current.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: -1 - Math.random() * 3 + Math.sin(angle) * speed * 0.3,
          radius: 1.5 + Math.random() * 3.5,
          opacity: 0.9,
          life: 0,
          maxLife: 40 + Math.random() * 50,
          color: isHot
            ? { r: 255, g: 200 + Math.floor(Math.random() * 55), b: 50 + Math.floor(Math.random() * 80) }
            : { r: 255, g: 100 + Math.floor(Math.random() * 60), b: 10 + Math.floor(Math.random() * 30) },
        });
      }
    }

    function spawnSmokeAt(x: number, y: number) {
      for (let i = 0; i < 2; i++) {
        smokeRef.current.push({
          x: x + (Math.random() - 0.5) * 15,
          y: y - 5 + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.8 - Math.random() * 1.2,
          radius: 8 + Math.random() * 12,
          opacity: 0.15 + Math.random() * 0.15,
          life: 0,
          maxLife: 70 + Math.random() * 50,
          gray: 180 + Math.floor(Math.random() * 75),
        });
      }
    }

    function draw() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, w, h);
      frameRef.current++;

      // ── Grow burn spots ──────────────────────────────────────
      const spots = burnSpotsRef.current;
      for (const spot of spots) {
        if (spot.radius < spot.maxRadius) {
          spot.radius += spot.speed;
        }
      }

      // ── Update burn mask ─────────────────────────────────────
      for (const spot of spots) {
        const edgeRadius = spot.radius;
        // Draw a jagged-edged circle on the burn mask
        burnCtx.beginPath();
        const segments = 24;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const jag = 1 + (Math.sin(angle * 7 + spot.x) * 0.08 + Math.sin(angle * 13 + spot.y) * 0.05);
          const r = edgeRadius * jag;
          const px = spot.x + Math.cos(angle) * r;
          const py = spot.y + Math.sin(angle) * r;
          if (i === 0) burnCtx.moveTo(px, py);
          else burnCtx.lineTo(px, py);
        }
        burnCtx.closePath();
        burnCtx.fillStyle = "white";
        burnCtx.fill();
      }

      // ── Draw unburned paper ──────────────────────────────────
      // Use burn mask to clip: draw paper, then erase burned areas
      ctx2d.save();
      ctx2d.drawImage(paperCanvas, 0, 0, w, h);

      // Erase burned areas using the mask
      ctx2d.globalCompositeOperation = "destination-out";
      ctx2d.drawImage(burnMask, 0, 0);
      ctx2d.restore();

      // ── Draw char edge around burn spots ─────────────────────
      for (const spot of spots) {
        if (spot.radius < 3) continue;

        // Charred ring at the burn edge
        const charWidth = 15;
        ctx2d.save();
        ctx2d.beginPath();
        ctx2d.arc(spot.x, spot.y, spot.radius + charWidth, 0, Math.PI * 2);
        ctx2d.arc(spot.x, spot.y, Math.max(0, spot.radius - 3), 0, Math.PI * 2, true);
        ctx2d.closePath();
        ctx2d.clip();

        const charGrad = ctx2d.createRadialGradient(
          spot.x, spot.y, Math.max(0, spot.radius - 3),
          spot.x, spot.y, spot.radius + charWidth,
        );
        charGrad.addColorStop(0, "rgba(5, 2, 0, 0.9)");
        charGrad.addColorStop(0.3, "rgba(35, 15, 3, 0.7)");
        charGrad.addColorStop(0.6, "rgba(60, 30, 5, 0.3)");
        charGrad.addColorStop(1, "rgba(80, 40, 10, 0)");
        ctx2d.fillStyle = charGrad;
        ctx2d.fillRect(spot.x - spot.radius - charWidth - 5, spot.y - spot.radius - charWidth - 5,
          (spot.radius + charWidth) * 2 + 10, (spot.radius + charWidth) * 2 + 10);
        ctx2d.restore();
      }

      // ── Fire glow at burn edges ──────────────────────────────
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (const spot of spots) {
        if (spot.radius >= spot.maxRadius) continue;
        if (spot.radius < 2) continue;

        // Fire ring glow
        const glowSize = 30 + Math.sin(frameRef.current * 0.15 + spot.x) * 8;
        const segments = 16;
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const jag = 1 + Math.sin(angle * 7 + frameRef.current * 0.2) * 0.1;
          const ex = spot.x + Math.cos(angle) * spot.radius * jag;
          const ey = spot.y + Math.sin(angle) * spot.radius * jag;

          if (!isOnPaper(ex, ey)) continue;

          const flicker = 0.5 + Math.sin(frameRef.current * 0.3 + i * 1.3) * 0.3;
          const grad = ctx2d.createRadialGradient(ex, ey, 0, ex, ey, glowSize);
          grad.addColorStop(0, `rgba(255, 220, 80, ${0.6 * flicker})`);
          grad.addColorStop(0.3, `rgba(255, 140, 30, ${0.4 * flicker})`);
          grad.addColorStop(0.7, `rgba(255, 60, 10, ${0.15 * flicker})`);
          grad.addColorStop(1, "rgba(200, 30, 0, 0)");
          ctx2d.fillStyle = grad;
          ctx2d.fillRect(ex - glowSize, ey - glowSize, glowSize * 2, glowSize * 2);
        }

        // Flame tongues around the burn edge
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + frameRef.current * 0.02;
          const fx = spot.x + Math.cos(angle) * spot.radius;
          const fy = spot.y + Math.sin(angle) * spot.radius;
          if (!isOnPaper(fx, fy)) continue;

          const flameH = 10 + Math.random() * 18;
          const flameW = 3 + Math.random() * 5;
          const flameGrad = ctx2d.createLinearGradient(fx, fy, fx, fy - flameH);
          flameGrad.addColorStop(0, "rgba(255, 240, 140, 0.8)");
          flameGrad.addColorStop(0.4, "rgba(255, 180, 50, 0.5)");
          flameGrad.addColorStop(1, "rgba(255, 100, 10, 0)");

          ctx2d.beginPath();
          ctx2d.moveTo(fx - flameW / 2, fy);
          ctx2d.quadraticCurveTo(
            fx + Math.sin(frameRef.current * 0.4 + i) * 3,
            fy - flameH * 0.6,
            fx + Math.sin(frameRef.current * 0.3 + i * 0.7) * 4,
            fy - flameH,
          );
          ctx2d.quadraticCurveTo(
            fx + Math.sin(frameRef.current * 0.35 + i) * 3,
            fy - flameH * 0.6,
            fx + flameW / 2,
            fy,
          );
          ctx2d.closePath();
          ctx2d.fillStyle = flameGrad;
          ctx2d.fill();
        }
      }
      ctx2d.restore();

      // ── Spawn embers at finger position while holding ────────
      const ptr = pointerPosRef.current;
      if (ptr && isPointerDownRef.current && frameRef.current % 4 === 0) {
        if (isOnPaper(ptr.x, ptr.y)) {
          spawnEmbersAt(ptr.x, ptr.y, 1);
        }
      }

      // ── Match flame at finger position ────────────────────────
      if (ptr && isPointerDownRef.current) {
        ctx2d.save();
        ctx2d.globalCompositeOperation = "lighter";

        // Lighter flame body
        const flameH = 35 + Math.sin(frameRef.current * 0.3) * 5;
        const flameW = 12;
        const fx = ptr.x;
        const fy = ptr.y;

        // Outer flame (orange)
        const outerGrad = ctx2d.createLinearGradient(fx, fy, fx, fy - flameH);
        outerGrad.addColorStop(0, "rgba(255, 200, 60, 0.9)");
        outerGrad.addColorStop(0.3, "rgba(255, 140, 20, 0.7)");
        outerGrad.addColorStop(0.7, "rgba(255, 80, 10, 0.3)");
        outerGrad.addColorStop(1, "rgba(200, 40, 0, 0)");

        ctx2d.beginPath();
        ctx2d.moveTo(fx - flameW / 2, fy);
        ctx2d.quadraticCurveTo(
          fx - flameW / 3 + Math.sin(frameRef.current * 0.5) * 4,
          fy - flameH * 0.5,
          fx + Math.sin(frameRef.current * 0.4) * 3,
          fy - flameH,
        );
        ctx2d.quadraticCurveTo(
          fx + flameW / 3 + Math.sin(frameRef.current * 0.45) * 4,
          fy - flameH * 0.5,
          fx + flameW / 2,
          fy,
        );
        ctx2d.closePath();
        ctx2d.fillStyle = outerGrad;
        ctx2d.fill();

        // Inner flame (bright yellow-white)
        const innerH = flameH * 0.5;
        const innerW = flameW * 0.5;
        const innerGrad = ctx2d.createLinearGradient(fx, fy, fx, fy - innerH);
        innerGrad.addColorStop(0, "rgba(255, 255, 220, 1)");
        innerGrad.addColorStop(0.5, "rgba(255, 240, 150, 0.8)");
        innerGrad.addColorStop(1, "rgba(255, 200, 80, 0)");

        ctx2d.beginPath();
        ctx2d.moveTo(fx - innerW / 2, fy);
        ctx2d.quadraticCurveTo(
          fx + Math.sin(frameRef.current * 0.6) * 2,
          fy - innerH * 0.6,
          fx + Math.sin(frameRef.current * 0.5) * 1.5,
          fy - innerH,
        );
        ctx2d.quadraticCurveTo(
          fx + Math.sin(frameRef.current * 0.55) * 2,
          fy - innerH * 0.6,
          fx + innerW / 2,
          fy,
        );
        ctx2d.closePath();
        ctx2d.fillStyle = innerGrad;
        ctx2d.fill();

        // Point glow
        const ptGrad = ctx2d.createRadialGradient(fx, fy, 0, fx, fy, 25);
        ptGrad.addColorStop(0, "rgba(255, 220, 100, 0.5)");
        ptGrad.addColorStop(0.5, "rgba(255, 150, 30, 0.2)");
        ptGrad.addColorStop(1, "rgba(255, 80, 10, 0)");
        ctx2d.fillStyle = ptGrad;
        ctx2d.fillRect(fx - 25, fy - 25, 50, 50);

        ctx2d.restore();
      }

      // ── Spawn particles at active burn edges ───────────────
      for (const spot of spots) {
        if (spot.radius >= spot.maxRadius) continue;
        if (frameRef.current % 3 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const ex = spot.x + Math.cos(angle) * spot.radius;
          const ey = spot.y + Math.sin(angle) * spot.radius;
          if (isOnPaper(ex, ey)) {
            spawnEmbersAt(ex, ey, 2);
          }
        }
        if (frameRef.current % 5 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const sx = spot.x + Math.cos(angle) * spot.radius * 0.8;
          const sy = spot.y + Math.sin(angle) * spot.radius * 0.8;
          spawnSmokeAt(sx, sy);
        }
      }

      // Crackle
      crackleTimerRef.current++;
      if (crackleTimerRef.current % 20 === 0 && spots.some((s) => s.radius < s.maxRadius)) {
        playCrackle();
      }

      // ── Draw smoke ─────────────────────────────────────────
      const smokes = smokeRef.current;
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy *= 0.995;
        s.vx += (Math.random() - 0.5) * 0.1;
        s.radius += 0.25;

        const lifeRatio = 1 - s.life / s.maxLife;
        if (lifeRatio <= 0) { smokes.splice(i, 1); continue; }

        const alpha = s.opacity * lifeRatio * lifeRatio;
        const grad = ctx2d.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
        grad.addColorStop(0, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.5})`);
        grad.addColorStop(0.5, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.2})`);
        grad.addColorStop(1, `rgba(${s.gray}, ${s.gray}, ${s.gray}, 0)`);
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }

      // ── Draw embers ────────────────────────────────────────
      const embers = embersRef.current;
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.03;
        e.vx += (Math.random() - 0.5) * 0.2;
        e.vx *= 0.98;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) { embers.splice(i, 1); continue; }

        const alpha = e.opacity * lifeRatio;
        const r = e.radius * (0.4 + lifeRatio * 0.6);

        const grad = ctx2d.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
        grad.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, 0)`);
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r * 3, 0, Math.PI * 2);
        ctx2d.fillStyle = grad;
        ctx2d.fill();

        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${Math.min(255, e.color.r + 40)}, ${Math.min(255, e.color.g + 60)}, ${Math.min(255, e.color.b + 40)}, ${alpha})`;
        ctx2d.fill();
      }
      ctx2d.restore();

      // ── Check if fully burned ──────────────────────────────
      const totalBurnArea = spots.reduce((sum, s) => sum + Math.PI * s.radius * s.radius, 0);
      const paperArea = noteW * noteH;
      const allStopped = spots.every((s) => s.radius >= s.maxRadius);

      // Done when enough burn area covers the paper and particles have mostly cleared
      if (totalBurnArea > paperArea * 0.75 && allStopped && embers.length < 5 && smokes.length < 5) {
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

  // ── Pointer handlers for burn phase ─────────────────────────

  const handleBurnPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "burning") return;
    isPointerDownRef.current = true;
    const pos = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pos;

    // Create a burn spot at touch point
    burnSpotsRef.current.push({
      x: pos.x,
      y: pos.y,
      radius: 0,
      maxRadius: 50 + Math.random() * 40,
      speed: 1.5 + Math.random() * 1,
    });

    haptics.tap();
    playCrackle();
  }, [phase]);

  const handleBurnPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const pos = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pos;

    // Add new burn spots as finger moves — closer spacing for continuous burn trail
    const spots = burnSpotsRef.current;
    const last = spots[spots.length - 1];
    if (last) {
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 18) {
        spots.push({
          x: pos.x,
          y: pos.y,
          radius: 0,
          maxRadius: 45 + Math.random() * 35,
          speed: 1.8 + Math.random() * 1.2,
        });
        if (dist > 35) {
          // Also add intermediate spot for seamless burn trail
          spots.push({
            x: last.x + dx * 0.5,
            y: last.y + dy * 0.5,
            radius: 0,
            maxRadius: 40 + Math.random() * 30,
            speed: 1.5 + Math.random() * 1,
          });
        }
      }
    }
  }, []);

  const handleBurnPointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    pointerPosRef.current = null;
  }, []);

  // ── Reset ─────────────────────────────────────────────────────

  function reset() {
    setText("");
    setPhase("write");
    embersRef.current = [];
    smokeRef.current = [];
    burnSpotsRef.current = [];
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

      {/* Canvas for fire effects — interactive during burn */}
      {phase === "burning" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 touch-none"
          onPointerDown={handleBurnPointerDown}
          onPointerMove={handleBurnPointerMove}
          onPointerUp={handleBurnPointerUp}
          onPointerCancel={handleBurnPointerUp}
          onPointerLeave={handleBurnPointerUp}
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

          <p className="mt-4 text-xs text-cream-dim/30">
            Move the match across the paper to burn it
          </p>
        </div>
      )}

      {/* Burning phase — hint text */}
      {phase === "burning" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-20 text-center">
          <p className="text-sm text-cream/30">
            Drag the match across the paper
          </p>
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
