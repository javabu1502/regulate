"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import BreathingOrb from "./BreathingOrb";
import { CallPersonButton } from "./MyPerson";
import NSStateSelector, { type NSState } from "./NSStateSelector";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getInstructions } from "@/lib/sos-scenarios";
import { haptics } from "@/lib/haptics";

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

const extendedExhaleSteps: BreathStep[] = [
  { phase: "inhale", duration: 4, label: "Breathe in" },
  { phase: "exhale", duration: 8, label: "Slow exhale" },
  { phase: "rest", duration: 1, label: "Rest" },
];

const SOS_SIGH_CYCLES = 3;
const EXTENDED_EXHALE_CYCLES = 5;

// ─── 5-4-3-2-1 Grounding data ──────────────────────────────────────

const groundingSenses = [
  { count: 5, sense: "See", prompt: "Name 5 things you can see." },
  { count: 4, sense: "Touch", prompt: "Notice 4 things you can feel." },
  { count: 3, sense: "Hear", prompt: "What are 3 sounds?" },
  { count: 2, sense: "Smell", prompt: "Notice 2 smells." },
  { count: 1, sense: "Taste", prompt: "1 thing you can taste." },
];

// ─── Web Audio for bilateral tapping ────────────────────────────────

function playTapTone(ctx: AudioContext, pan: number) {
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

// ─── Types ──────────────────────────────────────────────────────────

type Scenario = "home" | "public" | "work" | "night" | null;
type Approach = "soothe" | "move-through" | null;

type SOSStep =
  | "select-state"
  | "select-scenario"
  | "select-approach"
  | "reassurance"
  | "breathing"
  | "extended-exhale"
  | "orienting"
  | "cold-water"
  | "bilateral-tapping"
  | "gentle-movement"
  | "check-in"
  | "grounding"
  | "window-landing"
  | "final";

interface SOSFlowProps {
  onClose: () => void;
}

export default function SOSFlow({ onClose }: SOSFlowProps) {
  const [step, setStep] = useState<SOSStep>("select-state");
  const [nsState, setNsState] = useState<NSState | null>(null);
  const [scenario, setScenario] = useState<Scenario>(null);
  const [approach, setApproach] = useState<Approach>(null);

  // Wake lock — active throughout the entire SOS flow
  useWakeLock(true);

  // Breathing state
  const [breathingPattern, setBreathingPattern] = useState<BreathStep[]>(sighSteps);
  const [breathingCycles, setBreathingCycles] = useState(SOS_SIGH_CYCLES);
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

  // Timed step state (orienting, cold water, bilateral tapping, gentle movement)
  const [timedSecondsLeft, setTimedSecondsLeft] = useState(0);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bilateral tapping state
  const [tapSide, setTapSide] = useState<"left" | "right">("left");
  const tapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Track which path to continue on after check-in
  const [fallbackStep, setFallbackStep] = useState<SOSStep>("breathing");

  const currentBreathStep = breathingPattern[currentStepIndex] ?? null;
  const currentGrounding = groundingSenses[groundingStep];

  // ─── Cleanup timers on unmount ──────────────────────────────────

  useEffect(() => {
    return () => {
      if (timedRef.current) clearInterval(timedRef.current);
      if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─── Haptic feedback on reaching final step ──────────────────────

  useEffect(() => {
    if (step === "final") {
      haptics.complete();
    }
  }, [step]);

  // ─── State selection handler ────────────────────────────────────

  function handleStateSelect(state: NSState) {
    setNsState(state);
    if (state === "window") {
      setStep("window-landing");
    } else {
      setStep("select-scenario");
    }
  }

  function handleScenarioSelect(sc: Scenario) {
    setScenario(sc);
    // Hypoactivated skips approach choice — always gentle activation
    if (nsState === "hypoactivated") {
      beginPath(nsState, sc, null);
    } else {
      setStep("select-approach");
    }
  }

  function handleApproachSelect(ap: Approach) {
    setApproach(ap);
    beginPath(nsState!, scenario, ap);
  }

  function beginPath(state: NSState, sc: Scenario, ap: Approach) {
    // Save choice to localStorage for analytics
    try {
      localStorage.setItem("regulate-last-sos", JSON.stringify({ state, scenario: sc, approach: ap, ts: new Date().toISOString() }));
    } catch { /* */ }

    switch (state) {
      case "hyperactivated":
        if (ap === "soothe") {
          // Soothe: orienting → cold water → breathing
          startOrienting();
        } else {
          // Move through: bilateral tapping → breathing
          startBilateralTapping();
        }
        break;
      case "activated":
        if (ap === "soothe") {
          // Soothe: extended exhale (longer, slower)
          startBreathing(extendedExhaleSteps, EXTENDED_EXHALE_CYCLES, "check-in");
        } else {
          // Move through: physiological sigh → extended exhale
          startBreathing(sighSteps, SOS_SIGH_CYCLES, "extended-exhale");
        }
        break;
      case "hypoactivated":
        startGentleMovement();
        break;
      default:
        setStep("window-landing");
    }
  }

  // ─── Start breathing (reusable for sigh & extended exhale) ──────

  function startBreathing(pattern: BreathStep[], cycles: number, nextFallback: SOSStep = "final") {
    setBreathingPattern(pattern);
    setBreathingCycles(cycles);
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setSecondsLeft(pattern[0].duration);
    setOrbProgress(0);
    elapsedRef.current = 0;
    setFallbackStep(nextFallback);
    setStep("breathing");
  }

  // ─── HYPERACTIVATED path helpers ────────────────────────────────

  function startOrienting() {
    setTimedSecondsLeft(60);
    setStep("orienting");
  }

  function startColdWater() {
    setTimedSecondsLeft(30);
    setStep("cold-water");
  }

  function startBilateralTapping() {
    setTimedSecondsLeft(120);
    setTapSide("left");
    setStep("bilateral-tapping");
  }

  // ─── HYPOACTIVATED path helpers ─────────────────────────────────

  function startGentleMovement() {
    setTimedSecondsLeft(60);
    setStep("gentle-movement");
  }

  // Whether the timed step timer has finished (user can continue at their own pace)
  const [timedReady, setTimedReady] = useState(false);

  // ─── Timed step countdown ──────────────────────────────────────

  useEffect(() => {
    const timedSteps: SOSStep[] = ["orienting", "cold-water", "bilateral-tapping", "gentle-movement"];
    if (!timedSteps.includes(step)) return;

    setTimedReady(false);

    timedRef.current = setInterval(() => {
      setTimedSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timedRef.current) clearInterval(timedRef.current);
          // Bilateral tapping auto-advances (rhythm-based)
          if (step === "bilateral-tapping") {
            if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
            setFallbackStep("breathing");
            setStep("check-in");
          } else {
            // Other timed steps: show "ready to continue?" instead of auto-advancing
            setTimedReady(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timedRef.current) clearInterval(timedRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function advanceTimedStep() {
    if (timedRef.current) clearInterval(timedRef.current);
    if (step === "orienting") startColdWater();
    else if (step === "cold-water") startBilateralTapping();
    else if (step === "gentle-movement") startGrounding();
  }

  // ─── Bilateral tapping auto-rhythm ─────────────────────────────

  useEffect(() => {
    if (step !== "bilateral-tapping") return;

    // Initialize audio context
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    tapIntervalRef.current = setInterval(() => {
      setTapSide((prev) => {
        const next = prev === "left" ? "right" : "left";
        if (audioCtxRef.current) {
          playTapTone(audioCtxRef.current, next === "left" ? -1 : 1);
        }
        haptics.tap();
        return next;
      });
    }, 1000); // Slow rhythm for hyperactivated

    return () => {
      if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
    };
  }, [step]);

  // ─── Breathing timer ──────────────────────────────────────────

  const advanceBreathStep = useCallback(() => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < breathingPattern.length) {
      setCurrentStepIndex(nextStepIndex);
      setSecondsLeft(breathingPattern[nextStepIndex].duration);
      elapsedRef.current = 0;
    } else {
      const nextCycle = currentCycle + 1;
      if (nextCycle < breathingCycles) {
        setCurrentCycle(nextCycle);
        setCurrentStepIndex(0);
        setSecondsLeft(breathingPattern[0].duration);
        elapsedRef.current = 0;
      } else {
        // Breathing done — check what comes next
        if (fallbackStep === "extended-exhale") {
          // Activated path: sigh done → extended exhale
          startBreathing(extendedExhaleSteps, EXTENDED_EXHALE_CYCLES, "check-in");
        } else if (fallbackStep === "check-in") {
          setStep("check-in");
        } else {
          setStep("check-in");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, currentCycle, breathingPattern, breathingCycles, fallbackStep]);

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

  // ─── Format time ──────────────────────────────────────────────

  function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ─── SELECT STATE ─────────────────────────────────────────────

  if (step === "select-state") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5" role="dialog" aria-modal="true" aria-label="SOS support flow">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-light text-cream">Where are you right now?</h2>
            <p className="mt-2 text-sm text-cream-dim">No wrong answer. Just notice.</p>
          </div>
          <NSStateSelector
            compact
            onSelect={handleStateSelect}
          />
          <button onClick={onClose} className="mt-6 w-full text-center text-xs text-cream-dim/30 hover:text-cream-dim">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ─── SELECT SCENARIO ─────────────────────────────────────────────

  if (step === "select-scenario") {
    const scenarios: { id: Scenario; label: string; sub: string }[] = [
      { id: "home", label: "At home", sub: "Private space, full access" },
      { id: "public", label: "In public", sub: "Limited space, need to be discreet" },
      { id: "work", label: "At work or school", sub: "Need to stay composed" },
      { id: "night", label: "Middle of the night", sub: "Can't sleep, spiraling" },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-light text-cream">Where are you right now?</h2>
            <p className="mt-2 text-sm text-cream-dim">This helps us pick the right tools.</p>
          </div>
          <div className="flex flex-col gap-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleScenarioSelect(sc.id)}
                className="w-full rounded-xl border border-slate-blue/30 bg-deep/40 px-5 py-4 text-left transition-all hover:border-teal/20 active:scale-[0.98]"
              >
                <span className="text-sm text-cream">{sc.label}</span>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{sc.sub}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => handleScenarioSelect(null)}
            className="mt-4 w-full text-center text-xs text-cream-dim/30 hover:text-cream-dim"
          >
            Skip
          </button>
          <button onClick={onClose} className="mt-3 w-full text-center text-xs text-cream-dim/30 hover:text-cream-dim">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ─── SELECT APPROACH ────────────────────────────────────────────

  if (step === "select-approach") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-light text-cream">What do you need?</h2>
          <p className="mt-2 text-sm text-cream-dim">Both are valid. Trust yourself.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => handleApproachSelect("soothe")}
              className="w-full rounded-2xl border border-teal/20 bg-teal/8 px-5 py-5 text-left transition-all hover:border-teal/35 active:scale-[0.98]"
            >
              <span className="text-base font-medium text-teal-soft">Soothe me</span>
              <span className="mt-1 block text-xs text-cream-dim/50">Calm, slow, grounding. Bring me down gently.</span>
            </button>
            <button
              onClick={() => handleApproachSelect("move-through")}
              className="w-full rounded-2xl border border-candle/20 bg-candle/8 px-5 py-5 text-left transition-all hover:border-candle/35 active:scale-[0.98]"
            >
              <span className="text-base font-medium text-candle-soft">Move through it</span>
              <span className="mt-1 block text-xs text-cream-dim/50">Active, engaged. Help me process and release.</span>
            </button>
          </div>

          <button onClick={onClose} className="mt-6 text-xs text-cream-dim/30 hover:text-cream-dim">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ─── ORIENTING (Hyperactivated step a) ─────────────────────────

  if (step === "orienting") {
    const instructions = getInstructions(scenario);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        {/* Timer */}
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {timedSecondsLeft > 0 ? formatTimer(timedSecondsLeft) : ""}
        </div>

        <div className="text-center">
          {/* Animated scanning eye */}
          <div className="mx-auto mb-8">
            <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
              <ellipse cx="40" cy="40" rx="30" ry="18" stroke="rgba(90,171,174,0.3)" strokeWidth="1.5" fill="none" />
              <circle cx="40" cy="40" r="8" fill="rgba(90,171,174,0.15)" stroke="rgba(90,171,174,0.4)" strokeWidth="1" />
              <circle cx="40" cy="40" r="3" fill="rgba(90,171,174,0.5)">
                <animate attributeName="cx" values="32;48;32" dur="4s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          <h2 className="text-2xl font-light text-cream">{instructions.orienting.title}</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            {instructions.orienting.body}
          </p>
          {instructions.orienting.detail && (
            <p className="mx-auto mt-3 max-w-xs text-xs text-cream-dim/40">
              {instructions.orienting.detail}
            </p>
          )}
        </div>

        {timedReady ? (
          <button
            onClick={advanceTimedStep}
            className="fixed bottom-20 w-48 rounded-2xl bg-teal/20 py-4 text-sm font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
          >
            Ready to continue
          </button>
        ) : (
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              advanceTimedStep();
            }}
            className="fixed bottom-20 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
          >
            Skip
          </button>
        )}

        <button onClick={onClose} className="fixed bottom-10 text-xs text-cream-dim/30 hover:text-cream-dim">
          Exit
        </button>
      </div>
    );
  }

  // ─── COLD WATER (Hyperactivated step b) ────────────────────────

  if (step === "cold-water") {
    const instructions = getInstructions(scenario);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {timedSecondsLeft > 0 ? formatTimer(timedSecondsLeft) : ""}
        </div>

        <div className="text-center">
          {/* Cold water visual — ripple circles */}
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-6 animate-pulse-soft rounded-full border border-blue-400/20" />
              <div className="absolute -inset-3 rounded-full border border-blue-400/15" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                  <path d="M12 2C12 2 6 10 6 14C6 17.3 8.7 20 12 20C15.3 20 18 17.3 18 14C18 10 12 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-light text-cream">{instructions.coldWater.title}</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            {instructions.coldWater.body}
          </p>
        </div>

        {timedReady ? (
          <button
            onClick={advanceTimedStep}
            className="fixed bottom-20 w-48 rounded-2xl bg-teal/20 py-4 text-sm font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
          >
            Ready to continue
          </button>
        ) : (
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              advanceTimedStep();
            }}
            className="fixed bottom-20 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
          >
            Skip
          </button>
        )}

        <button onClick={onClose} className="fixed bottom-10 text-xs text-cream-dim/30 hover:text-cream-dim">
          Exit
        </button>
      </div>
    );
  }

  // ─── BILATERAL TAPPING (Hyperactivated step c) ─────────────────

  if (step === "bilateral-tapping") {
    const instructions = getInstructions(scenario);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight">
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {formatTimer(timedSecondsLeft)}
        </div>

        {/* Left/right visual */}
        <div className="flex w-full flex-1">
          <div
            className={`flex flex-1 items-center justify-center transition-colors duration-300 ${
              tapSide === "left" ? "bg-teal/8" : ""
            }`}
          >
            <div
              className={`h-16 w-16 rounded-full transition-all duration-200 ${
                tapSide === "left"
                  ? "scale-110 bg-teal/30 shadow-lg shadow-teal/20"
                  : "scale-90 bg-slate-blue/20"
              }`}
            />
          </div>
          <div
            className={`flex flex-1 items-center justify-center transition-colors duration-300 ${
              tapSide === "right" ? "bg-teal/8" : ""
            }`}
          >
            <div
              className={`h-16 w-16 rounded-full transition-all duration-200 ${
                tapSide === "right"
                  ? "scale-110 bg-teal/30 shadow-lg shadow-teal/20"
                  : "scale-90 bg-slate-blue/20"
              }`}
            />
          </div>
        </div>

        <div className="fixed bottom-24 text-center">
          <p className="text-sm text-cream-dim">{instructions.bilateralTapping.body}</p>
        </div>

        <button
          onClick={() => {
            if (timedRef.current) clearInterval(timedRef.current);
            if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
            setFallbackStep("breathing");
            setStep("check-in");
          }}
          className="fixed bottom-14 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
        >
          Skip
        </button>

        <button onClick={onClose} className="fixed bottom-5 text-xs text-cream-dim/30 hover:text-cream-dim">
          Exit
        </button>
      </div>
    );
  }

  // ─── GENTLE MOVEMENT (Hypoactivated step a) ───────────────────

  if (step === "gentle-movement") {
    const instructions = getInstructions(scenario);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {timedSecondsLeft > 0 ? formatTimer(timedSecondsLeft) : ""}
        </div>

        <div className="text-center">
          {/* Gentle swaying visual */}
          <div className="mx-auto mb-8">
            <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
              <circle cx="40" cy="30" r="10" fill="rgba(96,165,250,0.15)" stroke="rgba(96,165,250,0.3)" strokeWidth="1.5">
                <animate attributeName="cx" values="35;45;35" dur="3s" repeatCount="indefinite" />
              </circle>
              <line x1="40" y1="40" x2="40" y2="65" stroke="rgba(96,165,250,0.2)" strokeWidth="1.5">
                <animate attributeName="x1" values="35;45;35" dur="3s" repeatCount="indefinite" />
                <animate attributeName="x2" values="38;42;38" dur="3s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>

          <h2 className="text-2xl font-light text-cream">Gentle activation</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            {instructions.gentleMovement.body}
          </p>
          <p className="mx-auto mt-3 max-w-xs text-xs text-cream-dim/40">
            {instructions.gentleMovement.detail}
          </p>
        </div>

        {timedReady ? (
          <button
            onClick={advanceTimedStep}
            className="fixed bottom-20 w-48 rounded-2xl bg-blue-500/15 py-4 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/25 active:scale-[0.98]"
          >
            Ready to continue
          </button>
        ) : (
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              advanceTimedStep();
            }}
            className="fixed bottom-20 rounded-xl bg-blue-500/15 px-6 py-3 text-sm text-blue-400 hover:bg-blue-500/25"
          >
            Skip
          </button>
        )}

        <button onClick={onClose} className="fixed bottom-10 text-xs text-cream-dim/30 hover:text-cream-dim">
          Exit
        </button>
      </div>
    );
  }

  // ─── BREATHING ────────────────────────────────────────────────

  if (step === "breathing" && currentBreathStep) {
    const isExtended = breathingPattern === extendedExhaleSteps;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <div className="fixed left-0 right-0 top-8 flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: breathingCycles }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < currentCycle ? "w-4 bg-teal-soft/50" : i === currentCycle ? "w-6 bg-teal-soft" : "w-3 bg-slate-blue/50"
                }`}
              />
            ))}
          </div>
        </div>

        {isExtended && (
          <p className="fixed top-14 text-xs text-cream-dim/40">Extended exhale</p>
        )}

        <BreathingOrb progress={orbProgress} phase={currentBreathStep.phase} />

        <div className="mt-12 text-center">
          <p className="text-3xl font-light tracking-wide text-cream" aria-live="polite">{currentBreathStep.label}</p>
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
              onClick={() => {
                if (nsState === "hyperactivated" && fallbackStep === "breathing") {
                  // Hyperactivated still struggling → physiological sigh
                  startBreathing(sighSteps, SOS_SIGH_CYCLES, "check-in");
                } else {
                  startGrounding();
                }
              }}
              className="w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all hover:bg-candle/25 active:scale-[0.98]"
            >
              Still struggling
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── WINDOW OF TOLERANCE LANDING ──────────────────────────────

  if (step === "window-landing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <div className="h-12 w-12 rounded-full bg-teal/15" />
          </div>

          <h2 className="text-2xl font-light tracking-tight text-cream">
            You&apos;re in your window.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            That&apos;s a good place to be.<br />
            Want to strengthen it?
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/breathing"
              onClick={onClose}
              className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-center text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Guided breathing
            </Link>
            <Link
              href="/journal"
              onClick={onClose}
              className="w-56 rounded-xl bg-candle/15 px-8 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
            >
              Journal
            </Link>
            <button
              onClick={onClose}
              className="mt-2 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
            >
              I&apos;m good
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
            <CallPersonButton />
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
