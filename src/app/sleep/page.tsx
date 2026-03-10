"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";
import AftercareFlow from "@/components/AftercareFlow";
import MicroExplanation from "@/components/MicroExplanation";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";
import EscapeHatch from "@/components/EscapeHatch";

// ─── Types ──────────────────────────────────────────────────────────

type Phase = "inhale" | "hold" | "exhale";
type Mode = "select" | "cant-sleep" | "woke-up" | "racing";

interface BreathStep {
  phase: Phase;
  duration: number;
  label: string;
}

// ─── Mode 1: Can't fall asleep ──────────────────────────────────────

const cantSleepBreathSteps: BreathStep[] = [
  { phase: "inhale", duration: 4, label: "Inhale" },
  { phase: "hold", duration: 7, label: "Hold" },
  { phase: "exhale", duration: 8, label: "Exhale" },
];

const cantSleepCycles = 5;

const cantSleepRelaxSteps = [
  "Curl your toes tight... then release",
  "Squeeze your fists... then let go",
  "Tense your shoulders up to your ears... release",
  "Scrunch your face tight... soften",
  "Take a deep breath... let everything go",
];

// ─── Mode 2: Woke up anxious ───────────────────────────────────────

const groundingSteps = [
  "Name 3 things you can see from your bed",
  "Feel the sheets, the pillow, the mattress",
  "Listen for 3 sounds, no matter how quiet",
];

const affirmationSteps = [
  "I am safe in this bed. Nothing needs my attention right now.",
  "My body knows how to sleep. I can let it lead.",
  "This moment is quiet. I can rest here.",
];

// ─── Mode 3: Racing thoughts ───────────────────────────────────────

const racingBreathSteps: BreathStep[] = [
  { phase: "inhale", duration: 4, label: "Breathe in" },
  { phase: "exhale", duration: 8, label: "Slow exhale" },
];

const racingCycles = 5;

const bodyScanSteps = [
  "Soften your forehead. Let your jaw go slack.",
  "Feel your chest rise and fall. Let your shoulders melt.",
  "Let your belly be soft. No holding.",
  "Feel where your feet meet the sheets. You are here.",
];

const sleepExplanations: Record<string, string> = {
  "cant-sleep": "Extended exhale breathing plus muscle relaxation lower your cortisol and prepare your body for sleep.",
  "woke-up": "Grounding reorients you to the present, while affirmations counter the negative thought spiral.",
  "racing": "Longer exhales slow your heart rate while body awareness redirects attention away from racing thoughts.",
};

// ─── Screens per mode ──────────────────────────────────────────────

type CantSleepScreen = "breathing" | "relaxation" | "complete";
type WokeUpScreen = "grounding" | "affirmations" | "complete";
type RacingScreen = "breathing" | "bodyscan" | "complete";
type Screen = "select" | CantSleepScreen | WokeUpScreen | RacingScreen;

// ─── Component ──────────────────────────────────────────────────────

