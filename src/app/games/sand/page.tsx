"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";

// ─── Colors ─────────────────────────────────────────────────────────

const SAND_COLOR = { r: 212, g: 197, b: 169 }; // #d4c5a9
const RAKE_COLOR = { r: 184, g: 168, b: 138 }; // #b8a88a
const ROCK_COLORS = [
  { r: 130, g: 120, b: 105 },
  { r: 110, g: 100, b: 88 },
  { r: 145, g: 135, b: 118 },
  { r: 95, g: 88, b: 78 },
];

// ─── Types ──────────────────────────────────────────────────────────

interface Rock {
  x: number;
  y: number;
  rx: number; // horizontal radius
  ry: number; // vertical radius
  rotation: number;
  color: { r: number; g: number; b: number };
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
  const count = 5 + Math.floor(Math.random() * 2); // 5-6 rocks
  const margin = 60;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    // Avoid placing rocks too close together
    do {
      x = margin + Math.random() * (w - margin * 2);
      y = margin + Math.random() * (h - margin * 2);
      attempts++;
    } while (
      attempts < 50 &&
      rocks.some((r) => {
        const dx = r.x - x;
        const dy = r.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 80;
      })
    );

    rocks.push({
      x,
      y,
      rx: 14 + Math.random() * 18,
      ry: 10 + Math.random() * 12,
      rotation: Math.random() * Math.PI,
      color: ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)],
    });
  }

  return rocks;
}

