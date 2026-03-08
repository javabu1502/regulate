"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import BreathingOrb from "./BreathingOrb";

// ─── Physiological sigh pattern ─────────────────────────────────────

type Phase = "inhale" | "hold" | "exhale" | "rest";

interface BreathStep {
  phase: Phase;
  duration: number;
  label: string;
}

const sighSteps: BreathStep[] = [
  { phase: "inhale", duration: 2, label: "Inhale" },
  { phase: "inhale", duration: 1, label: "Sip in more" },
  { phase: "exhale", duration: 6, label: "Long exhale" },
  { phase: "rest", duration: 1, label: "Rest" },
];

const SOS_CYCLES = 3;

// ─── 5-4-3-2-1 Grounding data ──────────────────────────────────────

const groundingSenses = [
  { count: 5, sense: "See", prompt: "Name 5 things you can see." },
  { count: 4, sense: "Touch", prompt: "Notice 4 things you can feel." },
  { count: 3, sense: "Hear", prompt: "What are 3 sounds?" },
  { count: 2, sense: "Smell", prompt: "Notice 2 smells." },
  { count: 1, sense: "Taste", prompt: "1 thing you can taste." },
];

// ─── Types ──────────────────────────────────────────────────────────

type SOSStep =
  | "reassurance"
  | "breathing"
  | "check-in"
  | "grounding"
  | "final";

interface SOSFlowProps {
  onClose: () => void;
}

