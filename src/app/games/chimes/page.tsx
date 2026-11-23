"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled, setGameSoundEnabled } from "@/lib/game-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvasHeight } from "@/lib/canvas-area";

// ─── Bowls ──────────────────────────────────────────────────────────
// The only game here led by sound rather than by what is on screen. It works
// with your eyes closed, and better with headphones.
//
// Played the way a real bowl is played, with one liberty taken: the speed of
// the circling bends the note up to a fifth, so the hand has something to
// steer. Tap it and it rings. Or circle a finger slowly around the rim and
// it sings: the tone grows while you keep going round and falls away when
// you stop. The circling is the point. It needs a slow, steady, continuous
// hand, which is difficult to do while braced, and breathing tends to
// follow the hand.
//
// One bowl. There were five in a pentatonic row, which made this a little
// instrument you played rather than one object you sat with, and choosing
// between five is already more than this is for.
//
// The five notes did not go away, they moved into the hand. How wide you
// circle picks the note, wide and low near the rim through to tight and
// high near the middle, and how fast you circle bends it from there. Both
// live in the same motion, so there is nothing to choose before you start
// and nothing on screen to aim at.

// What it rings at when you tap it. Fixed, and low, the way a heavy bowl
// is. It used to ring at whatever note the tap position mapped to, which
// meant tapping the middle of the bowl, the obvious way to strike one,
// produced the thinnest note in the set.
const BOWL = { freq: 98.0, scale: 1 };



interface Bowl {
  x: number;
  y: number;
  r: number;
  freq: number;
  ring: number;   // struck energy, decays on its own
  sing: number;   // rubbed energy, only held up by circling
  rate: number;   // how fast the rim is being circled, radians a second
  dot: number;    // where the bright point has got to on the rim
  reach: number;  // how far out the finger is circling, for the drawn ring
}

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
    master = audioCtx.createGain();
    master.gain.value = 0.5;
    master.connect(audioCtx.destination);
  }
  return audioCtx;
}

// A bowl's partials do not sit at whole multiples the way a string's do,
// and two slightly detuned copies of each is what gives the slow beating
// you hear in a real one. The struck sound and the sung one are built from
// this same table, so circling continues the note you tapped rather than
// introducing a second instrument.
const PARTIALS = [
  { mult: 1, gain: 0.3, decay: 11, detune: 1.1 },
  { mult: 2.75, gain: 0.1, decay: 8, detune: 1.7 },
  { mult: 5.4, gain: 0.04, decay: 5, detune: 2.3 },
  { mult: 8.9, gain: 0.015, decay: 3, detune: 0 },
];

/** Struck: swells in, rings a long time, partials sit at odd ratios. */
function strike(freq: number, velocity = 1) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    PARTIALS.forEach(({ mult, gain: level, decay, detune }) => {
      const pair = detune > 0 ? [-detune / 2, detune / 2] : [0];
      pair.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq * mult + offset;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime((level * velocity) / pair.length, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(gain);
        gain.connect(master ?? ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.1);
      });
    });
  } catch {
    /* sound is optional */
  }
}

// ─── The sung tone ──────────────────────────────────────────────────
// The same note as the strike, from the same partials, simply held instead
// of allowed to decay. Circling does not start another sound; it keeps the
// one that is already there going, and moves it a little.

let singVoice: { oscs: OscillatorNode[]; gain: GainNode; parts: { mult: number; off: number }[] } | null = null;

// How far circling moves the note, and which way. It used to only go up,
// by a fifth, picked out of a scale by how wide the circle was. A fifth is
// a different note, not the same one leaning; the range here is about a
// tone and a half either side of where it sits.
const BEND_LO = 0.92;
const BEND_HI = 1.12;
// The circling speed, in radians a second, that reaches the top of the
// bend. Roughly two turns a second, about as fast as a finger goes.
const BEND_AT = 13;

