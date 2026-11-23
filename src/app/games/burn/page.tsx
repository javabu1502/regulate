"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const caveat = Caveat({ subsets: ["latin"], weight: ["500"] });

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

type Point = { x: number; y: number };

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playCrackle() {
  try {
    if (!isGameSoundEnabled()) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  } catch {
    // Audio not available
  }
}

// ─── Stroke rendering helper ────────────────────────────────────────

function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Point[][],
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
) {
  ctx.save();
  ctx.strokeStyle = "#2a1f10";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.length < 2) {
      if (stroke.length === 1) {
        ctx.beginPath();
        const px = offsetX + stroke[0].x * scaleX;
        const py = offsetY + stroke[0].y * scaleY;
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#2a1f10";
        ctx.fill();
      }
      continue;
    }

    ctx.beginPath();
    const startX = offsetX + stroke[0].x * scaleX;
    const startY = offsetY + stroke[0].y * scaleY;
    ctx.moveTo(startX, startY);

    for (let i = 1; i < stroke.length - 1; i++) {
      const cx = offsetX + stroke[i].x * scaleX;
      const cy = offsetY + stroke[i].y * scaleY;
      const nx = offsetX + stroke[i + 1].x * scaleX;
      const ny = offsetY + stroke[i + 1].y * scaleY;
      const midX = (cx + nx) / 2;
      const midY = (cy + ny) / 2;
      ctx.quadraticCurveTo(cx, cy, midX, midY);
    }

    const last = stroke[stroke.length - 1];
    ctx.lineTo(offsetX + last.x * scaleX, offsetY + last.y * scaleY);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Match geometry ─────────────────────────────────────────────────

const MATCH_LEN = 90;
const MATCH_ANGLE = Math.PI * 0.62;
const MATCH_COS = Math.cos(MATCH_ANGLE);
const MATCH_SIN = Math.sin(MATCH_ANGLE);

function matchTipFromBase(baseX: number, baseY: number) {
  return {
    x: baseX - MATCH_COS * MATCH_LEN,
    y: baseY - MATCH_SIN * MATCH_LEN,
  };
}

// ─── Component ──────────────────────────────────────────────────────

type Phase = "write" | "burning" | "done";
type InputMode = "draw" | "type";