export default function SOSFlow({ onClose }: SOSFlowProps) {
  const [step, setStep] = useState<SOSStep>("reassurance");

  // Breathing state
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([]);

  const currentBreathStep = sighSteps[currentStepIndex] ?? null;
  const currentGrounding = groundingSenses[groundingStep];

  // ─── Reassurance auto-advance ─────────────────────────────────

  useEffect(() => {
    if (step !== "reassurance") return;
    const timer = setTimeout(() => {
      // Start breathing
      setCurrentCycle(0);
      setCurrentStepIndex(0);
      setSecondsLeft(sighSteps[0].duration);
      setOrbProgress(0);
      elapsedRef.current = 0;
      setStep("breathing");
    }, 3000);
    return () => clearTimeout(timer);
  }, [step]);

  // ─── Breathing timer ──────────────────────────────────────────

  const advanceBreathStep = useCallback(() => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < sighSteps.length) {
      setCurrentStepIndex(nextStepIndex);
      setSecondsLeft(sighSteps[nextStepIndex].duration);
      elapsedRef.current = 0;
    } else {
      const nextCycle = currentCycle + 1;
      if (nextCycle < SOS_CYCLES) {
        setCurrentCycle(nextCycle);
        setCurrentStepIndex(0);
        setSecondsLeft(sighSteps[0].duration);
        elapsedRef.current = 0;
      } else {
        setStep("check-in");
      }
    }
  }, [currentStepIndex, currentCycle]);

  useEffect(() => {
    if (step !== "breathing" || !currentBreathStep) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const duration = currentBreathStep.duration;
      const remaining = Math.max(0, duration - elapsedRef.current);
      setSecondsLeft(Math.ceil(remaining));

      const fraction = Math.min(1, elapsedRef.current / duration);
      if (currentBreathStep.phase === "inhale") setOrbProgress(fraction);
      else if (currentBreathStep.phase === "exhale") setOrbProgress(1 - fraction);

      if (remaining <= 0) {
        advanceBreathStep();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [step, currentBreathStep, advanceBreathStep]);

  // ─── Grounding helpers ────────────────────────────────────────

  function startGrounding() {
    setGroundingStep(0);
    setChecked(Array(groundingSenses[0].count).fill(false));
    setStep("grounding");
  }

  function checkGroundingItem(index: number) {
    const next = [...checked];
    if (next[index]) return;
    next[index] = true;
    setChecked(next);

    if (next.every(Boolean)) {
      setTimeout(() => {
        const nextStep = groundingStep + 1;
        if (nextStep < groundingSenses.length) {
          setGroundingStep(nextStep);
          setChecked(Array(groundingSenses[nextStep].count).fill(false));
        } else {
          setStep("final");
        }
      }, 500);
    }
  }

  // ─── REASSURANCE ──────────────────────────────────────────────

  if (step === "reassurance") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-candle/10">
            <div className="h-14 w-14 rounded-full bg-candle/15" />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-cream">
            You&apos;re safe.
          </h2>
          <p className="mt-3 text-base text-cream-dim">
            Let&apos;s slow this down.
          </p>
        </div>
      </div>
    );
  }

  // ─── BREATHING ────────────────────────────────────────────────

  if (step === "breathing" && currentBreathStep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        {/* Cycle dots */}
        <div className="fixed left-0 right-0 top-8 flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: SOS_CYCLES }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < currentCycle ? "w-4 bg-teal-soft/50" : i === currentCycle ? "w-6 bg-teal-soft" : "w-3 bg-slate-blue/50"
                }`}
              />
            ))}
          </div>
        </div>

        <BreathingOrb progress={orbProgress} phase={currentBreathStep.phase} />

        <div className="mt-12 text-center">
          <p className="text-3xl font-light tracking-wide text-cream">{currentBreathStep.label}</p>
          <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/70">{secondsLeft}</p>
        </div>

        <button onClick={onClose} className="fixed bottom-10 text-xs text-cream-dim/30 hover:text-cream-dim">
          Exit
        </button>
      </div>
    );
  }

  // ─── CHECK-IN ─────────────────────────────────────────────────

  if (step === "check-in") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-light text-cream">How are you feeling?</h2>
          <p className="mt-2 text-sm text-cream-dim">Take a moment. There&apos;s no wrong answer.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => setStep("final")}
              className="w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Better
            </button>
            <button
              onClick={startGrounding}
              className="w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all hover:bg-candle/25 active:scale-[0.98]"
            >
              Still struggling
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── GROUNDING ────────────────────────────────────────────────

  if (step === "grounding") {
    const totalItems = groundingSenses.reduce((s, g) => s + g.count, 0);
    const doneItems = groundingSenses.slice(0, groundingStep).reduce((s, g) => s + g.count, 0) + checked.filter(Boolean).length;
    const progress = (doneItems / totalItems) * 100;

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        {/* Progress bar */}
        <div className="fixed left-0 right-0 top-0 h-1 bg-slate-blue/30">
          <div className="h-full bg-teal-soft/60 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="text-center">
          <div className="mb-3 font-mono text-6xl font-extralight text-teal-soft/40">{currentGrounding.count}</div>
          <h2 className="text-2xl font-light text-cream">{currentGrounding.sense}</h2>
          <p className="mt-2 text-sm text-cream-dim">{currentGrounding.prompt}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {checked.map((isChecked, i) => (
              <button
                key={i}
                onClick={() => checkGroundingItem(i)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-lg transition-all duration-300 ${
                  isChecked
                    ? "scale-90 border-teal/40 bg-teal/20 text-teal-soft"
                    : "border-slate-blue/40 bg-deep/60 text-cream-dim active:scale-95"
                }`}
              >
                {isChecked ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span className="text-sm">{i + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="fixed bottom-10 text-xs text-cream-dim/30 hover:text-cream-dim">Exit</button>
      </div>
    );
  }

  // ─── FINAL ────────────────────────────────────────────────────

  if (step === "final") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <div className="h-12 w-12 rounded-full bg-teal/15" />
          </div>

          <h2 className="text-2xl font-light tracking-tight text-cream">
            You made it through.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            You&apos;re okay.<br />
            That took courage.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/journal"
              onClick={onClose}
              className="rounded-xl bg-candle/15 px-8 py-3 text-sm font-medium text-candle transition-colors hover:bg-candle/25"
            >
              Log this episode
            </Link>
            <button
              onClick={onClose}
              className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Explore tools
            </button>
            <button
              onClick={onClose}
              className="text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
            >
              I&apos;m done for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