function ensureSingVoice(freq: number) {
  if (!isGameSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    if (singVoice) return;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master ?? ctx.destination);

    // Every partial, detuned in pairs, exactly as the strike builds them.
    // The offsets are kept so a bend can move the whole stack and leave the
    // beating between each pair intact.
    const oscs: OscillatorNode[] = [];
    const parts: { mult: number; off: number }[] = [];
    PARTIALS.forEach(({ mult, gain: level, detune }) => {
      const pair = detune > 0 ? [-detune / 2, detune / 2] : [0];
      pair.forEach((off) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq * mult + off;
        const g = ctx.createGain();
        g.gain.value = level / pair.length;
        osc.connect(g);
        g.connect(gain);
        osc.start();
        oscs.push(osc);
        parts.push({ mult, off });
      });
    });

    singVoice = { oscs, gain, parts };
  } catch {
    /* sound is optional */
  }
}

/**
 * Lean the held note with the speed of the circling.
 *
 * A real bowl does not do this. Rub one faster and it gets louder and the
 * upper partials come out, but the fundamental stays put. This is the one
 * place the game leaves the physics behind, because a tone the hand can
 * lean on is worth more here than one that is accurate, and slowing down to
 * bring it back is the exercise.
 *
 * setTargetAtTime rather than a ramp, so calling it every frame glides
 * instead of stepping.
 */
function setSingPitch(freq: number, ratio: number) {
  if (!singVoice) return;
  try {
    const ctx = getAudioContext();
    const v = singVoice;
    v.oscs.forEach((osc, i) => {
      // The detune stays a fixed number of hertz rather than scaling with
      // the bend, so the beating between each pair keeps its own speed.
      const { mult, off } = v.parts[i];
      osc.frequency.setTargetAtTime(freq * mult * ratio + off, ctx.currentTime, 0.06);
    });
  } catch {
    /* ignore */
  }
}

function setSingLevel(level: number) {
  if (!singVoice) return;
  try {
    const ctx = getAudioContext();
    // Short ramp, so it swells and falls instead of stepping.
    singVoice.gain.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.12);
  } catch {
    /* ignore */
  }
}

function stopSingVoice() {
  if (!singVoice) return;
  const v = singVoice;
  singVoice = null;
  try {
    const ctx = getAudioContext();
    v.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    try {
      v.oscs.forEach((o) => o.stop());
    } catch {
      /* already stopped */
    }
  }, 900);
}

// The rim is an ellipse drawn half a radius above the bowl's centre and
// squashed to a third of its height. Angles used to be measured from the
// centre, so a finger tracing the rim never got round the origin: it swung
// back and forth through the top half instead of going round, and the
// circling barely registered. Measure from the rim's own middle and undo
// the squash, and the path you can see is the path the maths sees.
const RIM_SQUASH = 0.3;

function rimCentre(b: Bowl) {
  return { x: b.x, y: b.y - b.r * 0.5 };
}

/** Angle about the rim, with the ellipse stretched back into a circle. */
function rimAngle(b: Bowl, x: number, y: number): number {
  const c = rimCentre(b);
  return Math.atan2((y - c.y) / RIM_SQUASH, x - c.x);
}

/** How far out the finger is, in the same un-squashed terms. */
function rimReach(b: Bowl, x: number, y: number): number {
  const c = rimCentre(b);
  return Math.hypot(x - c.x, (y - c.y) / RIM_SQUASH);
}

