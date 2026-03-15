"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";

// ─── Colors ─────────────────────────────────────────────────────────

const SAND_BASE = { r: 222, g: 205, b: 170 };
const SAND_WARM = { r: 215, g: 195, b: 155 };
const GROOVE_SHADOW = { r: 175, g: 158, b: 120 };
const GROOVE_HIGHLIGHT = { r: 235, g: 222, b: 192 };
const ROCK_COLORS = [
  { r: 115, g: 108, b: 98 },
  { r: 95, g: 88, b: 78 },
  { r: 135, g: 125, b: 110 },
  { r: 80, g: 75, b: 68 },
  { r: 105, g: 100, b: 90 },
];

// ─── Types ──────────────────────────────────────────────────────────

interface Rock {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  color: { r: number; g: number; b: number };
  variant: number; // for texture variation
}

interface RakePoint {
  x: number;
  y: number;
}

interface RakeLine {
  points: RakePoint[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function generateRocks(w: number, h: number): Rock[] {
  const rocks: Rock[] = [];
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 rocks
  const margin = 80;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = margin + Math.random() * (w - margin * 2);
      y = margin + Math.random() * (h - margin * 2);
      attempts++;
    } while (
      attempts < 50 &&
      rocks.some((r) => {
        const dx = r.x - x;
        const dy = r.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 100;
      })
    );

    rocks.push({
      x,
      y,
      rx: 18 + Math.random() * 22,
      ry: 14 + Math.random() * 16,
      rotation: Math.random() * Math.PI,
      color: ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)],
      variant: Math.random(),
    });
  }

  return rocks;
}

function distToRock(px: number, py: number, rock: Rock): number {
  const dx = px - rock.x;
  const dy = py - rock.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Seeded random for consistent sand grain patterns
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playSandSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Soft sand scratch: filtered noise
    const bufLen = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 600;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  } catch {}
}

// ─── Component ──────────────────────────────────────────────────────

