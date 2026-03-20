"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Types ──────────────────────────────────────────────────────────

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

    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  } catch {
    // Audio not available
  }
}

// ─── Component ──────────────────────────────────────────────────────

type Phase = "write" | "burning" | "done";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("write");
  const [showHelp, setShowHelp] = useState(false);

  // Auto-focus the textarea
  useEffect(() => {
    if (phase === "write" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase]);

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

    // Note geometry — taller, more like a real piece of paper
    const noteMaxW = Math.min(w - 48, 380);
    const noteLeft = (w - noteMaxW) / 2;
    const noteRight = noteLeft + noteMaxW;
    const noteTop = h * 0.1;
    const noteBottom = Math.min(h * 0.72, noteTop + 520);
    const noteW = noteRight - noteLeft;
    const noteH = noteBottom - noteTop;

    // Create burn mask canvas
    const burnMask = document.createElement("canvas");
    burnMask.width = w;
    burnMask.height = h;
    const burnCtx = burnMask.getContext("2d")!;

    // Pre-render the paper + text
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = w * dpr;
    paperCanvas.height = h * dpr;
    const paperCtx = paperCanvas.getContext("2d")!;
    paperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw paper
    const radius = 4;
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

    // Subtle paper texture
    for (let i = 0; i < 200; i++) {
      const px = noteLeft + Math.random() * noteW;
      const py = noteTop + Math.random() * noteH;
      paperCtx.fillStyle = `rgba(${120 + Math.random() * 40}, ${100 + Math.random() * 30}, ${60 + Math.random() * 30}, ${0.02 + Math.random() * 0.03})`;
      paperCtx.fillRect(px, py, 1 + Math.random() * 2, 1);
    }

    // Faint ruled lines
    paperCtx.strokeStyle = "rgba(150, 130, 100, 0.08)";
    paperCtx.lineWidth = 0.5;
    const lineSpacing = 28;
    const firstLine = noteTop + 40;
    for (let ly = firstLine; ly < noteBottom - 20; ly += lineSpacing) {
      paperCtx.beginPath();
      paperCtx.moveTo(noteLeft + 16, ly);
      paperCtx.lineTo(noteRight - 16, ly);
      paperCtx.stroke();
    }

    // Draw handwritten text
    const textPadding = 24;
    const fontSize = 18;
    const lineHeight = lineSpacing;
    paperCtx.font = `${fontSize}px 'Georgia', 'Times New Roman', serif`;
    paperCtx.fillStyle = "#2a1f10";
    paperCtx.textBaseline = "bottom";
    const maxTextW = noteW - textPadding * 2;
    const lines = wrapText(paperCtx, text, maxTextW);
    for (let li = 0; li < lines.length; li++) {
      const y = firstLine + li * lineHeight;
      if (y > noteBottom - 20) break;
      // Slight random offset to feel handwritten
      const ox = (Math.random() - 0.5) * 1;
      const oy = (Math.random() - 0.5) * 1;
      paperCtx.fillText(lines[li], noteLeft + textPadding + ox, y + oy);
    }

    // Paper edge shadow
    paperCtx.save();
    paperCtx.shadowColor = "rgba(0,0,0,0.12)";
    paperCtx.shadowBlur = 12;
    paperCtx.shadowOffsetY = 2;
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
    paperCtx.strokeStyle = "rgba(0,0,0,0.06)";
    paperCtx.lineWidth = 1;
    paperCtx.stroke();
    paperCtx.restore();

    function isOnPaper(x: number, y: number): boolean {
      return x >= noteLeft && x <= noteRight && y >= noteTop && y <= noteBottom;
    }

    function spawnEmbersAt(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1;
        embersRef.current.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed * 0.3,
          vy: -0.5 - Math.random() * 1.5,
          radius: 1 + Math.random() * 2,
          opacity: 0.7,
          life: 0,
          maxLife: 25 + Math.random() * 30,
          color: Math.random() > 0.4
            ? { r: 255, g: 180 + Math.floor(Math.random() * 60), b: 40 + Math.floor(Math.random() * 40) }
            : { r: 255, g: 100 + Math.floor(Math.random() * 40), b: 10 + Math.floor(Math.random() * 20) },
        });
      }
    }

    function spawnSmokeAt(x: number, y: number) {
      smokeRef.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.6,
        radius: 4 + Math.random() * 6,
        opacity: 0.08 + Math.random() * 0.06,
        life: 0,
        maxLife: 50 + Math.random() * 30,
        gray: 180 + Math.floor(Math.random() * 60),
      });
    }

    // ── Match state ──────────────────────────────────────────────
    // The match is drawn as a stick below the touch point with a small flame at the tip
    const matchLen = 80;
    const matchW = 4;

    function drawMatch(ctx: CanvasRenderingContext2D, tipX: number, tipY: number) {
      // Match stick — angled slightly
      const angle = Math.PI * 0.65; // angled like holding from bottom-right
      const baseX = tipX + Math.cos(angle) * matchLen;
      const baseY = tipY + Math.sin(angle) * matchLen;

      // Wooden stick
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = matchW;
      const stickGrad = ctx.createLinearGradient(tipX, tipY, baseX, baseY);
      stickGrad.addColorStop(0, "#8B6914");
      stickGrad.addColorStop(0.15, "#A67C28");
      stickGrad.addColorStop(1, "#C49A3C");
      ctx.strokeStyle = stickGrad;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(baseX, baseY);
      ctx.stroke();

      // Match head (dark red/brown bulb)
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#5C1A0A";
      ctx.fill();

      // Small flame at match head
      const flameH = 16 + Math.sin(frameRef.current * 0.4) * 3;
      const flameW = 6;
      const fx = tipX;
      const fy = tipY;

      ctx.globalCompositeOperation = "lighter";

      // Outer flame (soft orange)
      const outerGrad = ctx.createRadialGradient(fx, fy - flameH * 0.4, 1, fx, fy - flameH * 0.3, flameH * 0.7);
      outerGrad.addColorStop(0, "rgba(255, 200, 60, 0.6)");
      outerGrad.addColorStop(0.5, "rgba(255, 130, 20, 0.3)");
      outerGrad.addColorStop(1, "rgba(255, 80, 10, 0)");

      ctx.beginPath();
      ctx.moveTo(fx - flameW * 0.6, fy);
      ctx.quadraticCurveTo(
        fx - flameW * 0.3 + Math.sin(frameRef.current * 0.5) * 2,
        fy - flameH * 0.5,
        fx + Math.sin(frameRef.current * 0.4) * 1.5,
        fy - flameH,
      );
      ctx.quadraticCurveTo(
        fx + flameW * 0.3 + Math.sin(frameRef.current * 0.45) * 2,
        fy - flameH * 0.5,
        fx + flameW * 0.6,
        fy,
      );
      ctx.closePath();
      ctx.fillStyle = outerGrad;
      ctx.fill();

      // Inner flame (bright)
      const innerH = flameH * 0.5;
      const innerW = flameW * 0.35;
      const innerGrad = ctx.createRadialGradient(fx, fy - innerH * 0.3, 0, fx, fy - innerH * 0.3, innerH * 0.5);
      innerGrad.addColorStop(0, "rgba(255, 255, 230, 0.9)");
      innerGrad.addColorStop(0.5, "rgba(255, 240, 150, 0.5)");
      innerGrad.addColorStop(1, "rgba(255, 200, 80, 0)");

      ctx.beginPath();
      ctx.moveTo(fx - innerW, fy);
      ctx.quadraticCurveTo(fx, fy - innerH * 0.7, fx + Math.sin(frameRef.current * 0.6) * 1, fy - innerH);
      ctx.quadraticCurveTo(fx, fy - innerH * 0.7, fx + innerW, fy);
      ctx.closePath();
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Tiny warm glow
      const ptGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12);
      ptGrad.addColorStop(0, "rgba(255, 200, 80, 0.25)");
      ptGrad.addColorStop(1, "rgba(255, 120, 20, 0)");
      ctx.fillStyle = ptGrad;
      ctx.fillRect(fx - 12, fy - 12, 24, 24);

      ctx.restore();
    }

    function draw() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, w, h);
      frameRef.current++;

      // ── Grow burn spots (smaller, slower) ───────────────────
      const spots = burnSpotsRef.current;
      for (const spot of spots) {
        if (spot.radius < spot.maxRadius) {
          spot.radius += spot.speed;
        }
      }

      // ── Update burn mask ────────────────────────────────────
      for (const spot of spots) {
        burnCtx.beginPath();
        const segments = 20;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const jag = 1 + (Math.sin(angle * 9 + spot.x) * 0.06 + Math.sin(angle * 15 + spot.y) * 0.04);
          const r = spot.radius * jag;
          const px = spot.x + Math.cos(angle) * r;
          const py = spot.y + Math.sin(angle) * r;
          if (i === 0) burnCtx.moveTo(px, py);
          else burnCtx.lineTo(px, py);
        }
        burnCtx.closePath();
        burnCtx.fillStyle = "white";
        burnCtx.fill();
      }

      // ── Draw unburned paper ─────────────────────────────────
      ctx2d.save();
      ctx2d.drawImage(paperCanvas, 0, 0, w, h);
      ctx2d.globalCompositeOperation = "destination-out";
      ctx2d.drawImage(burnMask, 0, 0);
      ctx2d.restore();

      // ── Char edges (subtle brown ring) ──────────────────────
      for (const spot of spots) {
        if (spot.radius < 2) continue;

        const charWidth = 8;
        ctx2d.save();
        ctx2d.beginPath();
        ctx2d.arc(spot.x, spot.y, spot.radius + charWidth, 0, Math.PI * 2);
        ctx2d.arc(spot.x, spot.y, Math.max(0, spot.radius - 2), 0, Math.PI * 2, true);
        ctx2d.closePath();
        ctx2d.clip();

        const charGrad = ctx2d.createRadialGradient(
          spot.x, spot.y, Math.max(0, spot.radius - 2),
          spot.x, spot.y, spot.radius + charWidth,
        );
        charGrad.addColorStop(0, "rgba(10, 5, 0, 0.8)");
        charGrad.addColorStop(0.3, "rgba(40, 20, 5, 0.5)");
        charGrad.addColorStop(0.7, "rgba(70, 40, 10, 0.15)");
        charGrad.addColorStop(1, "rgba(80, 40, 10, 0)");
        ctx2d.fillStyle = charGrad;
        ctx2d.fillRect(
          spot.x - spot.radius - charWidth - 2,
          spot.y - spot.radius - charWidth - 2,
          (spot.radius + charWidth) * 2 + 4,
          (spot.radius + charWidth) * 2 + 4,
        );
        ctx2d.restore();
      }

      // ── Tiny glow at active burn edges (no flame tongues) ───
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (const spot of spots) {
        if (spot.radius >= spot.maxRadius || spot.radius < 2) continue;
        const glowSize = 10 + Math.sin(frameRef.current * 0.2 + spot.x) * 3;
        // Just a few subtle glow points
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + frameRef.current * 0.03;
          const ex = spot.x + Math.cos(angle) * spot.radius;
          const ey = spot.y + Math.sin(angle) * spot.radius;
          if (!isOnPaper(ex, ey)) continue;
          const flicker = 0.3 + Math.sin(frameRef.current * 0.25 + i * 2) * 0.15;
          const grad = ctx2d.createRadialGradient(ex, ey, 0, ex, ey, glowSize);
          grad.addColorStop(0, `rgba(255, 180, 60, ${0.25 * flicker})`);
          grad.addColorStop(0.5, `rgba(255, 100, 20, ${0.1 * flicker})`);
          grad.addColorStop(1, "rgba(200, 40, 0, 0)");
          ctx2d.fillStyle = grad;
          ctx2d.fillRect(ex - glowSize, ey - glowSize, glowSize * 2, glowSize * 2);
        }
      }
      ctx2d.restore();

      // ── Draw match at finger position ───────────────────────
      const ptr = pointerPosRef.current;
      if (ptr && isPointerDownRef.current) {
        drawMatch(ctx2d, ptr.x, ptr.y);

        // Sparse embers at match tip
        if (frameRef.current % 8 === 0 && isOnPaper(ptr.x, ptr.y)) {
          spawnEmbersAt(ptr.x, ptr.y, 1);
        }
      }

      // ── Spawn particles at active burn edges (sparse) ──────
      for (const spot of spots) {
        if (spot.radius >= spot.maxRadius) continue;
        if (frameRef.current % 8 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const ex = spot.x + Math.cos(angle) * spot.radius;
          const ey = spot.y + Math.sin(angle) * spot.radius;
          if (isOnPaper(ex, ey)) spawnEmbersAt(ex, ey, 1);
        }
        if (frameRef.current % 12 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const sx = spot.x + Math.cos(angle) * spot.radius * 0.7;
          const sy = spot.y + Math.sin(angle) * spot.radius * 0.7;
          spawnSmokeAt(sx, sy);
        }
      }

      // Crackle (quieter, less frequent)
      crackleTimerRef.current++;
      if (crackleTimerRef.current % 35 === 0 && spots.some((s) => s.radius < s.maxRadius)) {
        playCrackle();
      }

      // ── Draw smoke ──────────────────────────────────────────
      const smokes = smokeRef.current;
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy *= 0.995;
        s.vx += (Math.random() - 0.5) * 0.05;
        s.radius += 0.15;

        const lifeRatio = 1 - s.life / s.maxLife;
        if (lifeRatio <= 0) { smokes.splice(i, 1); continue; }

        const alpha = s.opacity * lifeRatio * lifeRatio;
        const grad = ctx2d.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
        grad.addColorStop(0, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${s.gray}, ${s.gray}, ${s.gray}, 0)`);
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }

      // ── Draw embers ─────────────────────────────────────────
      const embers = embersRef.current;
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.02;
        e.vx += (Math.random() - 0.5) * 0.1;
        e.vx *= 0.98;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) { embers.splice(i, 1); continue; }

        const alpha = e.opacity * lifeRatio;
        const r = e.radius * (0.5 + lifeRatio * 0.5);

        // Small glow
        const grad = ctx2d.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 2);
        grad.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.3})`);
        grad.addColorStop(1, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, 0)`);
        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r * 2, 0, Math.PI * 2);
        ctx2d.fillStyle = grad;
        ctx2d.fill();

        ctx2d.beginPath();
        ctx2d.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`;
        ctx2d.fill();
      }
      ctx2d.restore();

      // ── Check if done ───────────────────────────────────────
      const totalBurnArea = spots.reduce((sum, s) => sum + Math.PI * s.radius * s.radius, 0);
      const paperArea = noteW * noteH;
      const allStopped = spots.every((s) => s.radius >= s.maxRadius);

      if (totalBurnArea > paperArea * 0.7 && allStopped && embers.length < 3 && smokes.length < 3) {
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

  // ── Pointer handlers ──────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "burning") return;
    isPointerDownRef.current = true;
    const pos = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pos;

    // Smaller burn spots — like a real match
    burnSpotsRef.current.push({
      x: pos.x,
      y: pos.y,
      radius: 0,
      maxRadius: 20 + Math.random() * 15,
      speed: 0.6 + Math.random() * 0.4,
    });

    haptics.tap();
    playCrackle();
  }, [phase]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const pos = { x: e.clientX, y: e.clientY };
    pointerPosRef.current = pos;

    const spots = burnSpotsRef.current;
    const last = spots[spots.length - 1];
    if (last) {
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 12) {
        spots.push({
          x: pos.x,
          y: pos.y,
          radius: 0,
          maxRadius: 18 + Math.random() * 12,
          speed: 0.5 + Math.random() * 0.4,
        });
        if (dist > 25) {
          spots.push({
            x: last.x + dx * 0.5,
            y: last.y + dy * 0.5,
            radius: 0,
            maxRadius: 15 + Math.random() * 10,
            speed: 0.4 + Math.random() * 0.3,
          });
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
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

      {/* Canvas for burn phase */}
      {phase === "burning" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Write phase — typing directly on paper */}
      {phase === "write" && (
        <div className="flex w-full flex-1 flex-col items-center justify-start px-6 pt-20 pb-32">
          <p className="mb-6 text-sm text-cream-dim/40">
            Whatever you need to let go of.
          </p>

          {/* Paper */}
          <div className="relative w-full max-w-[380px]">
            {/* Paper background */}
            <div
              className="rounded-sm"
              style={{
                background: "linear-gradient(135deg, #f5e6c8 0%, #f0ddb8 30%, #e8d1a5 70%, #e0c795 100%)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)",
              }}
            >
              {/* Ruled lines background */}
              <div
                className="absolute inset-0 pointer-events-none rounded-sm"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(150,130,100,0.1) 27px, rgba(150,130,100,0.1) 28px)",
                  backgroundPosition: "0 12px",
                }}
              />
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write here..."
                rows={12}
                autoFocus
                className="relative w-full rounded-sm bg-transparent px-6 py-4 text-lg leading-[28px] text-[#2a1f10] placeholder:text-[#2a1f10]/25 focus:outline-none resize-none"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  caretColor: "#2a1f10",
                }}
              />
            </div>

            {/* Burn button */}
            <button
              onClick={startBurn}
              disabled={!text.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-candle/10 px-6 py-3 text-sm text-candle/70 transition-colors hover:bg-candle/20 hover:text-candle disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M9 2C9 2 6 5 6 8.5C6 10.5 7.5 12 9 12C10.5 12 12 10.5 12 8.5C12 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Burn it
            </button>
          </div>
        </div>
      )}

      {/* Burning phase hint */}
      {phase === "burning" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 text-center">
          <p className="text-xs text-cream/20">
            Hold the match to the paper
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
