"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────

type Screen = "select" | "configure" | "session" | "complete";
type Technique = "tapping" | "swaying";
type Speed = "slow" | "medium" | "fast";

const speedMs: Record<Speed, number> = { slow: 1000, medium: 600, fast: 400 };
const durationOptions = [2, 5, 10]; // minutes

// ─── Web Audio helper ───────────────────────────────────────────────

function playTone(ctx: AudioContext, pan: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();

  osc.type = "sine";
  osc.frequency.value = pan < 0 ? 280 : 320;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  panner.pan.value = pan;

  osc.connect(gain).connect(panner).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// ─── Component ──────────────────────────────────────────────────────

export default function SomaticPage() {
  const [screen, setScreen] = useState<Screen>("select");
  const [technique, setTechnique] = useState<Technique>("tapping");
  const [speed, setSpeed] = useState<Speed>("medium");
  const [duration, setDuration] = useState(5);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Session state
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Swaying state
  const [swayPosition, setSwayPosition] = useState(0);

  const totalSeconds = duration * 60;

  // ─── Cleanup ────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
    intervalRef.current = null;
    tapIntervalRef.current = null;
  }, []);

  useEffect(() => {
    return stopSession;
  }, [stopSession]);

  // ─── Tapping session ───────────────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || technique !== "tapping" || isPaused) {
      if (tapIntervalRef.current) {
        clearInterval(tapIntervalRef.current);
        tapIntervalRef.current = null;
      }
      return;
    }

    const ms = speedMs[speed];

    tapIntervalRef.current = setInterval(() => {
      setActiveSide((prev) => {
        const next = prev === "left" ? "right" : "left";

        // Haptic
        if (hapticEnabled && navigator.vibrate) {
          navigator.vibrate(30);
        }

        // Audio
        if (audioEnabled) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          playTone(audioCtxRef.current, next === "left" ? -0.8 : 0.8);
        }

        return next;
      });
    }, ms);

    return () => {
      if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
    };
  }, [screen, technique, speed, isPaused, audioEnabled, hapticEnabled]);

  // ─── Swaying session ──────────────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || technique !== "swaying" || isPaused) return;

    let frame: number;
    const start = performance.now();

    const animate = (now: number) => {
      const t = (now - start) / 1000;
      setSwayPosition(Math.sin(t * 0.8) * 100);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [screen, technique, isPaused]);

  // ─── Timer ────────────────────────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= totalSeconds) {
          stopSession();
          setScreen("complete");
          return prev + 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [screen, isPaused, totalSeconds, stopSession]);

  // ─── Helpers ──────────────────────────────────────────────────

  function startSession() {
    setElapsed(0);
    setActiveSide("left");
    setIsPaused(false);
    setScreen("session");
  }

  function resetToSelect() {
    stopSession();
    setScreen("select");
    setIsPaused(false);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ─── Back button ──────────────────────────────────────────────

  function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>
    );
  }

  // ─── SELECT SCREEN ────────────────────────────────────────────

  if (screen === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 text-4xl">🌊</div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Somatic Movement</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Move gently to release what your body is holding.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setTechnique("tapping"); setScreen("configure"); }}
              className="group w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/80">
                  <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
                    <path d="M7 12L7 4M17 12L17 4M5 8h4M15 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M4 16c2-2 4-3 8-3s6 1 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-cream">Bilateral Tapping</h3>
                  <p className="mt-0.5 text-sm text-cream-dim">Butterfly hug — alternating left/right rhythm</p>
                  <span className="mt-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-xs text-teal-soft">
                    Calm & process
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setTechnique("swaying"); setScreen("configure"); }}
              className="group w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/80">
                  <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20C8 12 10 8 12 8C14 8 16 12 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-cream">Gentle Swaying</h3>
                  <p className="mt-0.5 text-sm text-cream-dim">Side-to-side rhythmic movement</p>
                  <span className="mt-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-xs text-teal-soft">
                    Ground & soothe
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIGURE SCREEN ─────────────────────────────────────────

  if (screen === "configure") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={resetToSelect} label="Techniques" />

          <header className="mb-8 mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-cream">
              {technique === "tapping" ? "Bilateral Tapping" : "Gentle Swaying"}
            </h1>
            <p className="mt-2 text-sm text-cream-dim">
              {technique === "tapping"
                ? "Cross your arms over your chest. Tap left, then right, in rhythm."
                : "Stand or sit comfortably. Let your body sway with the rhythm."}
            </p>
          </header>

          <div className="flex flex-col gap-4">
            {/* Duration */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-center text-sm text-cream-dim">Duration</p>
              <div className="flex justify-center gap-3">
                {durationOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => setDuration(n)}
                    className={`flex h-14 w-16 items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200 ${
                      duration === n
                        ? "border-teal/50 bg-teal/15 text-teal-soft shadow-md shadow-teal/10"
                        : "border-slate-blue/50 bg-slate-blue/30 text-cream-dim hover:border-teal/30 hover:text-cream"
                    }`}
                  >
                    {n} min
                  </button>
                ))}
              </div>
            </div>

            {/* Speed (tapping only) */}
            {technique === "tapping" && (
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
                <p className="mb-3 text-center text-sm text-cream-dim">Rhythm</p>
                <div className="flex justify-center gap-3">
                  {(["slow", "medium", "fast"] as Speed[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`flex h-14 flex-1 items-center justify-center rounded-xl border text-sm font-medium capitalize transition-all duration-200 ${
                        speed === s
                          ? "border-teal/50 bg-teal/15 text-teal-soft shadow-md shadow-teal/10"
                          : "border-slate-blue/50 bg-slate-blue/30 text-cream-dim hover:border-teal/30 hover:text-cream"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toggles (tapping only) */}
            {technique === "tapping" && (
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-cream-dim">Haptic feedback</span>
                  <button
                    onClick={() => setHapticEnabled(!hapticEnabled)}
                    className={`h-7 w-12 rounded-full transition-colors ${hapticEnabled ? "bg-teal/40" : "bg-slate-blue/50"}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-cream transition-transform ${hapticEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between py-1">
                  <span className="text-sm text-cream-dim">Audio tones</span>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`h-7 w-12 rounded-full transition-colors ${audioEnabled ? "bg-teal/40" : "bg-slate-blue/50"}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-cream transition-transform ${audioEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={startSession}
            className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft backdrop-blur-sm transition-all duration-300 hover:bg-teal/30 hover:shadow-lg hover:shadow-teal/10 active:scale-[0.98]"
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  // ─── SESSION: TAPPING ─────────────────────────────────────────

  if (screen === "session" && technique === "tapping") {
    const remaining = totalSeconds - elapsed;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-0">
        {/* Timer at top */}
        <div className="fixed left-0 right-0 top-8 text-center">
          <p className="font-mono text-sm text-cream-dim/60">{formatTime(remaining)}</p>
        </div>

        {/* Tap zones */}
        <div className="flex h-screen w-full">
          {/* Left zone */}
          <button
            className={`flex flex-1 items-center justify-center transition-all duration-200 ${
              activeSide === "left" ? "bg-teal/12" : "bg-transparent"
            }`}
            onClick={() => {
              setActiveSide("left");
              if (hapticEnabled && navigator.vibrate) navigator.vibrate(30);
              if (audioEnabled) {
                if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
                playTone(audioCtxRef.current, -0.8);
              }
            }}
          >
            <div
              className={`h-24 w-24 rounded-full transition-all duration-200 ${
                activeSide === "left"
                  ? "scale-110 bg-teal/30 shadow-lg shadow-teal/20"
                  : "scale-90 bg-slate-blue/30"
              }`}
            />
          </button>

          {/* Center divider */}
          <div className="flex w-px items-center">
            <div className="h-32 w-px bg-slate-blue/20" />
          </div>

          {/* Right zone */}
          <button
            className={`flex flex-1 items-center justify-center transition-all duration-200 ${
              activeSide === "right" ? "bg-candle/8" : "bg-transparent"
            }`}
            onClick={() => {
              setActiveSide("right");
              if (hapticEnabled && navigator.vibrate) navigator.vibrate(30);
              if (audioEnabled) {
                if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
                playTone(audioCtxRef.current, 0.8);
              }
            }}
          >
            <div
              className={`h-24 w-24 rounded-full transition-all duration-200 ${
                activeSide === "right"
                  ? "scale-110 bg-candle/25 shadow-lg shadow-candle/15"
                  : "scale-90 bg-slate-blue/30"
              }`}
            />
          </button>
        </div>

        {/* Bottom text */}
        <div className="fixed bottom-16 left-0 right-0 text-center">
          <p className="text-sm text-cream-dim/60">Tap along with the rhythm</p>
        </div>

        {/* Controls */}
        <div className="fixed bottom-6 flex items-center gap-6">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-teal/20 bg-deep/80 text-cream-dim transition-colors hover:text-cream"
          >
            {isPaused ? (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M5 3L15 9L5 15V3Z" fill="currentColor" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
            )}
          </button>
          <button onClick={resetToSelect} className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
            End
          </button>
        </div>

        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg text-cream/80">Paused</p>
              <button onClick={() => setIsPaused(false)} className="mt-4 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30">
                Resume
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── SESSION: SWAYING ─────────────────────────────────────────

  if (screen === "session" && technique === "swaying") {
    const remaining = totalSeconds - elapsed;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        {/* Timer at top */}
        <div className="fixed left-0 right-0 top-8 text-center">
          <p className="font-mono text-sm text-cream-dim/60">{formatTime(remaining)}</p>
        </div>

        {/* Swaying shape */}
        <div className="flex flex-col items-center">
          <div className="relative h-[300px] w-[300px]">
            {/* Background glow */}
            <div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle at ${50 + swayPosition * 0.15}% 50%, rgba(42,107,110,0.15) 0%, transparent 70%)`,
                transition: "background 0.1s ease-out",
              }}
            />
            {/* Main swaying orb */}
            <div
              className="absolute left-1/2 top-1/2 h-32 w-32 rounded-full"
              style={{
                transform: `translate(calc(-50% + ${swayPosition * 0.6}px), -50%)`,
                background: "radial-gradient(circle at 40% 35%, rgba(90,171,174,0.4) 0%, rgba(42,107,110,0.25) 50%, rgba(26,42,74,0.4) 100%)",
                boxShadow: `0 0 40px rgba(42,107,110,0.2), 0 0 80px rgba(42,107,110,0.1)`,
                transition: "transform 0.05s linear",
              }}
            />
            {/* Trailing ghost */}
            <div
              className="absolute left-1/2 top-1/2 h-32 w-32 rounded-full opacity-30 blur-md"
              style={{
                transform: `translate(calc(-50% + ${swayPosition * 0.3}px), -50%)`,
                background: "radial-gradient(circle, rgba(232,184,109,0.15) 0%, transparent 70%)",
                transition: "transform 0.15s ease-out",
              }}
            />
          </div>

          <p className="mt-4 text-lg font-light text-cream/80">Sway with the rhythm</p>
          <p className="mt-2 text-sm text-cream-dim/60">Feel your feet. Let your body move.</p>
        </div>

        {/* Controls */}
        <div className="fixed bottom-10 flex items-center gap-6">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-teal/20 bg-deep/80 text-cream-dim transition-colors hover:text-cream"
          >
            {isPaused ? (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M5 3L15 9L5 15V3Z" fill="currentColor" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
            )}
          </button>
          <button onClick={resetToSelect} className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">End</button>
        </div>

        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg text-cream/80">Paused</p>
              <button onClick={() => setIsPaused(false)} className="mt-4 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30">Resume</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── COMPLETE SCREEN ──────────────────────────────────────────

  if (screen === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <div className="h-12 w-12 rounded-full bg-teal/15" />
          </div>

          <h2 className="text-2xl font-light tracking-tight text-cream">Well done.</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Notice what&apos;s shifted in your body.
            <br />
            Let that settle.
          </p>

          <div className="mt-3 text-xs text-cream-dim/40">
            {technique === "tapping" ? "Bilateral Tapping" : "Gentle Swaying"} · {duration} min
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={resetToSelect}
              className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Try another technique
            </button>
            <Link href="/" className="text-sm text-cream-dim/50 transition-colors hover:text-cream-dim">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
