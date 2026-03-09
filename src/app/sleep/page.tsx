"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";
import AftercareFlow from "@/components/AftercareFlow";
import { useWakeLock } from "@/hooks/useWakeLock";

// ─── Data ───────────────────────────────────────────────────────────

type Phase = "inhale" | "hold" | "exhale";

interface BreathStep {
  phase: Phase;
  duration: number;
  label: string;
}

const breathSteps: BreathStep[] = [
  { phase: "inhale", duration: 4, label: "Inhale" },
  { phase: "hold", duration: 7, label: "Hold" },
  { phase: "exhale", duration: 8, label: "Exhale" },
];

const totalCycles = 5;

const relaxationSteps = [
  "Curl your toes tight... then release",
  "Squeeze your fists... then let go",
  "Tense your shoulders up to your ears... release",
  "Scrunch your face tight... soften",
  "Take a deep breath... let everything go",
];

// ─── Component ──────────────────────────────────────────────────────

type Screen = "intro" | "breathing" | "relaxation" | "complete";

export default function SleepPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");

  // Breathing state
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Relaxation state
  const [relaxIndex, setRelaxIndex] = useState(0);
  const relaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake lock — active during breathing and relaxation
  useWakeLock(screen === "breathing" || screen === "relaxation");

  const currentStep = breathSteps[currentStepIndex] ?? null;

  // ─── Breathing timer ──────────────────────────────────────────

  const advanceStep = useCallback(() => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < breathSteps.length) {
      setCurrentStepIndex(nextStepIndex);
      setSecondsLeft(breathSteps[nextStepIndex].duration);
      elapsedRef.current = 0;
    } else {
      const nextCycle = currentCycle + 1;
      if (nextCycle < totalCycles) {
        setCurrentCycle(nextCycle);
        setCurrentStepIndex(0);
        setSecondsLeft(breathSteps[0].duration);
        elapsedRef.current = 0;
      } else {
        setScreen("relaxation");
      }
    }
  }, [currentStepIndex, currentCycle]);

  useEffect(() => {
    if (screen !== "breathing" || !currentStep) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const duration = currentStep.duration;
      const remaining = Math.max(0, duration - elapsedRef.current);

      setSecondsLeft(Math.ceil(remaining));

      const fraction = Math.min(1, elapsedRef.current / duration);
      if (currentStep.phase === "inhale") {
        setOrbProgress(fraction);
      } else if (currentStep.phase === "exhale") {
        setOrbProgress(1 - fraction);
      }

      if (remaining <= 0) {
        advanceStep();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, currentStep, advanceStep]);

  // ─── Relaxation auto-advance timer ────────────────────────────

  useEffect(() => {
    if (screen !== "relaxation") return;

    relaxTimerRef.current = setTimeout(() => {
      if (relaxIndex < relaxationSteps.length - 1) {
        setRelaxIndex((i) => i + 1);
      } else {
        setScreen("complete");
      }
    }, 8000);

    return () => {
      if (relaxTimerRef.current) clearTimeout(relaxTimerRef.current);
    };
  }, [screen, relaxIndex]);

  // ─── Handlers ─────────────────────────────────────────────────

  function startSequence() {
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setSecondsLeft(breathSteps[0].duration);
    setOrbProgress(0);
    elapsedRef.current = 0;
    setRelaxIndex(0);
    setScreen("breathing");
  }

  function advanceRelaxation() {
    if (relaxTimerRef.current) clearTimeout(relaxTimerRef.current);
    if (relaxIndex < relaxationSteps.length - 1) {
      setRelaxIndex((i) => i + 1);
    } else {
      setScreen("complete");
    }
  }

  // ─── INTRO ────────────────────────────────────────────────────

  if (screen === "intro") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>

          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-light tracking-tight text-cream/70">
              Can&apos;t sleep?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-cream-dim/50">
              Let&apos;s slow everything down.
            </p>

            <button
              onClick={startSequence}
              className="mt-10 w-full max-w-[200px] rounded-2xl bg-teal/15 py-4 text-base font-medium text-teal-soft/70 transition-all duration-300 hover:bg-teal/20 active:scale-[0.98]"
            >
              Begin
            </button>

            <p className="mt-8 text-xs text-cream-dim/30">
              Turn on binaural beats for deeper relaxation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── BREATHING ────────────────────────────────────────────────

  if (screen === "breathing" && currentStep) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        {/* Cycle indicator */}
        <div className="fixed left-0 right-0 top-8 flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalCycles }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < currentCycle
                    ? "w-4 bg-teal-soft/30"
                    : i === currentCycle
                      ? "w-6 bg-teal-soft/60"
                      : "w-3 bg-slate-blue/30"
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
              className="text-3xl font-light tracking-wide text-cream/60 transition-opacity duration-500"
              key={`${currentCycle}-${currentStepIndex}`}
            >
              {currentStep.label}
            </p>
            <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/40">
              {secondsLeft}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── RELAXATION ───────────────────────────────────────────────

  if (screen === "relaxation") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <p className="text-xl font-light leading-relaxed text-cream/60">
            {relaxationSteps[relaxIndex]}
          </p>

          <button
            onClick={advanceRelaxation}
            className="mt-10 rounded-2xl bg-teal/10 px-8 py-3 text-sm font-medium text-teal-soft/50 transition-all duration-300 hover:bg-teal/15 active:scale-[0.98]"
          >
            Ready
          </button>

          {/* Step dots */}
          <div className="mt-8 flex items-center gap-2">
            {relaxationSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < relaxIndex
                    ? "w-3 bg-teal-soft/30"
                    : i === relaxIndex
                      ? "w-5 bg-teal-soft/50"
                      : "w-2 bg-slate-blue/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── COMPLETE ─────────────────────────────────────────────────

  if (screen === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique="Sleep Sequence"
          onDone={() => router.push("/")}
        />
      </div>
    );
  }

  return null;
}
