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

const TURNS = 3.1;          // how many times the spiral wraps
const POINTS = 620;         // path resolution

interface PathPoint {
  x: number;
  y: number;
}

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

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const buildPath = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.38;
    const pts: PathPoint[] = [];
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      // Start at the outside and wind in; a little easing so the turns at
      // the centre do not get impossibly tight.
      const r = maxR * (1 - t) ** 0.85;
      const a = t * TURNS * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    pathRef.current = pts;
  }, []);

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
      buildPath(w, h);
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
    const cur = Math.floor(progressRef.current);
    const from = Math.max(0, cur - 40);
    const to = Math.min(path.length - 1, cur + 40);

    let bestI = cur;
    let bestD = Infinity;
    for (let i = from; i <= to; i++) {
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

    const reached = bestI >= path.length - 4;
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
        A spiral path drawn on the screen. Put a finger on it and slide slowly
        inward, following the line. You cannot leave the path and there is no
        wrong way to do it. Lift your finger and it waits. When you reach the
        middle you can trace back out again.
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
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {atCenter
          ? "You're in the middle. Stay as long as you like, or trace back out."
          : started
            ? "Keep going. As slow as you want."
            : "Put a finger on the line and follow it inward."}
      </p>
    </div>
  );
}
