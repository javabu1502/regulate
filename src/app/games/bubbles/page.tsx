"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { isGameSoundEnabled } from "@/lib/game-sound";

// ─── Colors ─────────────────────────────────────────────────────────

const BUBBLE_COLORS = [
  { r: 94, g: 234, b: 212 },   // teal #5eead4
  { r: 244, g: 132, b: 95 },   // coral #f4845f
  { r: 196, g: 181, b: 253 },  // lavender #c4b5fd
  { r: 252, g: 211, b: 77 },   // candle #fcd34d
  { r: 153, g: 246, b: 228 },  // teal-soft #99f6e4
];

// ─── Types ──────────────────────────────────────────────────────────

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;        // horizontal sway amplitude
  driftSpeed: number;   // how fast it sways
  driftOffset: number;  // phase offset for sway
  color: { r: number; g: number; b: number };
  opacity: number;
  alive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  life: number;
  maxLife: number;
}

interface PopAnimation {
  x: number;
  y: number;
  radius: number;
  color: { r: number; g: number; b: number };
  progress: number; // 0..1
  particles: Particle[];
}

// ─── Audio ──────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playPopSound() {
  try {
    if (!isGameSoundEnabled()) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;

    // Fidget toy popper sound — sharp membrane snap/thock
    // 1) Initial click: very short noise burst (membrane snap)
    const clickLen = Math.floor(ctx.sampleRate * 0.008);
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) {
      // Sharp impulse that decays instantly
      clickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickLen, 8);
    }
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.5, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    clickSrc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickSrc.start(t);

    // 2) Low thock: resonant membrane pop
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    const baseFreq = 150 + Math.random() * 80;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.04);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);

    // 3) Subtle higher click for the "snap" feel
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = "square";
    snap.frequency.setValueAtTime(800 + Math.random() * 200, t);
    snap.frequency.exponentialRampToValueAtTime(200, t + 0.015);
    snapGain.gain.setValueAtTime(0.12, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(t);
    snap.stop(t + 0.025);
  } catch {
    // Audio not available
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

let nextId = 0;
let spawnZone = 0; // Rotate through zones to spread bubbles across width

function createBubble(canvasW: number, canvasH: number, fromBottom = true): Bubble {
  const radius = 18 + Math.random() * 30;
  // Divide screen into 5 zones, cycle through them with some randomness
  const zones = 5;
  const zoneWidth = (canvasW - radius * 2) / zones;
  const zone = spawnZone % zones;
  spawnZone++;
  const zoneX = radius + zone * zoneWidth + Math.random() * zoneWidth;
  return {
    id: nextId++,
    x: Math.max(radius, Math.min(canvasW - radius, zoneX)),
    y: fromBottom ? canvasH + radius * 0.3 : Math.random() * canvasH,
    radius,
    speed: 0.6 + Math.random() * 1.0,
    drift: 10 + Math.random() * 20,
    driftSpeed: 0.3 + Math.random() * 0.5,
    driftOffset: Math.random() * Math.PI * 2,
    color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
    opacity: 0.25 + Math.random() * 0.3,
    alive: true,
  };
}

function createPopParticles(
  x: number,
  y: number,
  color: { r: number; g: number; b: number },
  count: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 2.5,
      color,
      opacity: 0.7,
      life: 0,
      maxLife: 30 + Math.random() * 20,
    });
  }
  return particles;
}

// ─── Check-in messages ──────────────────────────────────────────────

const CHECK_IN_MESSAGES = [
  "Drop your shoulders.",
  "Unclench your jaw.",
  "Take a deep breath.",
  "Wiggle your toes.",
  "You're doing good.",
  "Soften your face.",
  "Breathe out slow.",
  "Relax your hands.",
  "Stay as long as you want.",
  "No rush.",
];

// ─── Component ──────────────────────────────────────────────────────

const TARGET_BUBBLE_COUNT = 20;