export default function BowlsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const bowlsRef = useRef<Bowl[]>([]);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef<number | null>(null);
  const activeRef = useRef(-1);
  const turnedRef = useRef(0);
  const lastMoveRef = useRef(0);
  const lastFrameRef = useRef(0);

  const [touched, setTouched] = useState(false);
  const [singing, setSinging] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(!isGameSoundEnabled());
  }, []);

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

    function layout(w: number, h: number) {
      bowlsRef.current = [{
        x: w / 2,
        y: h * 0.5,
        // One bowl got drawn as big as the space allowed, which made going
        // round it a whole-arm sweep on a phone.
        r: Math.min(w * 0.2, h * 0.14) * BOWL.scale,
        freq: BOWL.freq,
        ring: 0,
        sing: 0,
        rate: 0,
        dot: -Math.PI / 2,
        reach: 0,
      }];
    }

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
      layout(w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    function drawBowl(b: Bowl) {
      const energy = Math.max(b.ring, b.sing);
      const rimY = b.y - b.r * 0.5;
      const rimRx = b.r;
      const rimRy = b.r * 0.3;

      if (energy > 0.01) {
        const glow = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6);
        glow.addColorStop(0, `rgba(214, 189, 146, ${0.16 * energy})`);
        glow.addColorStop(1, "rgba(214, 189, 146, 0)");
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();
      }

      // The body: down from one rim edge, round the bottom, back up the other
      ctx!.beginPath();
      ctx!.moveTo(b.x - rimRx, rimY);
      ctx!.bezierCurveTo(
        b.x - rimRx, rimY + b.r * 1.6,
        b.x + rimRx, rimY + b.r * 1.6,
        b.x + rimRx, rimY,
      );
      const body = ctx!.createLinearGradient(b.x - rimRx, rimY, b.x + rimRx, rimY + b.r);
      body.addColorStop(0, `rgba(214, 189, 146, ${0.12 + energy * 0.16})`);
      body.addColorStop(0.5, `rgba(214, 189, 146, ${0.05 + energy * 0.1})`);
      body.addColorStop(1, `rgba(170, 140, 84, ${0.1 + energy * 0.14})`);
      ctx!.fillStyle = body;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(214, 189, 146, ${0.3 + energy * 0.45})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      // The opening, darker than the body so it reads as hollow
      ctx!.beginPath();
      ctx!.ellipse(b.x, rimY, rimRx, rimRy, 0, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(10, 15, 30, 0.6)";
      ctx!.fill();
      ctx!.strokeStyle = `rgba(245, 232, 198, ${0.35 + energy * 0.5})`;
      ctx!.lineWidth = 1.4;
      ctx!.stroke();

      // The ring at the width the note was picked at. It stays put while
      // you circle: it is showing which note you chose, not where your
      // finger is this instant.
      if (b.sing > 0.02 && b.reach > 4) {
        ctx!.beginPath();
        ctx!.ellipse(b.x, rimY, b.reach, b.reach * RIM_SQUASH, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(214, 189, 146, ${0.1 + b.sing * 0.14})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // A bright point travelling the rim while it is being circled
      if (b.sing > 0.02) {
        const a = reducedMotionRef.current ? -Math.PI / 2 : b.dot;
        ctx!.beginPath();
        const pr = b.reach > 4 ? b.reach : rimRx;
        ctx!.arc(b.x + Math.cos(a) * pr, rimY + Math.sin(a) * pr * RIM_SQUASH, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 246, 220, ${0.5 + b.sing * 0.5})`;
        ctx!.fill();
      }
    }

    function draw(now: number) {
      const { w, h } = sizeRef.current;
      ctx!.clearRect(0, 0, w, h);

      const dt = Math.min(0.05, (now - (lastFrameRef.current || now)) / 1000);
      lastFrameRef.current = now;

      for (const b of bowlsRef.current) {
        b.ring *= reducedMotionRef.current ? 0.93 : 0.986;
        // Singing dies away unless the finger keeps going round.
        b.sing *= 0.955;
        // So does the speed, which is what lets the note fall back down
        // when you ease off instead of hanging where you left it.
        b.rate *= 0.93;
        // The bright point keeps pace with the finger.
        b.dot += b.rate * dt;
        drawBowl(b);
      }

      const active = activeRef.current;
      if (active >= 0) {
        const b = bowlsRef.current[active];
        if (b) {
          setSingLevel(Math.min(0.26, b.sing * 0.26));
          // Slow circling sits a little under the struck note, fast a
          // little over, so the hand leans the tone rather than playing a
          // different one.
          const lean = BEND_LO + Math.min(1, b.rate / BEND_AT) * (BEND_HI - BEND_LO);
          setSingPitch(b.freq, lean);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      stopSingVoice();
    };
  }, []);

  const onDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    turnedRef.current = 0;
    lastAngleRef.current = null;
    // One bowl, so anywhere on the screen plays it. A proximity test would
    // only create a dead zone to land in by accident.
    activeRef.current = bowlsRef.current.length ? 0 : -1;
    const b = bowlsRef.current[0];
    if (!b) return;
    b.reach = rimReach(b, e.clientX, e.clientY);
    lastAngleRef.current = rimAngle(b, e.clientX, e.clientY);
    lastMoveRef.current = performance.now();
    b.dot = lastAngleRef.current;
    if (!touched) setTouched(true);
  }, [touched]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const i = activeRef.current;
    if (i < 0) return;
    const b = bowlsRef.current[i];
    const angle = rimAngle(b, e.clientX, e.clientY);
    b.reach += (rimReach(b, e.clientX, e.clientY) - b.reach) * 0.18;
    const last = lastAngleRef.current;
    lastAngleRef.current = angle;
    if (last === null) return;

    let d = angle - last;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    turnedRef.current += Math.abs(d);

    // Speed, for the pitch. The floor on dt keeps two events in the same
    // millisecond from reading as an impossible spin, and a long gap means
    // the finger stopped and started rather than covered that arc quickly.
    // The note is deliberately not recalculated here. It used to follow the
    // live radius, and a hand going round is never a perfect circle, so the
    // pitch crossed between the five notes on the wobble and the tone never
    // settled anywhere. The width you put your finger down at chooses the
    // note; after that only the speed moves it.

    const t = performance.now();
    const gap = t - lastMoveRef.current;
    lastMoveRef.current = t;
    if (gap < 140) {
      const inst = Math.abs(d) / (Math.max(8, gap) / 1000);
      b.rate += (Math.min(BEND_AT * 1.4, inst) - b.rate) * 0.3;
    }

    // Going round the rim is what makes it sing; a straight swipe does not.
    ensureSingVoice(b.freq);
    b.sing = Math.min(1, b.sing + Math.abs(d) * 0.55);
    if (b.sing > 0.25 && !singing) setSinging(true);
    if (Math.abs(d) > 0.3) haptics.subtle();
  }, [singing]);

  const onUp = useCallback(() => {
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    const i = activeRef.current;
    // Hardly turned at all: that was a tap, so strike it.
    if (wasDragging && i >= 0 && turnedRef.current < 0.35) {
      const b = bowlsRef.current[i];
      b.ring = 1;
      strike(b.freq);
      haptics.light();
    }
    lastAngleRef.current = null;
    turnedRef.current = 0;
    activeRef.current = -1;
    setSinging(false);
    stopSingVoice();
  }, []);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-midnight"
      role="application"
      aria-label="Bowls - tap to ring the bowl, or circle its rim to make it sing"
    >
      <p className="sr-only">
        One singing bowl in the middle of the screen. Tap anywhere and it
        rings. Or slowly circle a finger around it and that same note keeps
        going instead of dying away, growing while you circle and fading
        when you stop. Circling faster leans the note a little higher and
        slowing down lets it back down, about a tone and a half either way.
        It is the one sound, not several.
        This one works with your eyes closed.
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

      {muted && (
        <div className="absolute inset-x-0 bottom-36 flex flex-col items-center gap-2 px-8">
          <p className="text-center text-xs text-cream-dim/60">
            Sound is switched off, and this one is nothing without it.
          </p>
          <button
            onClick={() => {
              setGameSoundEnabled(true);
              setMuted(false);
            }}
            className="rounded-xl bg-teal/20 px-5 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30"
          >
            Turn sound on
          </button>
          <p className="text-center text-[11px] leading-relaxed text-cream-dim/30">
            If it is already on and still silent, check the ring/silent switch
            on the side of your phone.
          </p>
        </div>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-[11px] text-cream-dim/25">
        {singing
          ? "Faster leans it higher, slower lets it back down."
          : touched
            ? "Circle to keep it going. Tap to ring it again."
            : "Tap the bowl, or circle slowly around its rim."}
      </p>
    </div>
  );
}