export default function SleepPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");
  const [screen, setScreen] = useState<Screen>("select");
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  // Breathing state (shared by cant-sleep and racing modes)
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Ambient audio state
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("off");

  // Timed step state (relaxation, grounding, affirmations, body scan)
  const [stepIndex, setStepIndex] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake lock — active during any active phase
  useWakeLock(screen !== "select" && screen !== "complete");

  // Stop ambient audio on unmount or when exercise completes
  useEffect(() => {
    if (screen === "complete" || screen === "select") {
      ambientAudio.stop();
      setAmbientSound("off");
    }
    return () => {
      ambientAudio.stop();
    };
  }, [screen]);

  // Resolve active breath config based on mode
  const breathSteps =
    mode === "racing" ? racingBreathSteps : cantSleepBreathSteps;
  const totalCycles = mode === "racing" ? racingCycles : cantSleepCycles;
  const currentStep = breathSteps[currentStepIndex] ?? null;

  // ─── Breathing timer ──────────────────────────────────────────

  const advanceBreathStep = useCallback(() => {
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
        // Breathing done — advance to next phase based on mode
        setStepIndex(0);
        if (mode === "cant-sleep") {
          setScreen("relaxation");
        } else if (mode === "racing") {
          setScreen("bodyscan");
        }
      }
    }
  }, [currentStepIndex, currentCycle, breathSteps, totalCycles, mode]);

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
        advanceBreathStep();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, currentStep, advanceBreathStep]);

  // ─── Timed step auto-advance (relaxation, grounding, affirmations, body scan)

  function getTimedSteps(): string[] {
    if (screen === "relaxation") return cantSleepRelaxSteps;
    if (screen === "grounding") return groundingSteps;
    if (screen === "affirmations") return affirmationSteps;
    if (screen === "bodyscan") return bodyScanSteps;
    return [];
  }

  function getStepDuration(): number {
    if (screen === "relaxation") return 8000;
    if (screen === "grounding") return 20000;
    if (screen === "affirmations") return 15000;
    if (screen === "bodyscan") return 20000;
    return 8000;
  }

  function getNextScreen(): Screen {
    if (mode === "cant-sleep" && screen === "relaxation") return "complete";
    if (mode === "woke-up" && screen === "grounding") return "affirmations";
    if (mode === "woke-up" && screen === "affirmations") return "complete";
    if (mode === "racing" && screen === "bodyscan") return "complete";
    return "complete";
  }

  const timedScreens: Screen[] = [
    "relaxation",
    "grounding",
    "affirmations",
    "bodyscan",
  ];
  const isTimedScreen = timedScreens.includes(screen);

  useEffect(() => {
    if (!isTimedScreen) return;

    const steps = getTimedSteps();
    const duration = getStepDuration();

    stepTimerRef.current = setTimeout(() => {
      if (stepIndex < steps.length - 1) {
        setStepIndex((i) => i + 1);
      } else {
        const next = getNextScreen();
        if (next !== screen) {
          setStepIndex(0);
        }
        setScreen(next);
      }
    }, duration);

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, stepIndex, mode]);

  // ─── Handlers ─────────────────────────────────────────────────

  function resetBreathingState() {
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setOrbProgress(0);
    elapsedRef.current = 0;
    setStepIndex(0);
  }

  function selectMode(selected: Mode) {
    setMode(selected);
    resetBreathingState();

    if (selected === "cant-sleep") {
      setSecondsLeft(cantSleepBreathSteps[0].duration);
      setScreen("breathing");
    } else if (selected === "woke-up") {
      setScreen("grounding");
    } else if (selected === "racing") {
      setSecondsLeft(racingBreathSteps[0].duration);
      setScreen("breathing");
    }
  }

  function advanceTimedStep() {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);

    const steps = getTimedSteps();
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      const next = getNextScreen();
      if (next !== screen) {
        setStepIndex(0);
      }
      setScreen(next);
    }
  }

  // ─── SELECT MODE ───────────────────────────────────────────────

  if (screen === "select") {
    const modes = [
      {
        id: "cant-sleep" as Mode,
        title: "Can\u2019t fall asleep",
        desc: "Breathing + muscle relaxation",
        time: "~3 min",
      },
      {
        id: "woke-up" as Mode,
        title: "Woke up anxious",
        desc: "Grounding + affirmations",
        time: "~2 min",
      },
      {
        id: "racing" as Mode,
        title: "Racing thoughts",
        desc: "Extended exhale + body scan",
        time: "~3 min",
      },
    ];

    return (
      <div key="select" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
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
              Choose what fits right now.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3">
              {modes.map((m) => (
                <div
                  key={m.id}
                  className="relative w-full rounded-2xl bg-teal/10 px-5 py-5 text-left transition-all duration-300 hover:bg-teal/15 active:scale-[0.98]"
                >
                  <button
                    onClick={() => selectMode(m.id)}
                    className="w-full text-left pr-6"
                  >
                    <p className="text-base font-medium text-teal-soft/70">
                      {m.title}
                    </p>
                    <p className="mt-1 text-sm text-cream-dim/40">
                      {m.desc} &middot; {m.time}
                    </p>
                  </button>
                  <MicroExplanation
                    text={sleepExplanations[m.id]}
                    isOpen={expandedExplanation === m.id}
                    onToggle={() => setExpandedExplanation(expandedExplanation === m.id ? null : m.id)}
                  />
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-cream-dim/30">
              Turn on binaural beats for deeper relaxation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── BREATHING (cant-sleep + racing) ────────────────────────────

  if (screen === "breathing" && currentStep) {
    return (
      <div key="breathing" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
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

        {/* Ambient sound toggle */}
        <div className="fixed bottom-16 left-0 right-0 flex justify-center gap-1">
          {(["off", "rain", "ocean", "forest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s === "off") { ambientAudio.stop(); setAmbientSound("off"); }
                else { ambientAudio.start(s); setAmbientSound(s); }
              }}
              className={`rounded-full px-2 py-1 text-[10px] transition-all ${
                ambientSound === s ? "bg-teal/20 text-teal-soft" : "text-cream-dim/50 hover:text-cream-dim/70"
              }`}
            >
              {s === "off" ? "Quiet" : s === "rain" ? "Rain" : s === "ocean" ? "Ocean" : "Forest"}
            </button>
          ))}
        </div>

        <EscapeHatch />
      </div>
    );
  }

  // ─── TIMED STEP SCREENS (relaxation, grounding, affirmations, body scan)

  if (isTimedScreen) {
    const steps = getTimedSteps();
    const phaseLabel =
      screen === "relaxation"
        ? "Progressive relaxation"
        : screen === "grounding"
          ? "Grounding"
          : screen === "affirmations"
            ? "Affirmation"
            : "Body scan";

    return (
      <div key={screen} className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <p className="mb-6 text-xs uppercase tracking-widest text-cream-dim/30">
            {phaseLabel}
          </p>

          <p className="text-xl font-light leading-relaxed text-cream/60">
            {steps[stepIndex]}
          </p>

          <button
            onClick={advanceTimedStep}
            className="mt-10 rounded-2xl bg-teal/10 px-8 py-3 text-sm font-medium text-teal-soft/50 transition-all duration-300 hover:bg-teal/15 active:scale-[0.98]"
          >
            Ready
          </button>

          {/* Step dots */}
          <div className="mt-8 flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < stepIndex
                    ? "w-3 bg-teal-soft/30"
                    : i === stepIndex
                      ? "w-5 bg-teal-soft/50"
                      : "w-2 bg-slate-blue/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Ambient sound toggle */}
        <div className="fixed bottom-16 left-0 right-0 flex justify-center gap-1">
          {(["off", "rain", "ocean", "forest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s === "off") { ambientAudio.stop(); setAmbientSound("off"); }
                else { ambientAudio.start(s); setAmbientSound(s); }
              }}
              className={`rounded-full px-2 py-1 text-[10px] transition-all ${
                ambientSound === s ? "bg-teal/20 text-teal-soft" : "text-cream-dim/50 hover:text-cream-dim/70"
              }`}
            >
              {s === "off" ? "Quiet" : s === "rain" ? "Rain" : s === "ocean" ? "Ocean" : "Forest"}
            </button>
          ))}
        </div>

        <EscapeHatch />
      </div>
    );
  }

  // ─── COMPLETE ─────────────────────────────────────────────────

  if (screen === "complete") {
    const techniqueLabel =
      mode === "cant-sleep"
        ? "Sleep Sequence"
        : mode === "woke-up"
          ? "Night Comfort"
          : "Thought Release";

    return (
      <div key="complete" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique={techniqueLabel}
          onDone={() => router.push("/")}
          learnLink="/learn#breathing"
        />
      </div>
    );
  }

  return null;
}
