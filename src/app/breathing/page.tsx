"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";

// ─── Pattern definitions ────────────────────────────────────────────

type Phase = "inhale" | "hold" | "exhale" | "rest";

interface BreathStep {
  phase: Phase;
  duration: number; // seconds
  label: string;
}

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  useCase: string;
  steps: BreathStep[];
}

const patterns: BreathPattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Equal inhale, hold, exhale, hold",
    useCase: "Focus & calm",
    steps: [
      { phase: "inhale", duration: 4, label: "Inhale" },
      { phase: "hold", duration: 4, label: "Hold" },
      { phase: "exhale", duration: 4, label: "Exhale" },
      { phase: "hold", duration: 4, label: "Hold" },
    ],
  },
  {
    id: "478",
    name: "4-7-8 Breathing",
    description: "Deep inhale, long hold, slow exhale",
    useCase: "Sleep & deep anxiety relief",
    steps: [
      { phase: "inhale", duration: 4, label: "Inhale" },
      { phase: "hold", duration: 7, label: "Hold" },
      { phase: "exhale", duration: 8, label: "Exhale" },
    ],
  },
  {
    id: "sigh",
    name: "Physiological Sigh",
    description: "Double inhale, then long exhale",
    useCase: "Fastest nervous system reset",
    steps: [
      { phase: "inhale", duration: 2, label: "Inhale" },
      { phase: "inhale", duration: 1, label: "Sip in more" },
      { phase: "exhale", duration: 6, label: "Long exhale" },
      { phase: "rest", duration: 1, label: "Rest" },
    ],
  },
  {
    id: "coherence",
    name: "Coherence Breathing",
    description: "Balanced rhythm, 5 seconds each",
    useCase: "Heart rate variability",
    steps: [
      { phase: "inhale", duration: 5, label: "Inhale" },
      { phase: "exhale", duration: 5, label: "Exhale" },
    ],
  },
];

const cycleOptions = [3, 5, 10];

// ─── Pattern card icons (SVG-based, no emoji clutter) ───────────────

