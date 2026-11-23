"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Finger labyrinth ───────────────────────────────────────────────
// Tracing a path inward with a finger is an old contemplative practice and
// is used in therapy rooms as a portable version of walking a labyrinth. It
// occupies the hand and the eye on a single line with one direction, which
// is easier to hold onto than an empty canvas when your thoughts are loud.
//
// You cannot leave the path and you cannot do it wrong. Lift your finger and
// it waits. Reach the middle and you can turn around and come back out.

const POINTS = 620;         // path resolution

interface PathPoint {
  x: number;
  y: number;
}

// Four paths, each asking for something different from the hand. Open shapes
// have a destination; closed ones just keep going, which suits a longer sit.
type Shape = "spiral" | "switchback" | "eight" | "square";

const SHAPES: { id: Shape; label: string; closed: boolean; hint: string }[] = [
  { id: "spiral",     label: "Spiral",    closed: false, hint: "Winds inward to a middle." },
  { id: "switchback", label: "Switchback", closed: false, hint: "Doubles back on itself, like a path up a hill." },
  { id: "eight",      label: "Figure 8",  closed: true,  hint: "Crosses the middle again and again, left to right." },
  { id: "square",     label: "Box",       closed: true,  hint: "Four equal sides. Breathe one side per count if you like." },
];

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/** A quiet tone as you pass each quarter turn, so progress is audible. */
function playMark(step: number) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const scale = [261.63, 293.66, 329.63, 392, 440]; // pentatonic, never clashes
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = scale[step % scale.length];
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch {
    /* sound is optional */
  }
}