export default function SandGardenPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rocksRef = useRef<Rock[]>([]);
  const rakeLinesRef = useRef<RakeLine[]>([]);
  const currentLineRef = useRef<RakeLine | null>(null);
  const isDraggingRef = useRef(false);
  const noiseDataRef = useRef<ImageData | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [rakeSize, setRakeSize] = useState<"small" | "medium" | "large">("medium");

  // First-time hint
  useEffect(() => {
    try {
      if (!localStorage.getItem("regulate-sand-hint-seen")) {
        setShowHint(true);
      }
    } catch {}
  }, []);
  const rakeSizeRef = useRef<"small" | "medium" | "large">("medium");
  const lastDoubleTapRef = useRef<number>(0);
  const smoothSpotsRef = useRef<{ x: number; y: number; radius: number }[]>(
    [],
  );
  const rakePositionRef = useRef<{ x: number; y: number; angle: number } | null>(null);

  // ── Generate sand grain noise texture ─────────────────────────
  const generateNoise = useCallback((w: number, h: number) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return null;

    const imageData = offCtx.createImageData(w, h);
    const data = imageData.data;
    const rand = seededRandom(42);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        // Multi-layered noise for realistic sand grain
        const fine = (rand() - 0.5) * 14;
        const medium = Math.sin(x * 0.3 + rand() * 2) * 3;
        const coarse = Math.sin(y * 0.05 + x * 0.02) * 5;
        const noise = fine + medium + coarse;

        // Warm gradient: slightly darker at edges
        const edgeDist = Math.min(x, w - x, y, h - y) / Math.min(w, h);
        const edgeDarken = Math.max(0, 1 - edgeDist * 4) * 8;

        data[i] = Math.min(255, Math.max(0, SAND_BASE.r + noise - edgeDarken));
        data[i + 1] = Math.min(255, Math.max(0, SAND_BASE.g + noise - edgeDarken));
        data[i + 2] = Math.min(255, Math.max(0, SAND_BASE.b + noise - edgeDarken));
        data[i + 3] = 255;
      }
    }

    return imageData;
  }, []);

  // ── Draw a wooden border frame ──────────────────────────────
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const frameWidth = 12;
    const frameColor = "rgb(90, 72, 50)";
    const frameHighlight = "rgb(120, 98, 70)";
    const frameShadow = "rgb(60, 48, 32)";

    // Outer frame
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;
    ctx.strokeRect(frameWidth / 2, frameWidth / 2, w - frameWidth, h - frameWidth);

    // Inner highlight (top-left light)
    ctx.strokeStyle = frameHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(frameWidth, frameWidth);
    ctx.lineTo(w - frameWidth, frameWidth);
    ctx.moveTo(frameWidth, frameWidth);
    ctx.lineTo(frameWidth, h - frameWidth);
    ctx.stroke();

    // Inner shadow (bottom-right dark)
    ctx.strokeStyle = frameShadow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w - frameWidth, frameWidth);
    ctx.lineTo(w - frameWidth, h - frameWidth);
    ctx.moveTo(frameWidth, h - frameWidth);
    ctx.lineTo(w - frameWidth, h - frameWidth);
    ctx.stroke();
  }, []);

  // ── Draw rake cursor ────────────────────────────────────────
  const drawRakeCursor = useCallback((ctx: CanvasRenderingContext2D) => {
    const pos = rakePositionRef.current;
    if (!pos || !isDraggingRef.current) return;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.angle + Math.PI / 2);

    // Rake head size based on selected rake
    const size = rakeSizeRef.current;
    const headWidth = size === "small" ? 14 : size === "large" ? 40 : 22;
    const tineLength = size === "small" ? 8 : size === "large" ? 14 : 10;

    // Wooden handle
    ctx.strokeStyle = "rgba(140, 110, 70, 0.6)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -tineLength - 2);
    ctx.lineTo(0, -tineLength - 28);
    ctx.stroke();

    // Handle highlight
    ctx.strokeStyle = "rgba(180, 150, 100, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-0.5, -tineLength - 2);
    ctx.lineTo(-0.5, -tineLength - 28);
    ctx.stroke();

    // Crossbar
    ctx.strokeStyle = "rgba(130, 100, 65, 0.6)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-headWidth / 2, -tineLength);
    ctx.lineTo(headWidth / 2, -tineLength);
    ctx.stroke();

    // Tines
    const tines = size === "small"
      ? [-4, -1, 2, 5]
      : size === "large"
        ? [-16, -8, -2, 4, 10, 16]
        : [-8, -3, 2, 8];
    ctx.strokeStyle = "rgba(120, 90, 55, 0.6)";
    ctx.lineWidth = 1.5;
    for (const tx of tines) {
      ctx.beginPath();
      ctx.moveTo(tx, -tineLength);
      ctx.lineTo(tx, 0);
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  // ── Draw everything ───────────────────────────────────────────
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Draw sand background with noise
    if (noiseDataRef.current) {
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        offCtx.fillStyle = `rgb(${SAND_BASE.r}, ${SAND_BASE.g}, ${SAND_BASE.b})`;
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        offCtx.putImageData(noiseDataRef.current, 0, 0);
        ctx.drawImage(offscreen, 0, 0, w, h);
      }
    } else {
      ctx.fillStyle = `rgb(${SAND_BASE.r}, ${SAND_BASE.g}, ${SAND_BASE.b})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw smooth spots (where double-tapped)
    for (const spot of smoothSpotsRef.current) {
      const grad = ctx.createRadialGradient(
        spot.x, spot.y, 0,
        spot.x, spot.y, spot.radius,
      );
      grad.addColorStop(0, `rgba(${SAND_BASE.r}, ${SAND_BASE.g}, ${SAND_BASE.b}, 0.95)`);
      grad.addColorStop(1, `rgba(${SAND_BASE.r}, ${SAND_BASE.g}, ${SAND_BASE.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw rake lines (grooves in sand)
    const allLines = [...rakeLinesRef.current];
    if (currentLineRef.current) {
      allLines.push(currentLineRef.current);
    }

    for (const line of allLines) {
      if (line.points.length < 2) continue;

      // Tine offsets based on rake size
      const size = rakeSizeRef.current;
      const offsets = size === "small"
        ? [-4, -1, 2, 5]
        : size === "large"
          ? [-16, -8, -2, 4, 10, 16]
          : [-8, -3, 2, 8];

      for (const offset of offsets) {
        // 1) Groove bottom (dark shadow — the carved depth)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${GROOVE_SHADOW.r}, ${GROOVE_SHADOW.g}, ${GROOVE_SHADOW.b}, 0.65)`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        let started = false;
        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];
          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 14) {
              nearRock = true;
              break;
            }
          }
          if (nearRock) { started = false; continue; }

          let nx = 0, ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          }

          const ox = p.x + nx * offset;
          const oy = p.y + ny * offset;
          if (!started) { ctx.moveTo(ox, oy); started = true; }
          else { ctx.lineTo(ox, oy); }
        }
        ctx.stroke();

        // 2) Lower shadow edge (deeper shadow on one side)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${GROOVE_SHADOW.r - 25}, ${GROOVE_SHADOW.g - 25}, ${GROOVE_SHADOW.b - 25}, 0.35)`;
        ctx.lineWidth = 1.5;
        started = false;
        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];
          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 14) {
              nearRock = true;
              break;
            }
          }
          if (nearRock) { started = false; continue; }

          let nx = 0, ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          }

          const ox = p.x + nx * offset + 1.5;
          const oy = p.y + ny * offset + 2;
          if (!started) { ctx.moveTo(ox, oy); started = true; }
          else { ctx.lineTo(ox, oy); }
        }
        ctx.stroke();

        // 3) Highlight edge (light catching the ridge between grooves)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${GROOVE_HIGHLIGHT.r}, ${GROOVE_HIGHLIGHT.g}, ${GROOVE_HIGHLIGHT.b}, 0.5)`;
        ctx.lineWidth = 1;
        started = false;
        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];
          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 14) {
              nearRock = true;
              break;
            }
          }
          if (nearRock) { started = false; continue; }

          let nx = 0, ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          }

          const ox = p.x + nx * offset - 1;
          const oy = p.y + ny * offset - 1;
          if (!started) { ctx.moveTo(ox, oy); started = true; }
          else { ctx.lineTo(ox, oy); }
        }
        ctx.stroke();
      }

      // Sand displacement ridges between grooves
      const ridgeOffsets = size === "small"
        ? [-2.5, 0.5, 3.5]
        : size === "large"
          ? [-12, -5, 1, 7, 13]
          : [-5.5, -0.5, 4.5];
      for (const rOff of ridgeOffsets) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${SAND_WARM.r + 10}, ${SAND_WARM.g + 8}, ${SAND_WARM.b + 5}, 0.4)`;
        ctx.lineWidth = 2.5;
        let started = false;
        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];
          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 14) {
              nearRock = true;
              break;
            }
          }
          if (nearRock) { started = false; continue; }

          let nx = 0, ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { nx = -dy / len; ny = dx / len; }
          }

          const ox = p.x + nx * rOff;
          const oy = p.y + ny * rOff;
          if (!started) { ctx.moveTo(ox, oy); started = true; }
          else { ctx.lineTo(ox, oy); }
        }
        ctx.stroke();
      }
    }

    // Draw rocks with more realistic rendering
    for (const rock of rocksRef.current) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rotation);

      // Concentric sand rings around rocks (zen garden style)
      for (let ring = 3; ring >= 1; ring--) {
        const ringRadius = ring * 8 + Math.max(rock.rx, rock.ry);
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GROOVE_SHADOW.r}, ${GROOVE_SHADOW.g}, ${GROOVE_SHADOW.b}, ${0.12 + (3 - ring) * 0.04})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight on the ring
        ctx.beginPath();
        ctx.ellipse(-1, -1, ringRadius, ringRadius * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GROOVE_HIGHLIGHT.r}, ${GROOVE_HIGHLIGHT.g}, ${GROOVE_HIGHLIGHT.b}, ${0.08 + (3 - ring) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Shadow beneath rock
      ctx.beginPath();
      ctx.ellipse(3, 4, rock.rx + 3, rock.ry + 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fill();

      // Rock body with gradient
      ctx.beginPath();
      ctx.ellipse(0, 0, rock.rx, rock.ry, 0, 0, Math.PI * 2);
      const rockGrad = ctx.createRadialGradient(
        -rock.rx * 0.3, -rock.ry * 0.3, 0,
        0, 0, Math.max(rock.rx, rock.ry),
      );
      rockGrad.addColorStop(0, `rgb(${rock.color.r + 35}, ${rock.color.g + 35}, ${rock.color.b + 35})`);
      rockGrad.addColorStop(0.7, `rgb(${rock.color.r}, ${rock.color.g}, ${rock.color.b})`);
      rockGrad.addColorStop(1, `rgb(${rock.color.r - 15}, ${rock.color.g - 15}, ${rock.color.b - 15})`);
      ctx.fillStyle = rockGrad;
      ctx.fill();

      // Rock surface texture (speckles)
      const speckleRand = seededRandom(Math.floor(rock.variant * 10000));
      for (let s = 0; s < 12; s++) {
        const sx = (speckleRand() - 0.5) * rock.rx * 1.4;
        const sy = (speckleRand() - 0.5) * rock.ry * 1.4;
        // Only draw if inside the ellipse
        if ((sx * sx) / (rock.rx * rock.rx) + (sy * sy) / (rock.ry * rock.ry) < 0.8) {
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8 + speckleRand() * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${speckleRand() > 0.5 ? 255 : 0}, ${speckleRand() > 0.5 ? 255 : 0}, ${speckleRand() > 0.5 ? 255 : 0}, 0.06)`;
          ctx.fill();
        }
      }

      // Subtle top highlight
      ctx.beginPath();
      ctx.ellipse(
        -rock.rx * 0.2, -rock.ry * 0.25,
        rock.rx * 0.45, rock.ry * 0.35,
        -0.3, 0, Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fill();

      ctx.restore();
    }

    // Draw wooden border frame
    drawFrame(ctx, w, h);

    // Draw rake cursor
    drawRakeCursor(ctx);
  }, [drawFrame, drawRakeCursor]);

  // ── Initialize ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    const w = window.innerWidth;
    const h = window.innerHeight;

    noiseDataRef.current = generateNoise(
      Math.floor(w / 2),
      Math.floor(h / 2),
    );
    rocksRef.current = generateRocks(w, h);
    drawScene();

    function handleResize() {
      resize();
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      noiseDataRef.current = generateNoise(
        Math.floor(newW / 2),
        Math.floor(newH / 2),
      );
      rocksRef.current = generateRocks(newW, newH);
      rakeLinesRef.current = [];
      smoothSpotsRef.current = [];
      drawScene();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [generateNoise, drawScene]);

  // ── Pointer handlers ──────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const now = Date.now();
      if (now - lastDoubleTapRef.current < 350) {
        smoothSpotsRef.current.push({
          x: e.clientX,
          y: e.clientY,
          radius: 45,
        });
        for (const line of rakeLinesRef.current) {
          line.points = line.points.filter((p) => {
            const dx = p.x - e.clientX;
            const dy = p.y - e.clientY;
            return Math.sqrt(dx * dx + dy * dy) > 45;
          });
        }
        rakeLinesRef.current = rakeLinesRef.current.filter(
          (l) => l.points.length >= 2,
        );
        haptics.light();
        drawScene();
        lastDoubleTapRef.current = 0;
        return;
      }
      lastDoubleTapRef.current = now;

      isDraggingRef.current = true;
      rakePositionRef.current = { x: e.clientX, y: e.clientY, angle: 0 };
      currentLineRef.current = {
        points: [{ x: e.clientX, y: e.clientY }],
      };
      haptics.light();
    },
    [drawScene],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !currentLineRef.current) return;

      const points = currentLineRef.current.points;
      const last = points[points.length - 1];
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        const angle = Math.atan2(dy, dx);
        rakePositionRef.current = { x: e.clientX, y: e.clientY, angle };
        points.push({ x: e.clientX, y: e.clientY });
        // Play sand scratch sound occasionally
        if (points.length % 8 === 0) playSandSound();
        drawScene();
      }
    },
    [drawScene],
  );

  const onPointerUp = useCallback(() => {
    if (currentLineRef.current && currentLineRef.current.points.length >= 2) {
      rakeLinesRef.current.push(currentLineRef.current);
    }
    currentLineRef.current = null;
    isDraggingRef.current = false;
    rakePositionRef.current = null;
    drawScene();
  }, [drawScene]);

  // ── Clear garden ──────────────────────────────────────────────
  const clearGarden = useCallback(() => {
    rakeLinesRef.current = [];
    smoothSpotsRef.current = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    rocksRef.current = generateRocks(w, h);
    haptics.tap();
    drawScene();
  }, [drawScene]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      style={{ backgroundColor: `rgb(${SAND_BASE.r}, ${SAND_BASE.g}, ${SAND_BASE.b})` }}
      role="application"
      aria-label="Sand garden - drag to rake patterns in the sand"
    >
      <p className="sr-only">
        A zen sand garden. Drag your finger to rake parallel lines in the sand.
        Double-tap to smooth an area. Rocks are scattered on the surface for you
        to rake around. Use the clear button to start fresh.
      </p>
      {/* First-time hint */}
      {showHint && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          onClick={() => {
            setShowHint(false);
            try { localStorage.setItem("regulate-sand-hint-seen", "1"); } catch {}
          }}
        >
          <div className="max-w-[260px] rounded-2xl px-6 py-5 text-center backdrop-blur-md"
            style={{ backgroundColor: "rgba(185, 170, 140, 0.95)", border: "1px solid rgba(160, 145, 115, 0.4)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "rgb(65, 55, 38)" }}>
              Drag to rake lines in the sand. Double-tap to smooth an area. Choose your rake size above.
            </p>
            <p className="mt-3 text-[11px]" style={{ color: "rgba(65, 55, 38, 0.5)" }}>Tap anywhere to start</p>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: isDraggingRef.current ? "none" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Back button */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-colors"
          style={{
            backgroundColor: "rgba(200, 185, 155, 0.8)",
            color: "rgb(75, 65, 48)",
            border: "1px solid rgba(160, 145, 115, 0.4)",
          }}
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

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Rake size selector */}
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => { setRakeSize(size); rakeSizeRef.current = size; }}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded-full px-2.5 py-1 text-xs backdrop-blur-sm transition-all"
              style={{
                backgroundColor: rakeSize === size ? "rgba(140, 110, 70, 0.85)" : "rgba(200, 185, 155, 0.7)",
                color: rakeSize === size ? "rgb(245, 235, 215)" : "rgb(90, 78, 55)",
                border: `1px solid ${rakeSize === size ? "rgba(160, 130, 80, 0.6)" : "rgba(160, 145, 115, 0.3)"}`,
              }}
            >
              {size === "small" ? "Fine" : size === "medium" ? "Medium" : "Wide"}
            </button>
          ))}

          {/* Save button */}
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], "sand-garden.png", { type: "image/png" });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  try { await navigator.share({ files: [file], title: "My Sand Garden" }); } catch {}
                } else {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "sand-garden.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }, "image/png");
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "rgba(200, 185, 155, 0.8)",
              color: "rgb(75, 65, 48)",
              border: "1px solid rgba(160, 145, 115, 0.4)",
            }}
          >
            Save
          </button>

          {/* Clear button */}
          <button
            onClick={clearGarden}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "rgba(200, 185, 155, 0.8)",
              color: "rgb(75, 65, 48)",
              border: "1px solid rgba(160, 145, 115, 0.4)",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* How this helps */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
        <div className="pointer-events-auto w-full max-w-md">
          <button
            onClick={() => setShowHelp(!showHelp)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm transition-colors"
            style={{
              backgroundColor: "rgba(185, 170, 140, 0.8)",
              color: "rgb(70, 60, 42)",
              border: "1px solid rgba(160, 145, 115, 0.3)",
            }}
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
            <div
              className="rounded-2xl border p-4 text-sm leading-relaxed backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(205, 190, 162, 0.9)",
                borderColor: "rgba(160, 145, 120, 0.3)",
                color: "rgb(65, 55, 38)",
              }}
            >
              Raking patterns in sand has been a meditation practice for
              centuries. The repetitive, deliberate movements and visible
              patterns help quiet a busy mind.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