function PatternIcon({ id }: { id: string }) {
  const base = "w-8 h-8 text-teal-soft";
  switch (id) {
    case "box":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <rect
            x="6"
            y="6"
            width="20"
            height="20"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "478":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path
            d="M6 24C6 24 10 8 16 8C22 8 26 24 26 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "sigh":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path
            d="M4 20L10 12L14 15L20 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 8L28 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "coherence":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path
            d="M4 16C4 16 8 8 12 8C16 8 16 24 20 24C24 24 28 16 28 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Screens ────────────────────────────────────────────────────────

type Screen = "select" | "configure" | "session" | "complete";

export default function BreathingPage() {
  const [screen, setScreen] = useState<Screen>("select");
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern | null>(
    null
  );
  const [totalCycles, setTotalCycles] = useState(5);

  // Session state
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const currentStep = selectedPattern?.steps[currentStepIndex] ?? null;

  // ─── Session timer ──────────────────────────────────────────────

  const advanceStep = useCallback(() => {
    if (!selectedPattern) return;

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < selectedPattern.steps.length) {
      // Next phase in current cycle
      setCurrentStepIndex(nextStepIndex);
      setSecondsLeft(selectedPattern.steps[nextStepIndex].duration);
      elapsedRef.current = 0;
    } else {
      // Cycle complete
      const nextCycle = currentCycle + 1;
      if (nextCycle < totalCycles) {
        setCurrentCycle(nextCycle);
        setCurrentStepIndex(0);
        setSecondsLeft(selectedPattern.steps[0].duration);
        elapsedRef.current = 0;
      } else {
        // All cycles complete
        setScreen("complete");
      }
    }
  }, [selectedPattern, currentStepIndex, currentCycle, totalCycles]);

  useEffect(() => {
    if (screen !== "session" || !currentStep || isPaused) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const duration = currentStep.duration;
      const remaining = Math.max(0, duration - elapsedRef.current);

      setSecondsLeft(Math.ceil(remaining));

      // Calculate orb progress based on phase
      const fraction = Math.min(1, elapsedRef.current / duration);
      if (currentStep.phase === "inhale") {
        setOrbProgress(fraction);
      } else if (currentStep.phase === "exhale") {
        setOrbProgress(1 - fraction);
      }
      // hold/rest: orbProgress stays where it is

      if (remaining <= 0) {
        advanceStep();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, currentStep, isPaused, advanceStep]);

  // ─── Start session ─────────────────────────────────────────────

  function startSession() {
    if (!selectedPattern) return;
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setSecondsLeft(selectedPattern.steps[0].duration);
    setOrbProgress(0);
    setIsPaused(false);
    elapsedRef.current = 0;
    setScreen("session");
  }

  function resetToSelect() {
    setScreen("select");
    setSelectedPattern(null);
    setIsPaused(false);
  }

  // ─── Back button (context-aware) ──────────────────────────────

  function BackButton({
    onClick,
    label,
  }: {
    onClick: () => void;
    label: string;
  }) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
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
        {label}
      </button>
    );
  }

  // ─── SELECT SCREEN ────────────────────────────────────────────

  if (screen === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
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
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-cream">
              Guided Breathing
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Choose a pattern that feels right.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {patterns.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPattern(p);
                  setScreen("configure");
                }}
                className="group w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/80">
                    <PatternIcon id={p.id} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-medium text-cream">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-cream-dim">
                      {p.description}
                    </p>
                    <span className="mt-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-xs text-teal-soft">
                      {p.useCase}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIGURE SCREEN ─────────────────────────────────────────

  if (screen === "configure" && selectedPattern) {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={resetToSelect} label="Patterns" />

          <header className="mb-10 mt-6 text-center">
            <div className="mb-3 flex justify-center">
              <PatternIcon id={selectedPattern.id} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">
              {selectedPattern.name}
            </h1>
            <p className="mt-2 text-sm text-cream-dim">
              {selectedPattern.description}
            </p>

            {/* Phase preview */}
            <div className="mx-auto mt-4 flex items-center justify-center gap-1.5">
              {selectedPattern.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="rounded-md bg-slate-blue/60 px-2 py-0.5 text-xs text-cream-dim">
                    {step.label} {step.duration}s
                  </span>
                  {i < selectedPattern.steps.length - 1 && (
                    <span className="text-cream-dim/30">→</span>
                  )}
                </div>
              ))}
            </div>
          </header>

          {/* Cycle selector */}
          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-6 backdrop-blur-sm">
            <p className="mb-4 text-center text-sm text-cream-dim">
              How many cycles?
            </p>
            <div className="flex justify-center gap-3">
              {cycleOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalCycles(n)}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border text-lg font-medium transition-all duration-200 ${
                    totalCycles === n
                      ? "border-teal/50 bg-teal/15 text-teal-soft shadow-md shadow-teal/10"
                      : "border-slate-blue/50 bg-slate-blue/30 text-cream-dim hover:border-teal/30 hover:text-cream"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Duration estimate */}
            <p className="mt-4 text-center text-xs text-cream-dim/60">
              ~
              {Math.round(
                (selectedPattern.steps.reduce((a, s) => a + s.duration, 0) *
                  totalCycles) /
                  60
              )}{" "}
              min
            </p>
          </div>

          {/* Start button */}
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

  // ─── SESSION SCREEN ───────────────────────────────────────────

  if (screen === "session" && selectedPattern && currentStep) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        {/* Cycle indicator — top */}
        <div className="fixed left-0 right-0 top-8 flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalCycles }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < currentCycle
                    ? "w-4 bg-teal-soft/50"
                    : i === currentCycle
                      ? "w-6 bg-teal-soft"
                      : "w-3 bg-slate-blue/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Orb + phase */}
        <div className="flex flex-col items-center">
          <BreathingOrb progress={orbProgress} phase={currentStep.phase} />

          <div className="mt-12 text-center">
            <p
              className="text-3xl font-light tracking-wide text-cream transition-opacity duration-500"
              key={`${currentCycle}-${currentStepIndex}`}
            >
              {currentStep.label}
            </p>
            <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/70">
              {secondsLeft}
            </p>
          </div>
        </div>

        {/* Controls — bottom */}
        <div className="fixed bottom-10 flex items-center gap-6">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-teal/20 bg-deep/80 text-cream-dim transition-colors hover:border-teal/40 hover:text-cream"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M5 3L15 9L5 15V3Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect
                  x="4"
                  y="3"
                  width="3.5"
                  height="12"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="10.5"
                  y="3"
                  width="3.5"
                  height="12"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <button
            onClick={resetToSelect}
            className="text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
          >
            End session
          </button>
        </div>

        {/* Paused overlay */}
        {isPaused && (
          <div className="fixed inset-0 flex items-center justify-center bg-midnight/60 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg text-cream/80">Paused</p>
              <button
                onClick={() => setIsPaused(false)}
                className="mt-4 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30"
              >
                Resume
              </button>
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

          <h2 className="text-2xl font-light tracking-tight text-cream">
            Well done.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Notice how you feel right now.
            <br />
            Let that settle for a moment.
          </p>

          <div className="mt-3 text-xs text-cream-dim/40">
            {selectedPattern?.name} · {totalCycles} cycles
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={resetToSelect}
              className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Try another pattern
            </button>
            <Link
              href="/"
              className="text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
