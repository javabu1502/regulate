"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Koi ────────────────────────────────────────────────────────────
// Everything else in here responds to you instantly and exactly. This does
// not. The fish notice your finger and drift toward it in their own time,
// and they lose interest if you sit still too long.
//
// That gap is deliberate. Something that comes when you are patient and
// wanders off when you are not is better company than something obedient,
// and company is often what is actually missing at two in the morning.

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: "cream" | "candle" | "teal";
  phase: number;
  interest: number;   // 0 = ignoring you, 1 = coming over
}

interface Ring {
  x: number;
  y: number;
  born: number;
}

export default function KoiPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const fishRef = useRef<Fish[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const touchRef = useRef<{ x: number; y: number; since: number } | null>(null);

  const [met, setMet] = useState(false);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

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

      if (fishRef.current.length === 0) {
        const hues: Fish["hue"][] = ["cream", "candle", "teal", "cream", "candle"];
        fishRef.current = hues.map((hue, i) => ({
          x: w * (0.2 + Math.random() * 0.6),
          y: h * (0.2 + Math.random() * 0.6),
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: 13 + Math.random() * 7,
          hue,
          phase: i * 1.3,
          interest: 0,
        }));
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      const slow = reducedMotionRef.current ? 0.45 : 1;
      ctx!.clearRect(0, 0, w, h);

      // Water
      const water = ctx!.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      water.addColorStop(0, "rgba(61, 90, 128, 0.16)");
      water.addColorStop(1, "rgba(10, 15, 30, 0)");
      ctx!.fillStyle = water;
      ctx!.fillRect(0, 0, w, h);

      // Rings where a finger has been
      ringsRef.current = ringsRef.current.filter((r) => now - r.born < 2600);
      for (const r of ringsRef.current) {
        const p = (now - r.born) / 2600;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, 8 + p * 54, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(153, 246, 228, ${0.22 * (1 - p)})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      const touch = touchRef.current;

      for (const f of fishRef.current) {
        // Interest builds while a finger rests, and fades when it is gone or
        // has been still a long while.
        if (touch) {
          // Interest was rising so slowly that they were losing it again
          // before they had crossed the pond. Warming up takes a few seconds
          // now, and they stay curious for a good while before drifting off.
          const held = (now - touch.since) / 1000;
          const bored = held > 30 ? Math.max(0, 1 - (held - 30) / 12) : 1;
          f.interest += (bored - f.interest) * 0.012;
        } else {
          f.interest += (0 - f.interest) * 0.012;
        }

        // Wander: slow noise so no two swim alike.
        f.phase += 0.004 * slow;
        f.vx += Math.cos(f.phase * 1.7) * 0.016 * slow;
        f.vy += Math.sin(f.phase * 1.3) * 0.016 * slow;

        if (touch && f.interest > 0.01) {
          const dx = touch.x - f.x;
          const dy = touch.y - f.y;
          const d = Math.hypot(dx, dy) || 1;
          // Ease off as they arrive, so they gather rather than pile up.
          const near = Math.min(1, d / 90);
          f.vx += (dx / d) * 0.075 * f.interest * near * slow;
          f.vy += (dy / d) * 0.075 * f.interest * near * slow;
        }

        // Drag, and a gentle cap
        f.vx *= 0.975;
        f.vy *= 0.975;
        const sp = Math.hypot(f.vx, f.vy);
        const max = 1.5 * slow;
        if (sp > max) {
          f.vx = (f.vx / sp) * max;
          f.vy = (f.vy / sp) * max;
        }

        f.x += f.vx;
        f.y += f.vy;

        // Turn back at the edges rather than bouncing hard.
        const m = 40;
        if (f.x < m) f.vx += 0.05;
        if (f.x > w - m) f.vx -= 0.05;
        if (f.y < m) f.vy += 0.05;
        if (f.y > h - m) f.vy -= 0.05;

        // Body
        const angle = Math.atan2(f.vy, f.vx);
        const colour =
          f.hue === "cream"
            ? "250, 245, 239"
            : f.hue === "candle"
              ? "226, 203, 140"
              : "153, 246, 228";

        ctx!.save();
        ctx!.translate(f.x, f.y);
        ctx!.rotate(angle);

        const glow = ctx!.createRadialGradient(0, 0, 0, 0, 0, f.size * 2.4);
        glow.addColorStop(0, `rgba(${colour}, 0.1)`);
        glow.addColorStop(1, `rgba(${colour}, 0)`);
        ctx!.beginPath();
        ctx!.arc(0, 0, f.size * 2.4, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.ellipse(0, 0, f.size, f.size * 0.42, 0, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${colour}, 0.5)`;
        ctx!.fill();

        // Tail, sweeping with the swim
        const sweep = Math.sin(now / 320 + f.phase * 4) * 0.5;
        ctx!.beginPath();
        ctx!.moveTo(-f.size * 0.85, 0);
        ctx!.lineTo(-f.size * 1.7, f.size * 0.4 + sweep * f.size * 0.3);
        ctx!.lineTo(-f.size * 1.7, -f.size * 0.4 + sweep * f.size * 0.3);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(${colour}, 0.26)`;
        ctx!.fill();

        ctx!.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const down = useCallback((e: React.PointerEvent) => {
    touchRef.current = { x: e.clientX, y: e.clientY, since: performance.now() };
    ringsRef.current.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    haptics.subtle();
    if (!met) setMet(true);
  }, [met]);

  const move = useCallback((e: React.PointerEvent) => {
    const t = touchRef.current;
    if (!t) return;
    // Moving a lot resets their patience, the way it would with real fish.
    const moved = Math.hypot(e.clientX - t.x, e.clientY - t.y);
    touchRef.current = {
      x: e.clientX,
      y: e.clientY,
      since: moved > 60 ? performance.now() : t.since,
    };
    if (moved > 40) {
      ringsRef.current.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    }
  }, []);

  const up = useCallback(() => {
    touchRef.current = null;
  }, []);

  // iOS fires pointercancel when it thinks a system gesture began. Treat it
  // as a lift rather than letting the fish keep chasing a finger that is
  // no longer there.

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Koi - fish that come over if you hold still"
    >
      <p className="sr-only">
        A dark pond with five fish drifting in it. Rest a finger on the water
        and they will gradually come over. They take their time, and they
        wander off again if you move about or wait too long. Nothing is asked
        of you and there is nothing to catch.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
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
        {met
          ? "Hold still. They take their time."
          : "Rest a finger on the water and wait."}
      </p>
    </div>
  );
}
