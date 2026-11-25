"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── The one game here that gently wakes you up ─────────────────────
// Every other game in the app calms or discharges, which is wrong for
// shutdown: a frozen nervous system needs a little activation, not more
// quiet. This is the orienting exercise as a game. A soft light appears
// somewhere in the periphery, you turn your head and look at it, you touch
// it, another appears elsewhere. That outward scanning is what tells a body
// the room is safe.
//
// It builds, over the first dozen or so, and then holds there. One light
// becomes two and then three, and the gap between them closes. That ramp
// is the activation, done gradually rather than all at once, and it levels
// off rather than climbing forever, because a game that keeps getting
// faster turns into pressure.
//
// It was briefly capped at twelve with an ending. That was wrong: a fixed
// number makes the thing a task to complete, and this should be something
// you stop doing when you have had enough. The count on screen is a tally
// of what you have done, not a target, and the clock is elapsed rather than
// counting down. No miss, no score, nothing to finish.

interface Spark {
  x: number; y: number; vx: number; vy: number; r: number; life: number;
}

interface Light {
  x: number;
  y: number;
  zone: number;
  born: number;
  found: boolean;
  foundAt: number;
  sparks: Spark[];
}

// The burst colour. Warmer and more orange than the light itself, so the
// pop reads as a change rather than the same gold getting bigger.
const POP = "230, 154, 92";

/** Eight sparks thrown out from the point, the way a bubble goes. */
function makeSparks(x: number, y: number): Spark[] {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.35;
    const speed = 0.9 + Math.random() * 1.9;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.8 + Math.random() * 2.4,
      life: 0,
    };
  });
}

// Deliberately opposite corners and edges, so each one asks for a real head
// turn rather than an eye flick.
const ZONES: { x: [number, number]; y: [number, number] }[] = [
  { x: [0.08, 0.3], y: [0.12, 0.35] },
  { x: [0.7, 0.92], y: [0.12, 0.35] },
  { x: [0.08, 0.3], y: [0.62, 0.85] },
  { x: [0.7, 0.92], y: [0.62, 0.85] },
  { x: [0.4, 0.6], y: [0.08, 0.22] },
  { x: [0.4, 0.6], y: [0.75, 0.9] },
  { x: [0.05, 0.18], y: [0.42, 0.58] },
  { x: [0.82, 0.95], y: [0.42, 0.58] },
];

/** How many lights the build takes to reach its full pace. Not a limit:
 *  the game keeps going for as long as you want it to. */
const RAMP = 12;

/**
 * How it builds, and where it stops building.
 *
 * The gap is how long the screen stays empty after one is found, so a
 * shorter gap is a quicker game. The first few are unhurried on purpose:
 * this is for a body that has gone still, and being rushed at the start is
 * the thing most likely to make someone close it.
 *
 * It levels off rather than climbing forever. A game that keeps getting
 * faster with no ceiling turns into pressure, which is the opposite of what
 * this is for.
 */
function pace(found: number) {
  const t = Math.min(1, found / RAMP);
  return {
    gap: 1100 - t * 650,
    concurrent: t < 0.35 ? 1 : t < 0.7 ? 2 : 3,
  };
}

/** m:ss. */
function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return `${m}:${ss}`;
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

/** A rising two-note chime: upward, because the point is mild activation.
 *
 *  The two notes rise; the chime itself does not climb as you go. It did
 *  for a while, so the quickening would be audible, and a pitch that keeps
 *  creeping up is a sound that keeps asking for something. Wrong for a game
 *  whose whole job is to settle a body down. Same two notes every time. */
function playFound() {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.07, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.75);
    });
  } catch {
    /* sound is optional */
  }
}