function distToRock(px: number, py: number, rock: Rock): number {
  // Approximate distance to ellipse center
  const dx = px - rock.x;
  const dy = py - rock.y;
  return Math.sqrt(dx * dx + dy * dy);
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
  const lastDoubleTapRef = useRef<number>(0);
  const smoothSpotsRef = useRef<{ x: number; y: number; radius: number }[]>(
    [],
  );

  // ── Generate sand grain noise texture ─────────────────────────
  const generateNoise = useCallback((w: number, h: number) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return null;

    const imageData = offCtx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = SAND_COLOR.r + noise;
      data[i + 1] = SAND_COLOR.g + noise;
      data[i + 2] = SAND_COLOR.b + noise;
      data[i + 3] = 255;
    }

    return imageData;
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
      // Put noise data at native resolution
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        // Fill with base sand color first
        offCtx.fillStyle = `rgb(${SAND_COLOR.r}, ${SAND_COLOR.g}, ${SAND_COLOR.b})`;
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        // Draw noise at 1:1 scale and let it tile/cover
        offCtx.putImageData(noiseDataRef.current, 0, 0);
        ctx.drawImage(offscreen, 0, 0, w, h);
      }
    } else {
      ctx.fillStyle = `rgb(${SAND_COLOR.r}, ${SAND_COLOR.g}, ${SAND_COLOR.b})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw smooth spots (where double-tapped)
    for (const spot of smoothSpotsRef.current) {
      const grad = ctx.createRadialGradient(
        spot.x,
        spot.y,
        0,
        spot.x,
        spot.y,
        spot.radius,
      );
      grad.addColorStop(
        0,
        `rgba(${SAND_COLOR.r}, ${SAND_COLOR.g}, ${SAND_COLOR.b}, 0.95)`,
      );
      grad.addColorStop(
        1,
        `rgba(${SAND_COLOR.r}, ${SAND_COLOR.g}, ${SAND_COLOR.b}, 0)`,
      );
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw rake lines
    const allLines = [...rakeLinesRef.current];
    if (currentLineRef.current) {
      allLines.push(currentLineRef.current);
    }

    for (const line of allLines) {
      if (line.points.length < 2) continue;

      // Draw 3-4 parallel lines offset from the center path
      const offsets = [-6, -2, 2, 6];

      for (const offset of offsets) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${RAKE_COLOR.r}, ${RAKE_COLOR.g}, ${RAKE_COLOR.b}, 0.7)`;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        let started = false;

        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];

          // Check if this point is near a rock — skip if so
          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 12) {
              nearRock = true;
              break;
            }
          }

          if (nearRock) {
            started = false;
            continue;
          }

          // Calculate perpendicular offset
          let nx = 0,
            ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              nx = -dy / len;
              ny = dx / len;
            }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              nx = -dy / len;
              ny = dx / len;
            }
          }

          const ox = p.x + nx * offset;
          const oy = p.y + ny * offset;

          if (!started) {
            ctx.moveTo(ox, oy);
            started = true;
          } else {
            ctx.lineTo(ox, oy);
          }
        }
        ctx.stroke();

        // Draw shadow line (slightly offset below for 3D effect)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${RAKE_COLOR.r - 20}, ${RAKE_COLOR.g - 20}, ${RAKE_COLOR.b - 20}, 0.3)`;
        ctx.lineWidth = 1;
        started = false;

        for (let i = 0; i < line.points.length; i++) {
          const p = line.points[i];

          let nearRock = false;
          for (const rock of rocksRef.current) {
            if (distToRock(p.x, p.y, rock) < rock.rx + 12) {
              nearRock = true;
              break;
            }
          }
          if (nearRock) {
            started = false;
            continue;
          }

          let nx = 0,
            ny = 0;
          if (i < line.points.length - 1) {
            const dx = line.points[i + 1].x - p.x;
            const dy = line.points[i + 1].y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              nx = -dy / len;
              ny = dx / len;
            }
          } else if (i > 0) {
            const dx = p.x - line.points[i - 1].x;
            const dy = p.y - line.points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              nx = -dy / len;
              ny = dx / len;
            }
          }

          const ox = p.x + nx * offset + 1;
          const oy = p.y + ny * offset + 1.5;

          if (!started) {
            ctx.moveTo(ox, oy);
            started = true;
          } else {
            ctx.lineTo(ox, oy);
          }
        }
        ctx.stroke();
      }
    }

    // Draw rocks
    for (const rock of rocksRef.current) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rotation);

      // Shadow
      ctx.beginPath();
      ctx.ellipse(2, 3, rock.rx + 2, rock.ry + 1, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fill();

      // Rock body
      ctx.beginPath();
      ctx.ellipse(0, 0, rock.rx, rock.ry, 0, 0, Math.PI * 2);
      const rockGrad = ctx.createRadialGradient(
        -rock.rx * 0.3,
        -rock.ry * 0.3,
        0,
        0,
        0,
        Math.max(rock.rx, rock.ry),
      );
      rockGrad.addColorStop(
        0,
        `rgb(${rock.color.r + 25}, ${rock.color.g + 25}, ${rock.color.b + 25})`,
      );
      rockGrad.addColorStop(
        1,
        `rgb(${rock.color.r}, ${rock.color.g}, ${rock.color.b})`,
      );
      ctx.fillStyle = rockGrad;
      ctx.fill();

      // Subtle highlight
      ctx.beginPath();
      ctx.ellipse(
        -rock.rx * 0.2,
        -rock.ry * 0.25,
        rock.rx * 0.4,
        rock.ry * 0.3,
        -0.3,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();

      ctx.restore();
    }
  }, []);

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

    // Generate noise texture (at lower resolution for performance)
    noiseDataRef.current = generateNoise(
      Math.floor(w / 2),
      Math.floor(h / 2),
    );

    // Generate rocks
    rocksRef.current = generateRocks(w, h);

    // Initial draw
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
      // Double-tap detection
      const now = Date.now();
      if (now - lastDoubleTapRef.current < 350) {
        // Double tap — smooth area
        smoothSpotsRef.current.push({
          x: e.clientX,
          y: e.clientY,
          radius: 40,
        });

        // Remove rake line points near this spot
        for (const line of rakeLinesRef.current) {
          line.points = line.points.filter((p) => {
            const dx = p.x - e.clientX;
            const dy = p.y - e.clientY;
            return Math.sqrt(dx * dx + dy * dy) > 40;
          });
        }
        // Remove empty lines
        rakeLinesRef.current = rakeLinesRef.current.filter(
          (l) => l.points.length >= 2,
        );

        drawScene();
        lastDoubleTapRef.current = 0;
        return;
      }
      lastDoubleTapRef.current = now;

      isDraggingRef.current = true;
      currentLineRef.current = {
        points: [{ x: e.clientX, y: e.clientY }],
      };
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

      // Only add point if moved enough
      if (dist > 4) {
        points.push({ x: e.clientX, y: e.clientY });
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
    drawScene();
  }, [drawScene]);

  // ── Clear garden ──────────────────────────────────────────────
  const clearGarden = useCallback(() => {
    rakeLinesRef.current = [];
    smoothSpotsRef.current = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    rocksRef.current = generateRocks(w, h);
    drawScene();
  }, [drawScene]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      style={{ backgroundColor: `rgb(${SAND_COLOR.r}, ${SAND_COLOR.g}, ${SAND_COLOR.b})` }}
      role="application"
      aria-label="Sand garden - drag to rake patterns in the sand"
    >
      <p className="sr-only">
        A zen sand garden. Drag your finger to rake parallel lines in the sand.
        Double-tap to smooth an area. Rocks are scattered on the surface for you
        to rake around. Use the clear button to start fresh.
      </p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Back button — dark text on light background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-colors"
          style={{
            backgroundColor: "rgba(212, 197, 169, 0.7)",
            color: "rgb(90, 80, 65)",
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

        {/* Clear button */}
        <button
          onClick={clearGarden}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto rounded-full px-3 py-1.5 text-sm backdrop-blur-sm transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "rgba(212, 197, 169, 0.7)",
            color: "rgb(90, 80, 65)",
          }}
        >
          Clear
        </button>
      </div>

      {/* How this helps */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
        <div className="pointer-events-auto w-full max-w-md">
          <button
            onClick={() => setShowHelp(!showHelp)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm transition-colors"
            style={{
              backgroundColor: "rgba(180, 165, 140, 0.7)",
              color: "rgb(80, 70, 55)",
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
                backgroundColor: "rgba(200, 185, 160, 0.85)",
                borderColor: "rgba(160, 145, 120, 0.3)",
                color: "rgb(70, 60, 45)",
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