export default function BubblePopPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const popsRef = useRef<PopAnimation[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [showHelp, setShowHelp] = useState(false);
  const [popCount, setPopCount] = useState(0);
  const popCountRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(0);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const checkInIndexRef = useRef(0);
  const [speedLabel, setSpeedLabel] = useState<"Slow" | "Medium" | "Fast">("Medium");
  const speedMultiplierRef = useRef(1.0);

  // ── Timer + check-in every 5 minutes ─────────────────────────

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      // Show check-in every 5 minutes (300s)
      if (secs > 0 && secs % 300 === 0) {
        const msg = CHECK_IN_MESSAGES[checkInIndexRef.current % CHECK_IN_MESSAGES.length];
        checkInIndexRef.current++;
        setCheckIn(msg);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Initialize canvas and animation ────────────────────────────

  const initBubbles = useCallback((w: number, h: number) => {
    bubblesRef.current = [];
    for (let i = 0; i < TARGET_BUBBLE_COUNT; i++) {
      bubblesRef.current.push(createBubble(w, h, false));
    }
  }, []);

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
    initBubbles(window.innerWidth, window.innerHeight);

    function handleResize() {
      resize();
      // Reinitialize bubbles on resize so they spread across new width
      initBubbles(window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", handleResize);

    // ── Animation loop ───────────────────────────────────────────

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Subtle background gradient for atmosphere
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0a0f1e");
      bgGrad.addColorStop(0.5, "#0d1326");
      bgGrad.addColorStop(1, "#0a1020");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      timeRef.current += 1;

      const bubbles = bubblesRef.current;
      const pops = popsRef.current;

      // Update and draw bubbles
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (!b.alive) {
          bubbles.splice(i, 1);
          continue;
        }

        b.y -= b.speed * speedMultiplierRef.current;
        const sway = Math.sin(timeRef.current * 0.02 * b.driftSpeed + b.driftOffset) * b.drift * 0.02;
        b.x += sway;

        // Remove if floated off top
        if (b.y < -b.radius * 2) {
          bubbles.splice(i, 1);
          continue;
        }

        // Draw glow
        const glowGrad = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 1.6);
        glowGrad.addColorStop(0, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.opacity * 0.15})`);
        glowGrad.addColorStop(1, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, 0)`);
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.radius * 1.6, 0, Math.PI * 2);
        ctx!.fillStyle = glowGrad;
        ctx!.fill();

        // Draw bubble
        const grad = ctx!.createRadialGradient(
          b.x - b.radius * 0.3,
          b.y - b.radius * 0.3,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius,
        );
        grad.addColorStop(0, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.opacity * 0.9})`);
        grad.addColorStop(0.7, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.opacity * 0.4})`);
        grad.addColorStop(1, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.opacity * 0.1})`);

        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();

        // Highlight
        ctx!.beginPath();
        ctx!.arc(b.x - b.radius * 0.25, b.y - b.radius * 0.25, b.radius * 0.3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.opacity * 0.35})`;
        ctx!.fill();
      }

      // Replenish bubbles — spawn 2-3 at once when count drops low
      if (bubbles.length < TARGET_BUBBLE_COUNT) {
        const deficit = TARGET_BUBBLE_COUNT - bubbles.length;
        const spawnCount = Math.min(deficit, deficit >= 3 ? 3 : 2);
        for (let s = 0; s < spawnCount; s++) {
          bubbles.push(createBubble(w, h, true));
        }
      }

      // Update and draw pop animations
      for (let i = pops.length - 1; i >= 0; i--) {
        const pop = pops[i];
        pop.progress += 0.04;

        if (pop.progress >= 1) {
          pops.splice(i, 1);
          continue;
        }

        // Expanding ring
        if (pop.progress < 0.5) {
          const ringProgress = pop.progress / 0.5;
          const ringRadius = pop.radius * (1 + ringProgress * 0.5);
          const ringOpacity = 0.3 * (1 - ringProgress);
          ctx!.beginPath();
          ctx!.arc(pop.x, pop.y, ringRadius, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${pop.color.r}, ${pop.color.g}, ${pop.color.b}, ${ringOpacity})`;
          ctx!.lineWidth = 2 * (1 - ringProgress);
          ctx!.stroke();
        }

        // Particles
        for (const p of pop.particles) {
          p.life += 1;
          if (p.life > p.maxLife) continue;

          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.02; // slight gravity
          p.vx *= 0.98;
          p.vy *= 0.98;

          const lifeRatio = 1 - p.life / p.maxLife;
          const pOpacity = p.opacity * lifeRatio;
          const pRadius = p.radius * lifeRatio;

          ctx!.beginPath();
          ctx!.arc(p.x, p.y, pRadius, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${pOpacity})`;
          ctx!.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [initBubbles]);

  // ── Handle tap/click ───────────────────────────────────────────

  const handlePop = useCallback((clientX: number, clientY: number) => {
    const bubbles = bubblesRef.current;

    // Find the topmost (last drawn) bubble under the tap
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const dx = clientX - b.x;
      const dy = clientY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= b.radius * 1.2) {
        // Pop it
        b.alive = false;
        playPopSound();
        haptics.tap();
        popCountRef.current += 1;
        setPopCount(popCountRef.current);

        // Create pop animation
        popsRef.current.push({
          x: b.x,
          y: b.y,
          radius: b.radius,
          color: b.color,
          progress: 0,
          particles: createPopParticles(b.x, b.y, b.color, 8),
        });

        break; // Only pop one bubble per tap
      }
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      handlePop(e.clientX, e.clientY);
    },
    [handlePop],
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-midnight" role="application" aria-label="Bubble pop game - tap bubbles to pop them">
      <style>{`
        @keyframes checkInEnter {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-check-in-enter { animation: checkInEnter 0.4s ease-out; }
      `}</style>
      <p className="sr-only">Colorful bubbles float upward. Tap or click on them to pop them.</p>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
      />

      {/* Top bar — back button + stats */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <Link
          href="/games"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-deep/60 px-3 py-1.5 text-sm text-cream-dim backdrop-blur-sm transition-colors hover:text-cream"
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

        {/* Pop count, timer, speed */}
        <div className="flex items-center gap-2">
          <div className="pointer-events-none flex items-center gap-3 rounded-full bg-deep/60 px-3.5 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm">
            <span>{popCount} popped</span>
            <span className="text-cream-dim/20">·</span>
            <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
          </div>
          <button
            onClick={() => {
              setSpeedLabel((prev) => {
                if (prev === "Slow") {
                  speedMultiplierRef.current = 1.0;
                  return "Medium";
                }
                if (prev === "Medium") {
                  speedMultiplierRef.current = 1.8;
                  return "Fast";
                }
                speedMultiplierRef.current = 0.5;
                return "Slow";
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto rounded-full bg-deep/60 px-3 py-1.5 text-xs text-cream-dim/60 backdrop-blur-sm transition-colors hover:text-cream-dim"
          >
            {speedLabel}
          </button>
        </div>
      </div>

      {/* Check-in bubble — poppable */}
      {checkIn && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <button
            className="pointer-events-auto animate-check-in-enter flex max-w-[260px] flex-col items-center gap-2 rounded-3xl border border-teal/25 bg-deep/80 px-6 py-5 text-center backdrop-blur-md transition-transform active:scale-90"
            onClick={() => {
              playPopSound();
              haptics.tap();
              setCheckIn(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-sm leading-relaxed text-cream">{checkIn}</p>
            <p className="text-[11px] text-cream-dim/40">tap to pop</p>
          </button>
        </div>
      )}

      {/* How this helps - collapsible at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-5">
        <div className="pointer-events-auto w-full max-w-md">
          <button
            onClick={() => setShowHelp(!showHelp)}
            onPointerDown={(e) => e.stopPropagation()}
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
            <div className="rounded-2xl border border-teal/15 bg-deep/80 p-4 text-sm leading-relaxed text-cream-dim backdrop-blur-sm">
              Popping bubbles gives your brain a simple, predictable task. When
              anxiety makes everything feel chaotic, this kind of focused,
              repetitive action can help settle your nervous system.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
