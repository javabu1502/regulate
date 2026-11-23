"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Beads ──────────────────────────────────────────────────────────
// Moving beads one at a time through your fingers is about the oldest
// self-settling practice there is, and it works because the hand counts so
// the mind does not have to. One bead per breath, if you want a pace.
//
// The count is not a score. It is not kept between visits, there is nothing
// to beat, and the ring simply comes round again. The marker bead is there so
// you can feel a lap complete without watching a number.

const BEADS = 27;        // a quarter of a traditional 108
const MARKER_EVERY = 9;  // a slightly larger bead to feel the thirds

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

/**
 * The sound of one bead settling against the next.
 *
 * This began as a triangle wave at 430Hz with a tenth-of-a-second decay,
 * which is a click: a hard transient, bright, and over before it softens.
 * Peaceful needs the opposite. Low sine partials rather than a buzzing
 * waveform, an attack of a few milliseconds rather than none, a filter well
 * below the fundamental's harmonics, and a tail long enough to fall away
 * instead of stopping. Quiet enough that twenty in a row do not nag.
 */
function click(marker: boolean) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const base = marker ? 150 : 186;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.6;

    const out = ctx.createGain();
    out.gain.value = 1;
    filter.connect(out);
    out.connect(ctx.destination);

    // A low body and one soft partial above it: wood resting on wood.
    [
      { mult: 1, level: marker ? 0.085 : 0.055, decay: marker ? 0.75 : 0.5 },
      { mult: 2.4, level: marker ? 0.02 : 0.013, decay: 0.3 },
    ].forEach(({ mult, level, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base * mult;
      // Slight downward drift, the way a settling object loses tension.
      osc.frequency.exponentialRampToValueAtTime(base * mult * 0.88, now + decay);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  } catch {
    /* sound is optional */
  }
}

export default function BeadsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Rotation of the ring, in bead widths. The bead at the marker is
  // Math.round(rotation) mod BEADS.
  const rotRef = useRef(0);
  const targetRef = useRef(0);
  const lastIndexRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);

  const [count, setCount] = useState(0);
  const [laps, setLaps] = useState(0);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const advance = useCallback((by: number) => {
    targetRef.current += by;
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
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const ringR = Math.min(w, h) * 0.3;

      // Ease toward the target so a flick settles rather than snapping.
      const ease = reducedMotionRef.current ? 0.5 : 0.14;
      rotRef.current += (targetRef.current - rotRef.current) * ease;

      ctx!.clearRect(0, 0, w, h);

      // The cord
      ctx!.beginPath();
      ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(125, 211, 200, 0.14)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Where a bead counts as having passed
      ctx!.beginPath();
      ctx!.arc(cx, cy - ringR, 21, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(226, 203, 140, 0.22)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      for (let i = 0; i < BEADS; i++) {
        // Bead 0 sits at the marker when rotation is 0.
        const a = ((i - rotRef.current) / BEADS) * Math.PI * 2 - Math.PI / 2;
        const bx = cx + Math.cos(a) * ringR;
        const by = cy + Math.sin(a) * ringR;

        const isMarker = i % MARKER_EVERY === 0;
        // Nearness to the marker, for a gentle highlight.
        const atTop = Math.max(0, 1 - Math.abs(((a + Math.PI / 2) % (Math.PI * 2)) / 0.5));
        const rad = (isMarker ? 9 : 6.5) + atTop * 2.5;

        if (atTop > 0.2) {
          const glow = ctx!.createRadialGradient(bx, by, 0, bx, by, rad * 3);
          glow.addColorStop(0, `rgba(226, 203, 140, ${0.22 * atTop})`);
          glow.addColorStop(1, "rgba(226, 203, 140, 0)");
          ctx!.beginPath();
          ctx!.arc(bx, by, rad * 3, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(bx, by, rad, 0, Math.PI * 2);
        ctx!.fillStyle = isMarker
          ? `rgba(226, 203, 140, ${0.3 + atTop * 0.4})`
          : `rgba(153, 246, 228, ${0.18 + atTop * 0.4})`;
        ctx!.fill();
        ctx!.strokeStyle = isMarker
          ? "rgba(226, 203, 140, 0.45)"
          : "rgba(153, 246, 228, 0.3)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Count a bead whenever the settled rotation crosses a whole number.
  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.round(rotRef.current);
      if (idx !== lastIndexRef.current) {
        const moved = idx - lastIndexRef.current;
        lastIndexRef.current = idx;
        const marker = ((idx % BEADS) + BEADS) % BEADS % MARKER_EVERY === 0;
        click(marker);
        if (marker) haptics.light();
        else haptics.subtle();
        setCount((c) => {
          const next = c + moved;
          if (next > 0 && next % BEADS === 0) setLaps((l) => l + 1);
          return next;
        });
      }
    }, 60);
    return () => clearInterval(id);
  }, []);

  const angleOf = (x: number, y: number) => {
    const { w, h } = sizeRef.current;
    return Math.atan2(y - h / 2, x - w / 2);
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    lastAngleRef.current = angleOf(e.clientX, e.clientY);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const a = angleOf(e.clientX, e.clientY);
    let delta = a - lastAngleRef.current;
    // Shortest way round, so crossing the top does not jump.
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    lastAngleRef.current = a;
    targetRef.current += (-delta / (Math.PI * 2)) * BEADS;
  }, []);

  const onUp = useCallback(() => {
    draggingRef.current = false;
    // Settle on a bead rather than between two.
    targetRef.current = Math.round(targetRef.current);
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Beads - move one bead at a time around the ring"
    >
      <p className="sr-only">
        A ring of twenty-seven beads with a larger one every ninth. Drag around
        the ring to move the beads past the marker at the top, one at a time,
        or tap to move a single bead. One bead per breath if you want a pace.
        Nothing is kept or scored.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
        onClick={() => {
          if (!draggingRef.current) advance(1);
        }}
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

        {laps > 0 && (
          <span className="pointer-events-none rounded-full bg-deep/60 px-3 py-1.5 text-[11px] text-cream-dim/35 backdrop-blur-sm">
            {laps === 1 ? "once around" : `${laps} times around`}
          </span>
        )}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {count === 0
          ? "Drag around the ring, or tap for one bead."
          : "One bead, one breath. No need to count."}
      </p>
    </div>
  );
}