export default function LookingAroundPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lightsRef = useRef<Light[]>([]);
  const lastZoneRef = useRef<number>(-1);
  const nextAtRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const foundRef = useRef(0);

  const [foundCount, setFoundCount] = useState(0);
  // Elapsed, not a countdown. It says how long you have been at it; it does
  // not ask you to go faster, and nothing in the round depends on it.
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(0);
  // The light is tappable and nothing said so. If one sits untouched for a
  // few seconds, say it plainly and ring it, which is the universal "this
  // responds to a finger" signal.
  const [needsNudge, setNeedsNudge] = useState(false);
  const nudgeShownRef = useRef(false);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  /** Put one more light out, in a zone nothing is already using. */
  const spawn = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const busy = new Set(lightsRef.current.filter((l) => !l.found).map((l) => l.zone));
    // Never the same zone twice running, and never two at once in one
    // place: the turn of the head is the exercise.
    const free = ZONES.map((_, i) => i).filter((i) => !busy.has(i) && i !== lastZoneRef.current);
    const pool = free.length ? free : ZONES.map((_, i) => i).filter((i) => !busy.has(i));
    if (!pool.length) return;
    const zone = pool[Math.floor(Math.random() * pool.length)];
    lastZoneRef.current = zone;
    const z = ZONES[zone];
    lightsRef.current.push({
      x: (z.x[0] + Math.random() * (z.x[1] - z.x[0])) * w,
      y: (z.y[0] + Math.random() * (z.y[1] - z.y[0])) * h,
      zone,
      born: performance.now(),
      found: false,
      foundAt: 0,
      sparks: [],
    });
    nudgeShownRef.current = false;
    setNeedsNudge(false);
  }, []);

  // Ticks once a second while a round is running.
  useEffect(() => {
    const id = setInterval(() => {
      if (startedRef.current) {
        setElapsed(Math.floor((performance.now() - startedRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
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
    startedRef.current = performance.now();
    spawn();

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      const bloom = reducedMotionRef.current ? 240 : 650;
      // Clear away the ones whose bloom has finished.
      lightsRef.current = lightsRef.current.filter(
        (l) => !l.found || now - l.foundAt < bloom,
      );

      for (const light of lightsRef.current) {
        if (light.found) {
          const p = Math.min((now - light.foundAt) / bloom, 1);
          // The ring the burst leaves behind.
          ctx!.beginPath();
          ctx!.arc(light.x, light.y, 14 + p * 50, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${POP}, ${0.5 * (1 - p)})`;
          ctx!.lineWidth = 2.5 * (1 - p);
          ctx!.stroke();
          // A flash at the point, gone almost at once.
          if (p < 0.3) {
            ctx!.beginPath();
            ctx!.arc(light.x, light.y, 13 * (1 - p / 0.3), 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(252, 226, 190, ${0.85 * (1 - p / 0.3)})`;
            ctx!.fill();
          }
          // And the sparks, thrown outward and falling a little.
          if (!reducedMotionRef.current) {
            for (const sp of light.sparks) {
              sp.life += 1;
              if (sp.life > 34) continue;
              sp.x += sp.vx; sp.y += sp.vy;
              sp.vy += 0.03; sp.vx *= 0.98; sp.vy *= 0.98;
              const k = 1 - sp.life / 34;
              ctx!.beginPath();
              ctx!.arc(sp.x, sp.y, sp.r * k, 0, Math.PI * 2);
              ctx!.fillStyle = `rgba(${POP}, ${0.8 * k})`;
              ctx!.fill();
            }
          }
          continue;
        }

        // Breathes in slowly so it draws the eye without startling.
        const age = (now - light.born) / 1000;
        const pulse = reducedMotionRef.current
          ? 0.72
          : 0.55 + Math.sin(age * 1.5) * 0.18;
        const appear = Math.min(age / 0.9, 1);

        const glow = ctx!.createRadialGradient(light.x, light.y, 0, light.x, light.y, 62);
        glow.addColorStop(0, `rgba(214, 189, 146, ${0.42 * pulse * appear})`);
        glow.addColorStop(1, "rgba(214, 189, 146, 0)");
        ctx!.beginPath();
        ctx!.arc(light.x, light.y, 62, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        // Waited a while: ring it so it reads as touchable.
        if (age > 3.5) {
          if (!nudgeShownRef.current) {
            nudgeShownRef.current = true;
            setNeedsNudge(true);
          }
          const ringT = reducedMotionRef.current ? 0.5 : ((age - 3.5) % 1.8) / 1.8;
          ctx!.beginPath();
          ctx!.arc(light.x, light.y, 24 + ringT * 40, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(214, 189, 146, ${0.3 * (1 - ringT)})`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }

        ctx!.beginPath();
        ctx!.arc(light.x, light.y, 11 * appear, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(245, 232, 198, ${0.9 * appear})`;
        ctx!.fill();
      }

      // Top the screen back up, once the gap for this point in the round
      // has passed. Nothing spawns after the last one is found.
      const { gap, concurrent } = pace(foundRef.current);
      const live = lightsRef.current.filter((l) => !l.found).length;
      if (live < concurrent && now >= nextAtRef.current) {
        spawn();
        nextAtRef.current = now + gap;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [spawn]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Nearest unfound light wins, so two close together cannot both take
    // the same tap.
    // Indexed rather than held as a local, because the compiler will not
    // allow a value it has seen passed to a hook to be mutated through an
    // alias. Writing through the ref is the same thing and is allowed.
    let bestIdx = -1;
    let bestD = Infinity;
    const lights = lightsRef.current;
    for (let i = 0; i < lights.length; i++) {
      if (lights[i].found) continue;
      const d = Math.hypot(e.clientX - lights[i].x, e.clientY - lights[i].y);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    // Generous target: this is not a test of aim. A miss means they are
    // trying to interact, so that is the moment to say what to aim at
    // rather than leave the tap unanswered.
    if (bestIdx < 0 || bestD > 90) {
      nudgeShownRef.current = true;
      setNeedsNudge(true);
      return;
    }
    lightsRef.current[bestIdx].found = true;
    lightsRef.current[bestIdx].foundAt = performance.now();
    lightsRef.current[bestIdx].sparks = makeSparks(
      lightsRef.current[bestIdx].x, lightsRef.current[bestIdx].y);
    foundRef.current += 1;
    playFound();
    haptics.tap();
    setFoundCount(foundRef.current);
    // The next one waits out this point's gap rather than arriving on top
    // of the bloom.
    nextAtRef.current = performance.now() + pace(foundRef.current).gap;
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Looking around - find and touch each light as it appears"
    >
      <p className="sr-only">
        Soft lights appear one at a time toward the edges of the screen. Look
        for each one, then touch it. It starts slowly with one light at a
        time and gradually quickens over the first dozen, with two and then
        three out at once, and then it stays at that pace. It does not end:
        stop whenever you have had enough. A count of how many you have
        touched and a clock of how long you have been playing are in the
        corner, and nothing depends on either. Looking around the room is
        how the body checks that it is safe.
      </p>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
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

        {/* How many are left. Not a score: there is nothing to beat and no
            clock, it is only here so the end is in sight from the start. */}
        <span className="rounded-full bg-deep/60 px-3 py-1.5 text-[11px] tabular-nums text-cream-dim/45 backdrop-blur-sm">
          {foundCount}
          <span className="mx-1.5 text-cream-dim/20">·</span>
          {clock(elapsed)}
        </span>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {needsNudge
          ? "Touch the light."
          : foundCount === 0
            ? "Find the light, then touch it. Turn your head if you need to."
            : foundCount >= Math.round(RAMP * 0.7)
              ? "More than one now. Take them in any order."
              : "It picks up a little as you go."}
      </p>
    </div>
  );
}