export default function LabyrinthPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const pathRef = useRef<PathPoint[]>([]);
  const progressRef = useRef(0);        // index into the path
  const markRef = useRef(0);
  const touchingRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  const [atCenter, setAtCenter] = useState(false);
  const [started, setStarted] = useState(false);
  const [shape, setShape] = useState<Shape>("spiral");
  const shapeRef = useRef<Shape>("spiral");
  const shapeMeta = SHAPES.find((x) => x.id === shape)!;

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const buildPath = useCallback((w: number, h: number, shape: Shape) => {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.38;
    const pts: PathPoint[] = [];

    if (shape === "spiral") {
      // Outside in, eased so the turns near the middle stay traceable.
      const turns = 3.1;
      for (let i = 0; i < POINTS; i++) {
        const t = i / (POINTS - 1);
        const r = maxR * (1 - t) ** 0.85;
        const a = t * turns * Math.PI * 2 - Math.PI / 2;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
    } else if (shape === "switchback") {
      // Concentric arcs joined by short radial hops, reversing direction each
      // time. Not the Cretan labyrinth's exact topology, so it is named for
      // what it is rather than borrowing that word.
      const rings = 5;
      const per = Math.floor(POINTS / rings);
      for (let ring = 0; ring < rings; ring++) {
        const r = maxR * (1 - ring / rings);
        const dir = ring % 2 === 0 ? 1 : -1;
        const sweep = Math.PI * 1.72;
        const start = dir > 0 ? -Math.PI / 2 : -Math.PI / 2 + sweep;
        for (let i = 0; i < per; i++) {
          const t = i / (per - 1);
          const a = start + dir * sweep * t;
          // Ease into the next ring across the last stretch of this one.
          const rr = r - (maxR / rings) * Math.max(0, (t - 0.86) / 0.14);
          pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
        }
      }
    } else if (shape === "eight") {
      // Lemniscate: the hand keeps crossing the midline, which is the same
      // left-right alternation Crossing and Butterfly Hug use.
      for (let i = 0; i < POINTS; i++) {
        const t = (i / POINTS) * Math.PI * 2;
        pts.push({
          x: cx + Math.sin(t) * maxR,
          y: cy + Math.sin(t) * Math.cos(t) * maxR * 0.92,
        });
      }
    } else {
      // Rounded square: four equal sides, so it can be traced a side per
      // count the way box breathing is paced.
      const side = maxR * 1.5;
      const rad = side * 0.18;
      const half = side / 2;
      const seg = Math.floor(POINTS / 4);
      const corners: [number, number][] = [
        [-half, -half], [half, -half], [half, half], [-half, half],
      ];
      for (let c = 0; c < 4; c++) {
        const [x0, y0] = corners[c];
        const [x1, y1] = corners[(c + 1) % 4];
        for (let i = 0; i < seg; i++) {
          const t = i / seg;
          // Pull the ends of each side in, so corners read as curves.
          const e = rad / side;
          const tt = e + t * (1 - e * 2);
          pts.push({ x: cx + x0 + (x1 - x0) * tt, y: cy + y0 + (y1 - y0) * tt });
        }
      }
    }

    pathRef.current = pts;
  }, []);

  // Switching shape lays down a new path and starts it from the beginning.
  useEffect(() => {
    shapeRef.current = shape;
    const { w, h } = sizeRef.current;
    if (w && h) {
      buildPath(w, h, shape);
      progressRef.current = 0;
      markRef.current = 0;
      setAtCenter(false);
      setStarted(false);
    }
  }, [shape, buildPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = canvasHeight();
      sizeRef.current = { w, h };
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPath(w, h, shapeRef.current);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      const path = pathRef.current;
      ctx!.clearRect(0, 0, w, h);
      if (path.length === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // The whole path, faint: you can always see where it goes.
      ctx!.beginPath();
      ctx!.moveTo(path[0].x, path[0].y);
      for (const p of path) ctx!.lineTo(p.x, p.y);
      ctx!.strokeStyle = "rgba(125, 211, 200, 0.12)";
      ctx!.lineWidth = 14;
      ctx!.lineCap = "round";
      ctx!.stroke();

      ctx!.strokeStyle = "rgba(125, 211, 200, 0.2)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // The part you have walked, brighter.
      const upto = Math.floor(progressRef.current);
      if (upto > 1) {
        ctx!.beginPath();
        ctx!.moveTo(path[0].x, path[0].y);
        for (let i = 1; i <= upto; i++) ctx!.lineTo(path[i].x, path[i].y);
        ctx!.strokeStyle = "rgba(153, 246, 228, 0.5)";
        ctx!.lineWidth = 9;
        ctx!.lineCap = "round";
        ctx!.stroke();
      }

      // Where you are now.
      const head = path[Math.min(upto, path.length - 1)];
      const breathe = reducedMotionRef.current ? 1 : 1 + Math.sin(now / 700) * 0.12;
      const glow = ctx!.createRadialGradient(head.x, head.y, 0, head.x, head.y, 34 * breathe);
      glow.addColorStop(0, "rgba(153, 246, 228, 0.4)");
      glow.addColorStop(1, "rgba(153, 246, 228, 0)");
      ctx!.beginPath();
      ctx!.arc(head.x, head.y, 34 * breathe, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(head.x, head.y, 7, 0, Math.PI * 2);
      ctx!.fillStyle = touchingRef.current
        ? "rgba(250, 245, 239, 0.95)"
        : "rgba(250, 245, 239, 0.6)";
      ctx!.fill();

      // The centre, once reached.
      if (progressRef.current >= path.length - 3) {
        const c = path[path.length - 1];
        ctx!.beginPath();
        ctx!.arc(c.x, c.y, 24, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(226, 203, 140, 0.4)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [buildPath]);

  /** Move along the path toward whichever point is nearest the finger. */
  const follow = useCallback((x: number, y: number) => {
    const path = pathRef.current;
    if (path.length === 0) return;

    // Only look at nearby stretches of path, so a finger near the centre
    // cannot teleport you there from the outer ring.
    const n = path.length;
    const closed = SHAPES.find((sh) => sh.id === shapeRef.current)!.closed;
    const cur = Math.floor(progressRef.current);

    // Look only at nearby path, so a finger near the middle cannot teleport
    // you there from the outer edge. Closed shapes wrap, so tracing a loop
    // continues round instead of stopping at the join.
    let bestI = cur;
    let bestD = Infinity;
    for (let off = -40; off <= 40; off++) {
      let i = cur + off;
      if (closed) i = ((i % n) + n) % n;
      else if (i < 0 || i >= n) continue;
      const dx = path[i].x - x;
      const dy = path[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    // Too far from the path: stay put rather than jumping.
    if (Math.sqrt(bestD) > 60) return;

    progressRef.current = bestI;
    if (!started && bestI > 2) setStarted(true);

    const mark = Math.floor((bestI / path.length) * 12);
    if (mark !== markRef.current) {
      markRef.current = mark;
      playMark(mark);
      haptics.subtle();
    }

    const reached = !closed && bestI >= n - 4;
    setAtCenter((was) => {
      if (reached && !was) haptics.complete();
      return reached;
    });
  }, [started]);

  const onDown = useCallback((e: React.PointerEvent) => {
    touchingRef.current = true;
    follow(e.clientX, e.clientY);
  }, [follow]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!touchingRef.current) return;
    follow(e.clientX, e.clientY);
  }, [follow]);

  const onUp = useCallback(() => {
    touchingRef.current = false;
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Finger labyrinth - trace the spiral inward with your finger"
    >
      <p className="sr-only">
        A path drawn on the screen, which you can switch between a spiral, a
        switchback, a figure eight and a box. Put a finger on it and slide
        along it slowly. You cannot leave the path and there is no wrong way
        to do it. Lift your finger and it waits. The spiral and switchback
        wind in to a middle; the figure eight and box loop round for as long
        as you want.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
      />

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

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              onClick={() => setShape(sh.id)}
              aria-pressed={shape === sh.id}
              className={`rounded-full px-2.5 py-1.5 text-[11px] backdrop-blur-sm transition-all ${
                shape === sh.id
                  ? "bg-teal/15 text-teal-soft/80"
                  : "bg-deep/60 text-cream-dim/40"
              }`}
            >
              {sh.label}
            </button>
          ))}
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {atCenter
          ? "You're in the middle. Stay as long as you like, or trace back out."
          : started
            ? "Keep going. As slow as you want."
            : shapeMeta.closed
              ? `${shapeMeta.hint} Put a finger on the line and keep going.`
              : `${shapeMeta.hint} Put a finger on the line and follow it.`}
      </p>
    </div>
  );
}