export default function BurnNotePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  // Honor the OS reduce-motion preference. What the finger does stays exactly
  // the same; only the motion the game generates on its own is damped.
  const reducedMotion = usePrefersReducedMotion();
  const motionScaleRef = useRef(1);
  useEffect(() => {
    motionScaleRef.current = reducedMotion ? 0.3 : 1;
  }, [reducedMotion]);

  const embersRef = useRef<Ember[]>([]);
  const smokeRef = useRef<Smoke[]>([]);
  const crackleTimerRef = useRef(0);
  const frameRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drawing canvas refs
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const isDrawingRef = useRef(false);
  const drawSizeRef = useRef<{ w: number; h: number }>({ w: 380, h: 336 });

  // Match drag state — now tracks the BASE (handle) of the match
  const matchPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingMatchRef = useRef(false);

  // Ignition state
  const ignitionRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("write");
  const [inputMode, setInputMode] = useState<InputMode>("draw");
  const [showHelp, setShowHelp] = useState(false);
  // Mirrors strokesRef.current.length so drawing triggers a re-render;
  // refs alone can't update the placeholder/Clear/Burn button states.
  const [strokeCount, setStrokeCount] = useState(0);
  // Mirrors ignitionRef so the drag hint hides when the paper catches
  const [ignited, setIgnited] = useState(false);

  const hasContent = inputMode === "draw"
    ? strokeCount > 0
    : text.trim().length > 0;

  // Auto-focus textarea in type mode
  useEffect(() => {
    if (phase === "write" && inputMode === "type" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase, inputMode]);

  // ── Setup drawing canvas ───────────────────────────────────────

  useEffect(() => {
    if (phase !== "write" || inputMode !== "draw") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSizeRef.current = { w: rect.width, h: rect.height };

    // Redraw existing strokes
    renderStrokes(ctx, strokesRef.current, 0, 0, 1, 1);
  }, [phase, inputMode]);

  // ── Drawing event handlers ─────────────────────────────────────

  const handleDrawPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "write" || inputMode !== "draw") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    strokesRef.current.push([{ x, y }]);
    setStrokeCount(strokesRef.current.length);

    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#2a1f10";
    ctx.fill();
  }, [phase, inputMode]);

  const handleDrawPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (!currentStroke) return;

    const prev = currentStroke[currentStroke.length - 1];
    currentStroke.push({ x, y });

    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#2a1f10";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const handleDrawPointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearDrawing = useCallback(() => {
    strokesRef.current = [];
    setStrokeCount(0);
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }
  }, []);

  // ── Start burn phase ──────────────────────────────────────────

  const startBurn = useCallback(() => {
    if (inputMode === "draw" && strokesRef.current.length === 0) return;
    if (inputMode === "type" && !text.trim()) return;
    setIgnited(false);
    setPhase("burning");
    haptics.tap();
  }, [text, inputMode]);

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
    crackleTimerRef.current = 0;
    frameRef.current = 0;
    ignitionRef.current = null;

    // Note geometry
    const noteMaxW = Math.min(w - 48, 380);
    const noteLeft = (w - noteMaxW) / 2;
    const noteRight = noteLeft + noteMaxW;
    const noteTop = h * 0.1;
    const noteBottom = Math.min(h * 0.68, noteTop + 480);
    const noteW = noteRight - noteLeft;
    const noteH = noteBottom - noteTop;

    // Max distance from any ignition point to the farthest corner
    function maxBurnDist(ix: number, iy: number) {
      const corners = [
        [noteLeft, noteTop],
        [noteRight, noteTop],
        [noteLeft, noteBottom],
        [noteRight, noteBottom],
      ];
      let max = 0;
      for (const [cx, cy] of corners) {
        const d = Math.sqrt((ix - cx) ** 2 + (iy - cy) ** 2);
        if (d > max) max = d;
      }
      return max;
    }

    // Match resting position — BASE (handle) of the match
    const matchRestX = noteRight - 50;
    const matchRestY = noteBottom + 130;
    matchPosRef.current = { x: matchRestX, y: matchRestY };

    // Pre-render the paper + content
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = w * dpr;
    paperCanvas.height = h * dpr;
    const paperCtx = paperCanvas.getContext("2d")!;
    paperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw paper
    const radius = 4;
    function drawPaperPath(ctx: CanvasRenderingContext2D) {
      ctx.beginPath();
      ctx.moveTo(noteLeft + radius, noteTop);
      ctx.lineTo(noteRight - radius, noteTop);
      ctx.quadraticCurveTo(noteRight, noteTop, noteRight, noteTop + radius);
      ctx.lineTo(noteRight, noteBottom - radius);
      ctx.quadraticCurveTo(noteRight, noteBottom, noteRight - radius, noteBottom);
      ctx.lineTo(noteLeft + radius, noteBottom);
      ctx.quadraticCurveTo(noteLeft, noteBottom, noteLeft, noteBottom - radius);
      ctx.lineTo(noteLeft, noteTop + radius);
      ctx.quadraticCurveTo(noteLeft, noteTop, noteLeft + radius, noteTop);
      ctx.closePath();
    }

    drawPaperPath(paperCtx);
    const paperGrad = paperCtx.createLinearGradient(noteLeft, noteTop, noteRight, noteBottom);
    paperGrad.addColorStop(0, "#f5e6c8");
    paperGrad.addColorStop(0.3, "#f0ddb8");
    paperGrad.addColorStop(0.7, "#e8d1a5");
    paperGrad.addColorStop(1, "#e0c795");
    paperCtx.fillStyle = paperGrad;
    paperCtx.fill();

    // Subtle texture
    for (let i = 0; i < 200; i++) {
      const px = noteLeft + Math.random() * noteW;
      const py = noteTop + Math.random() * noteH;
      paperCtx.fillStyle = `rgba(${120 + Math.random() * 40}, ${100 + Math.random() * 30}, ${60 + Math.random() * 30}, ${0.02 + Math.random() * 0.03})`;
      paperCtx.fillRect(px, py, 1 + Math.random() * 2, 1);
    }

    // Ruled lines
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

    // Draw content onto paper
    const textPadding = 24;
    if (inputMode === "draw") {
      // Render finger-drawn strokes with a uniform scale (letterboxed)
      // so the handwriting isn't stretched
      const drawW = drawSizeRef.current.w;
      const drawH = drawSizeRef.current.h;
      const scale = Math.min(noteW / drawW, noteH / drawH);
      const offsetX = noteLeft + (noteW - drawW * scale) / 2;
      const offsetY = noteTop + (noteH - drawH * scale) / 2;

      // Clip to paper area
      paperCtx.save();
      drawPaperPath(paperCtx);
      paperCtx.clip();
      renderStrokes(paperCtx, strokesRef.current, offsetX, offsetY, scale, scale);
      paperCtx.restore();
    } else {
      // Render typed text with handwriting font
      const fontSize = 20;
      paperCtx.font = `500 ${fontSize}px ${caveat.style.fontFamily}, 'Caveat', cursive`;
      paperCtx.fillStyle = "#2a1f10";
      paperCtx.textBaseline = "bottom";
      const maxTextW = noteW - textPadding * 2;
      const lines = wrapText(paperCtx, text, maxTextW);
      for (let li = 0; li < lines.length; li++) {
        const y = firstLine + li * lineSpacing;
        if (y > noteBottom - 20) break;
        const ox = (Math.random() - 0.5) * 1.5;
        const oy = (Math.random() - 0.5) * 1.5;
        paperCtx.fillText(lines[li], noteLeft + textPadding + ox, y + oy);
      }
    }

    // Paper edge shadow
    paperCtx.save();
    paperCtx.shadowColor = "rgba(0,0,0,0.12)";
    paperCtx.shadowBlur = 12;
    paperCtx.shadowOffsetY = 2;
    drawPaperPath(paperCtx);
    paperCtx.strokeStyle = "rgba(0,0,0,0.06)";
    paperCtx.lineWidth = 1;
    paperCtx.stroke();
    paperCtx.restore();

    // Burn mask — tracks what's burned
    const burnMask = document.createElement("canvas");
    burnMask.width = w;
    burnMask.height = h;
    const burnCtx = burnMask.getContext("2d")!;

    function isOnPaper(x: number, y: number): boolean {
      return x >= noteLeft && x <= noteRight && y >= noteTop && y <= noteBottom;
    }

    function spawnEmbersAt(x: number, y: number, count: number) {
      // Fewer flying embers, and they rise more gently. The burn itself is
      // the interaction, so its spread is untouched.
      const n = Math.max(1, Math.round(count * motionScaleRef.current));
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.8;
        embersRef.current.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed * 0.3 * motionScaleRef.current,
          vy: (-0.4 - Math.random() * 1.2) * motionScaleRef.current,
          radius: 1 + Math.random() * 2,
          opacity: 0.7,
          life: 0,
          maxLife: 30 + Math.random() * 35,
          color: Math.random() > 0.4
            ? { r: 255, g: 180 + Math.floor(Math.random() * 60), b: 40 + Math.floor(Math.random() * 40) }
            : { r: 255, g: 100 + Math.floor(Math.random() * 40), b: 10 + Math.floor(Math.random() * 20) },
        });
      }
    }

    function spawnSmokeAt(x: number, y: number) {
      smokeRef.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y - 3,
        vx: (Math.random() - 0.5) * 0.3 * motionScaleRef.current,
        vy: (-0.3 - Math.random() * 0.5) * motionScaleRef.current,
        radius: 5 + Math.random() * 8,
        opacity: 0.06 + Math.random() * 0.06,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        gray: 180 + Math.floor(Math.random() * 60),
      });
    }

    // ── Match drawing (takes BASE/handle position) ──────────────

    const matchW = 4;

    function drawMatch(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, lit: boolean) {
      const tip = matchTipFromBase(baseX, baseY);
      const tipX = tip.x;
      const tipY = tip.y;

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

      // Match head
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? "#8B2500" : "#5C1A0A";
      ctx.fill();

      if (lit) {
        // Flame
        const flameH = 18 + Math.sin(frameRef.current * 0.4) * 3;
        const flameW = 7;
        const fx = tipX;
        const fy = tipY;

        ctx.globalCompositeOperation = "lighter";

        // Outer flame
        const outerGrad = ctx.createRadialGradient(fx, fy - flameH * 0.35, 1, fx, fy - flameH * 0.3, flameH * 0.7);
        outerGrad.addColorStop(0, "rgba(255, 200, 60, 0.7)");
        outerGrad.addColorStop(0.5, "rgba(255, 130, 20, 0.35)");
        outerGrad.addColorStop(1, "rgba(255, 80, 10, 0)");

        ctx.beginPath();
        ctx.moveTo(fx - flameW * 0.6, fy);
        ctx.quadraticCurveTo(
          fx - flameW * 0.3 + Math.sin(frameRef.current * 0.5) * 2, fy - flameH * 0.5,
          fx + Math.sin(frameRef.current * 0.4) * 1.5, fy - flameH,
        );
        ctx.quadraticCurveTo(
          fx + flameW * 0.3 + Math.sin(frameRef.current * 0.45) * 2, fy - flameH * 0.5,
          fx + flameW * 0.6, fy,
        );
        ctx.closePath();
        ctx.fillStyle = outerGrad;
        ctx.fill();

        // Inner flame
        const innerH = flameH * 0.5;
        const innerW = flameW * 0.3;
        const innerGrad = ctx.createRadialGradient(fx, fy - innerH * 0.3, 0, fx, fy - innerH * 0.3, innerH * 0.4);
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

        // Glow
        const ptGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 15);
        ptGrad.addColorStop(0, "rgba(255, 200, 80, 0.3)");
        ptGrad.addColorStop(1, "rgba(255, 120, 20, 0)");
        ctx.fillStyle = ptGrad;
        ctx.fillRect(fx - 15, fy - 15, 30, 30);
      }

      ctx.restore();
    }

    // ── Main draw loop ─────────────────────────────────────────

    const BURN_DURATION = 12;

    function draw() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, w, h);
      frameRef.current++;

      const ignition = ignitionRef.current;
      const hasIgnited = ignition !== null;
      const elapsed = hasIgnited ? (performance.now() - ignition!.time) / 1000 : 0;

      // ── Calculate burn radius ─────────────────────────────
      let burnRadius = 0;
      let maxDist = 0;
      if (hasIgnited) {
        maxDist = maxBurnDist(ignition!.x, ignition!.y);
        const t = Math.min(elapsed / BURN_DURATION, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        burnRadius = eased * (maxDist + 40);
      }

      // ── Organic burn shape helpers ────────────────────────
      const BURN_SEGS = 72;

      function burnNoiseAt(angle: number): number {
        if (!hasIgnited) return 1;
        return 1
          + Math.sin(angle * 3.71 + ignition!.x * 0.047) * 0.2
          + Math.sin(angle * 7.29 + ignition!.y * 0.071 + elapsed * 1.1) * 0.13
          + Math.sin(angle * 13.13 + (ignition!.x + ignition!.y) * 0.031) * 0.08
          + Math.sin(angle * 21.71 + ignition!.x * 0.113 + elapsed * 0.47) * 0.05
          + Math.cos(angle * 5.09 + elapsed * 2.3) * 0.06;
      }

      function distToEdgeInDir(angle: number): number {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let t = Infinity;
        if (dx > 0.001) t = Math.min(t, (noteRight - ignition!.x) / dx);
        if (dx < -0.001) t = Math.min(t, (noteLeft - ignition!.x) / dx);
        if (dy > 0.001) t = Math.min(t, (noteBottom - ignition!.y) / dy);
        if (dy < -0.001) t = Math.min(t, (noteTop - ignition!.y) / dy);
        return Math.max(0, t);
      }

      function burnRadiusAt(angle: number): number {
        const noise = burnNoiseAt(angle);
        const edgeDist = distToEdgeInDir(angle);
        const edgeBoost = maxDist > 0 && edgeDist < maxDist * 0.5
          ? 1 + (1 - edgeDist / (maxDist * 0.5)) * 0.3
          : 1;
        return burnRadius * noise * edgeBoost;
      }

      // ── Update burn mask ──────────────────────────────────
      if (hasIgnited && burnRadius > 0) {
        burnCtx.beginPath();
        for (let i = 0; i <= BURN_SEGS; i++) {
          const angle = ((i % BURN_SEGS) / BURN_SEGS) * Math.PI * 2;
          const r = burnRadiusAt(angle);
          const px = ignition!.x + Math.cos(angle) * r;
          const py = ignition!.y + Math.sin(angle) * r;
          if (i === 0) burnCtx.moveTo(px, py);
          else burnCtx.lineTo(px, py);
        }
        burnCtx.closePath();
        burnCtx.fillStyle = "white";
        burnCtx.fill();
      }

      // ── Draw unburned paper ───────────────────────────────
      ctx2d.save();
      ctx2d.drawImage(paperCanvas, 0, 0, w, h);
      ctx2d.globalCompositeOperation = "destination-out";
      ctx2d.drawImage(burnMask, 0, 0);
      ctx2d.restore();

      // ── Char edge around burn front ───────────────────────
      if (hasIgnited && burnRadius > 3) {
        const charWidth = 14;
        ctx2d.save();
        ctx2d.beginPath();
        for (let i = 0; i <= BURN_SEGS; i++) {
          const angle = ((i % BURN_SEGS) / BURN_SEGS) * Math.PI * 2;
          const r = burnRadiusAt(angle) + charWidth;
          const px = ignition!.x + Math.cos(angle) * r;
          const py = ignition!.y + Math.sin(angle) * r;
          if (i === 0) ctx2d.moveTo(px, py);
          else ctx2d.lineTo(px, py);
        }
        ctx2d.closePath();
        for (let i = BURN_SEGS; i >= 0; i--) {
          const angle = ((i % BURN_SEGS) / BURN_SEGS) * Math.PI * 2;
          const r = Math.max(0, burnRadiusAt(angle) - 4);
          const px = ignition!.x + Math.cos(angle) * r;
          const py = ignition!.y + Math.sin(angle) * r;
          if (i === BURN_SEGS) ctx2d.moveTo(px, py);
          else ctx2d.lineTo(px, py);
        }
        ctx2d.closePath();
        ctx2d.clip("evenodd");

        const maxR = burnRadius * 1.6 + charWidth;
        const charGrad = ctx2d.createRadialGradient(
          ignition!.x, ignition!.y, Math.max(0, burnRadius * 0.5),
          ignition!.x, ignition!.y, maxR,
        );
        charGrad.addColorStop(0, "rgba(8, 3, 0, 0.85)");
        charGrad.addColorStop(0.25, "rgba(30, 12, 2, 0.6)");
        charGrad.addColorStop(0.5, "rgba(55, 25, 5, 0.3)");
        charGrad.addColorStop(0.8, "rgba(75, 40, 10, 0.1)");
        charGrad.addColorStop(1, "rgba(80, 40, 10, 0)");
        ctx2d.fillStyle = charGrad;
        ctx2d.fillRect(ignition!.x - maxR, ignition!.y - maxR, maxR * 2, maxR * 2);
        ctx2d.restore();
      }

      // ── Glowing burn front ────────────────────────────────
      if (hasIgnited && burnRadius > 2 && elapsed < BURN_DURATION + 1) {
        ctx2d.save();
        ctx2d.globalCompositeOperation = "lighter";

        for (let i = 0; i < BURN_SEGS; i++) {
          const angle = (i / BURN_SEGS) * Math.PI * 2;
          const r = burnRadiusAt(angle);
          const px = ignition!.x + Math.cos(angle) * r;
          const py = ignition!.y + Math.sin(angle) * r;

          if (!isOnPaper(px, py)) continue;

          const flicker = 0.4 + Math.sin(frameRef.current * 0.2 + i * 1.7) * 0.2;
          const glowR = 14 + Math.sin(frameRef.current * 0.15 + i) * 4;

          const grad = ctx2d.createRadialGradient(px, py, 0, px, py, glowR);
          grad.addColorStop(0, `rgba(255, 200, 60, ${0.35 * flicker})`);
          grad.addColorStop(0.3, `rgba(255, 130, 25, ${0.2 * flicker})`);
          grad.addColorStop(0.7, `rgba(255, 60, 10, ${0.08 * flicker})`);
          grad.addColorStop(1, "rgba(200, 30, 0, 0)");
          ctx2d.fillStyle = grad;
          ctx2d.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
        }

        ctx2d.restore();
      }

      // ── Spawn embers and smoke at burn front ──────────────
      if (hasIgnited && elapsed < BURN_DURATION + 1) {
        if (frameRef.current % 3 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const r = burnRadiusAt(angle);
          const ex = ignition!.x + Math.cos(angle) * r;
          const ey = ignition!.y + Math.sin(angle) * r;
          if (isOnPaper(ex, ey)) {
            spawnEmbersAt(ex, ey, 1 + Math.floor(Math.random() * 2));
          }
        }
        if (frameRef.current % 5 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const r = burnRadiusAt(angle) * (0.8 + Math.random() * 0.15);
          const sx = ignition!.x + Math.cos(angle) * r;
          const sy = ignition!.y + Math.sin(angle) * r;
          if (isOnPaper(sx, sy)) {
            spawnSmokeAt(sx, sy);
          }
        }

        // Crackle
        crackleTimerRef.current++;
        if (crackleTimerRef.current % 18 === 0) {
          playCrackle();
        }
      }

      // ── Draw smoke ────────────────────────────────────────
      const smokes = smokeRef.current;
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy *= 0.995;
        s.vx += (Math.random() - 0.5) * 0.05;
        s.radius += 0.18;

        const lifeRatio = 1 - s.life / s.maxLife;
        if (lifeRatio <= 0) { smokes.splice(i, 1); continue; }

        const alpha = s.opacity * lifeRatio * lifeRatio;
        const grad = ctx2d.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
        grad.addColorStop(0, `rgba(${s.gray}, ${s.gray}, ${s.gray}, ${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${s.gray}, ${s.gray}, ${s.gray}, 0)`);
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }

      // ── Draw embers ───────────────────────────────────────
      const embers = embersRef.current;
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vy -= 0.02;
        e.vx += (Math.random() - 0.5) * 0.08;
        e.vx *= 0.98;

        const lifeRatio = 1 - e.life / e.maxLife;
        if (lifeRatio <= 0) { embers.splice(i, 1); continue; }

        const alpha = e.opacity * lifeRatio;
        const r = e.radius * (0.5 + lifeRatio * 0.5);

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

      // ── Draw match (before ignition) ───────────────────────
      const mPos = matchPosRef.current;
      if (mPos && !hasIgnited) {
        drawMatch(ctx2d, mPos.x, mPos.y, true);
      }

      // ── Check if done ─────────────────────────────────────
      if (hasIgnited && elapsed > BURN_DURATION + 2 && embers.length < 3 && smokes.length < 3) {
        setPhase("done");
        return;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, text, inputMode]);

  // ── Pointer handlers for match (burning phase) ─────────────────

  const getNoteGeometry = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const noteMaxW = Math.min(w - 48, 380);
    const noteLeft = (w - noteMaxW) / 2;
    const noteRight = noteLeft + noteMaxW;
    const noteTop = h * 0.1;
    const noteBottom = Math.min(h * 0.68, noteTop + 480);
    return { noteLeft, noteRight, noteTop, noteBottom };
  }, []);

  const tryIgnite = useCallback((baseX: number, baseY: number): boolean => {
    const tip = matchTipFromBase(baseX, baseY);
    const { noteLeft, noteRight, noteTop, noteBottom } = getNoteGeometry();

    if (tip.x >= noteLeft && tip.x <= noteRight && tip.y >= noteTop && tip.y <= noteBottom) {
      // Snap ignition to nearest edge for realistic edge-lighting
      const distToLeft = tip.x - noteLeft;
      const distToRight = noteRight - tip.x;
      const distToTop = tip.y - noteTop;
      const distToBottom = noteBottom - tip.y;
      const minEdgeDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      let ix = tip.x;
      let iy = tip.y;
      if (minEdgeDist < 40) {
        if (minEdgeDist === distToLeft) ix = noteLeft;
        else if (minEdgeDist === distToRight) ix = noteRight;
        else if (minEdgeDist === distToTop) iy = noteTop;
        else iy = noteBottom;
      }

      ignitionRef.current = { x: ix, y: iy, time: performance.now() };
      isDraggingMatchRef.current = false;
      matchPosRef.current = null;
      setIgnited(true);
      haptics.tap();
      playCrackle();
      return true;
    }
    return false;
  }, [getNoteGeometry]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "burning") return;
    if (ignitionRef.current) return;

    const pos = { x: e.clientX, y: e.clientY };
    const mPos = matchPosRef.current;

    // Check if pointer is near the match BASE (handle) — within 60px
    if (mPos) {
      const dx = pos.x - mPos.x;
      const dy = pos.y - mPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        isDraggingMatchRef.current = true;
        matchPosRef.current = pos;
        return;
      }
    }

    // If tapping elsewhere, move match base there
    isDraggingMatchRef.current = true;
    matchPosRef.current = pos;
  }, [phase]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingMatchRef.current) return;
    if (ignitionRef.current) return;

    const pos = { x: e.clientX, y: e.clientY };
    matchPosRef.current = pos;

    // Check if match TIP is on the paper — ignite!
    tryIgnite(pos.x, pos.y);
  }, [tryIgnite]);

  const handlePointerUp = useCallback(() => {
    if (ignitionRef.current) return;

    const mPos = matchPosRef.current;
    if (mPos && isDraggingMatchRef.current) {
      tryIgnite(mPos.x, mPos.y);
    }

    isDraggingMatchRef.current = false;
  }, [tryIgnite]);

  // ── Reset ─────────────────────────────────────────────────────

  function reset() {
    setText("");
    strokesRef.current = [];
    setStrokeCount(0);
    setPhase("write");
    setIgnited(false);
    embersRef.current = [];
    smokeRef.current = [];
    ignitionRef.current = null;
    matchPosRef.current = null;
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
          role="img"
          aria-label="Burning the paper: drag the match to the edge of the page to light it"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Write phase */}
      {phase === "write" && (
        <div className="flex w-full flex-1 flex-col items-center justify-start px-6 pt-20 pb-32">
          <p className="mb-6 text-sm text-cream-dim/40">
            Whatever you need to let go of.
          </p>

          <div className="relative w-full max-w-[380px]">
            {/* Input mode toggle */}
            <div className="mb-3 flex items-center justify-center gap-1">
              <button
                onClick={() => setInputMode("draw")}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  inputMode === "draw"
                    ? "bg-candle/15 text-candle/80"
                    : "text-cream-dim/30 hover:text-cream-dim/50"
                }`}
              >
                Draw
              </button>
              <button
                onClick={() => setInputMode("type")}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  inputMode === "type"
                    ? "bg-candle/15 text-candle/80"
                    : "text-cream-dim/30 hover:text-cream-dim/50"
                }`}
              >
                Type
              </button>
            </div>

            <div
              className="rounded-sm"
              style={{
                background: "linear-gradient(135deg, #f5e6c8 0%, #f0ddb8 30%, #e8d1a5 70%, #e0c795 100%)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none rounded-sm"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(150,130,100,0.1) 27px, rgba(150,130,100,0.1) 28px)",
                  backgroundPosition: "0 12px",
                }}
              />

              {inputMode === "draw" ? (
                /* Drawing canvas */
                <div className="relative" style={{ height: 336 }}>
                  <canvas
                    ref={drawCanvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    role="img"
                    aria-label="Writing space: drag to write what you want to burn"
                    onPointerDown={handleDrawPointerDown}
                    onPointerMove={handleDrawPointerMove}
                    onPointerUp={handleDrawPointerUp}
                    onPointerCancel={handleDrawPointerUp}
                    onPointerLeave={handleDrawPointerUp}
                  />
                  {strokeCount === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-[#2a1f10]/20 text-lg" style={{ fontFamily: "'Georgia', serif" }}>
                        Write with your finger...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Typed textarea with handwriting font */
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write here..."
                  rows={12}
                  autoFocus
                  className={`relative w-full rounded-sm bg-transparent px-6 py-4 text-xl leading-[28px] text-[#2a1f10] placeholder:text-[#2a1f10]/25 focus:outline-none resize-none ${caveat.className}`}
                  style={{
                    caretColor: "#2a1f10",
                    fontWeight: 500,
                  }}
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex items-center gap-3">
              {inputMode === "draw" && strokeCount > 0 && (
                <button
                  onClick={clearDrawing}
                  className="flex items-center justify-center rounded-lg bg-cream-dim/5 px-4 py-3 text-sm text-cream-dim/40 transition-colors hover:bg-cream-dim/10 hover:text-cream-dim/60"
                >
                  Clear
                </button>
              )}
              <button
                onClick={startBurn}
                disabled={!hasContent}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-candle/10 px-6 py-3 text-sm text-candle/70 transition-colors hover:bg-candle/20 hover:text-candle disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0">
                  <path d="M9 2C9 2 6 5 6 8.5C6 10.5 7.5 12 9 12C10.5 12 12 10.5 12 8.5C12 5 9 2 9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Burn it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Burning phase hint */}
      {phase === "burning" && !ignited && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 text-center">
          <p className="text-sm text-cream/30">
            Grab the match and drag it to the paper
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
            <div className="rounded-2xl border border-teal/12 bg-deep/50 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Writing something down and destroying it can genuinely reduce
              how much it bothers you. Research backs this up. The physical
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
