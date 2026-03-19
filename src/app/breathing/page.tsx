"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";
import { useWakeLock } from "@/hooks/useWakeLock";
import AftercareFlow from "@/components/AftercareFlow";
import SessionProgressBar from "@/components/SessionProgressBar";
import MicroExplanation from "@/components/MicroExplanation";
import { useRouter, useSearchParams } from "next/navigation";
import { haptics } from "@/lib/haptics";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";
import { voiceGuidance } from "@/lib/voice-guidance";
import { useAudioGuide } from "@/hooks/useAudioGuide";
import PresenceCue from "@/components/PresenceCue";
import EscapeHatch from "@/components/EscapeHatch";

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
    useCase: "Quick relief when you need it now",
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
    useCase: "Steady, grounding calm",
    steps: [
      { phase: "inhale", duration: 5, label: "Inhale" },
      { phase: "exhale", duration: 5, label: "Exhale" },
    ],
  },
  {
    id: "extended-exhale",
    name: "Extended Exhale",
    description: "Breathe in for 4, out for 8",
    useCase: "Slowing down fast",
    steps: [
      { phase: "inhale", duration: 4, label: "Breathe in" },
      { phase: "exhale", duration: 8, label: "Slow exhale" },
    ],
  },
];

const TOTAL_CYCLES = 5;

const breathingExplanations: Record<string, string> = {
  box: "The even rhythm gives your body a pattern to follow. When your breathing is predictable, everything else starts to settle too.",
  "478": "That long exhale is the key. Breathing out longer than you breathe in activates your parasympathetic nervous system - basically your body\u2019s built-in brake pedal. You\u2019ll feel it within a few rounds.",
  sigh: "This is what your body does naturally after a good cry or a big relief. The double inhale opens your lungs up, and the long exhale lets everything go. Research suggests it may be one of the most effective real-time calming techniques.",
  coherence: "About 6 breaths per minute is the sweet spot where your heart and breathing sync up - it\u2019s called heart rate variability. It feels like everything just\u2026 settles.",
  "extended-exhale": "The longer your exhale compared to your inhale, the stronger the calming signal to your nervous system. This is one of the simplest, most reliable ways to slow everything down.",
};

const breathingWhatYoullDo: Record<string, string> = {
  box: "You\u2019ll breathe in a steady square rhythm: in for 4, hold for 4, out for 4, hold for 4.",
  "478": "You\u2019ll take a deep breath in for 4, hold it for 7, then slowly exhale for 8.",
  sigh: "You\u2019ll take two quick inhales through your nose, then one long exhale through your mouth.",
  coherence: "You\u2019ll breathe in for 5 seconds, out for 5 seconds. That\u2019s it \u2014 just a steady, even rhythm.",
  "extended-exhale": "You\u2019ll breathe in for 4 seconds, then slowly breathe out for 8 seconds. Simple and powerful.",
};

// ─── Pattern card icons ─────────────────────────────────────────────

function PatternIcon({ id }: { id: string }) {
  const base = "w-8 h-8 text-teal-soft";
  switch (id) {
    case "box":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "478":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path d="M6 24C6 24 10 8 16 8C22 8 26 24 26 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "sigh":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path d="M4 20L10 12L14 15L20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 8L28 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "coherence":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path d="M4 16C4 16 8 8 12 8C16 8 16 24 20 24C24 24 28 16 28 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "extended-exhale":
      return (
        <svg className={base} viewBox="0 0 32 32" fill="none">
          <path d="M6 20L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 12L28 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────

type Screen = "select" | "intro" | "session" | "complete";

export default function BreathingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
      <BreathingPageInner />
    </Suspense>
  );
}

function BreathingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patternParam = searchParams.get("pattern");
  const initialPattern = patternParam ? patterns.find((p) => p.id === patternParam) ?? null : null;
  const [screen, setScreen] = useState<Screen>(initialPattern ? "intro" : "select");
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern | null>(initialPattern);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  // Session state
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [orbProgress, setOrbProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("off");
  const [voiceOn, setVoiceOn] = useState(() => voiceGuidance.isEnabled());
  const breathingAudio = useAudioGuide("breathing");
  const [eyesFree, setEyesFree] = useState(false);
  const [gentleStart, setGentleStart] = useState(false);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const lastHapticRef = useRef<number>(0);
  const prevStepKeyRef = useRef<string>("");

  // Wake lock - active during session
  useWakeLock(screen === "session" && !isPaused);

  const currentStep = selectedPattern?.steps[currentStepIndex] ?? null;

  // Gentle start: cycle 0 = 75% speed (1.33x duration), cycle 1 = ~90% speed (1.11x), cycle 2+ = normal
  function getGentleMultiplier(cycle: number): number {
    if (!gentleStart) return 1;
    if (cycle === 0) return 1 / 0.75;   // ~1.33x duration (75% speed)
    if (cycle === 1) return 1 / 0.9;    // ~1.11x duration (90% speed)
    return 1;
  }

  function getAdjustedDuration(baseDuration: number, cycle: number): number {
    return baseDuration * getGentleMultiplier(cycle);
  }

  // ─── Session timer ──────────────────────────────────────────────

  const advanceStep = useCallback(() => {
    if (!selectedPattern) return;

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < selectedPattern.steps.length) {
      const nextPhase = selectedPattern.steps[nextStepIndex].phase;
      if (nextPhase === "inhale") haptics.breatheIn();
      else if (nextPhase === "exhale") haptics.breatheOut();
      setCurrentStepIndex(nextStepIndex);
      setSecondsLeft(Math.ceil(getAdjustedDuration(selectedPattern.steps[nextStepIndex].duration, currentCycle)));
      elapsedRef.current = 0;
    } else {
      const nextCycle = currentCycle + 1;
      if (nextCycle < TOTAL_CYCLES) {
        const nextPhase = selectedPattern.steps[0].phase;
        if (nextPhase === "inhale") haptics.breatheIn();
        else if (nextPhase === "exhale") haptics.breatheOut();
        setCurrentCycle(nextCycle);
        setCurrentStepIndex(0);
        setSecondsLeft(Math.ceil(getAdjustedDuration(selectedPattern.steps[0].duration, nextCycle)));
        elapsedRef.current = 0;
      } else {
        haptics.complete();
        ambientAudio.stop();
        setScreen("complete");
      }
    }
  }, [selectedPattern, currentStepIndex, currentCycle, gentleStart]);

  useEffect(() => {
    if (screen !== "session" || !currentStep || isPaused) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const duration = getAdjustedDuration(currentStep.duration, currentCycle);
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
  }, [screen, currentStep, isPaused, advanceStep]);

  // ─── Voice guidance ────────────────────────────────────────────

  // Stop voice on unmount (e.g. browser back navigation)
  useEffect(() => {
    return () => {
      voiceGuidance.stop();
    };
  }, []);

  useEffect(() => {
    if (screen === "session" && currentStep && voiceOn) {
      // Play MP3 clip; fall back to TTS if file missing
      const filename = currentStep.label.toLowerCase().replace(/\s+/g, "-");
      breathingAudio.play(filename);
    }
  }, [currentStepIndex, currentCycle, screen]);

  useEffect(() => {
    if (screen === "complete") {
      voiceGuidance.stop();
    }
  }, [screen]);

  // ─── Eyes-free haptic guide ───────────────────────────────────

  useEffect(() => {
    if (!eyesFree || screen !== "session" || !currentStep || isPaused) return;

    // Fire a phase-change double-tap when the step changes
    const stepKey = `${currentCycle}-${currentStepIndex}`;
    if (prevStepKeyRef.current && prevStepKeyRef.current !== stepKey) {
      haptics.phaseChange();
    }
    prevStepKeyRef.current = stepKey;

    // Determine haptic interval based on phase
    const phase = currentStep.phase;
    let intervalMs: number;
    if (phase === "inhale") intervalMs = 350;
    else if (phase === "hold") intervalMs = 2000;
    else if (phase === "exhale") intervalMs = 1000;
    else return; // rest - no vibration

    const fire = () => {
      const now = performance.now();
      if (now - lastHapticRef.current >= intervalMs) {
        lastHapticRef.current = now;
        if (phase === "inhale") haptics.inhaleGuide();
        else if (phase === "hold") haptics.holdGuide();
        else if (phase === "exhale") haptics.exhaleGuide();
      }
    };

    // Fire immediately on phase start
    lastHapticRef.current = 0;
    fire();

    const id = setInterval(fire, intervalMs);
    return () => clearInterval(id);
  }, [eyesFree, screen, currentStep, isPaused, currentCycle, currentStepIndex]);

  // ─── Actions ───────────────────────────────────────────────────

  function selectAndShowIntro(pattern: BreathPattern) {
    setSelectedPattern(pattern);
    setScreen("intro");
  }

  function startSessionFromIntro() {
    if (!selectedPattern) return;
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setSecondsLeft(Math.ceil(getAdjustedDuration(selectedPattern.steps[0].duration, 0)));
    setOrbProgress(0);
    setIsPaused(false);
    elapsedRef.current = 0;
    prevStepKeyRef.current = "";
    setScreen("session");
  }

  function resetToSelect() {
    setScreen("select");
    setSelectedPattern(null);
    setIsPaused(false);
    setEyesFree(false);
  }

  // ─── Keyboard controls ──────────────────────────────────────────
  useEffect(() => {
    if (screen !== "session") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.code === "Escape") {
        resetToSelect();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [screen]);

  // ─── SELECT SCREEN ────────────────────────────────────────────

  if (screen === "select") {
    return (
      <div key="select" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
            {patterns.map((p) => {
              const cycleSec = p.steps.reduce((a, s) => a + s.duration, 0);
              const totalMin = Math.round((cycleSec * TOTAL_CYCLES) / 60);
              return (
                <div
                  key={p.id}
                  className="relative w-full rounded-2xl border border-teal/15 bg-deep/60 px-4 py-3.5 text-left backdrop-blur-sm transition-all duration-300 hover:border-teal/35 active:scale-[0.98]"
                >
                  <button
                    onClick={() => selectAndShowIntro(p)}
                    className="group w-full text-left"
                  >
                    <div className="flex items-start gap-3 pr-7">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-blue/80">
                        <PatternIcon id={p.id} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-cream">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-cream-dim/70">
                          {p.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-block rounded-full bg-teal/10 px-2 py-0.5 text-[10px] text-teal-soft">
                            {p.useCase}
                          </span>
                          <span className="text-[10px] text-cream-dim/40">
                            ~{totalMin} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <MicroExplanation
                    text={breathingExplanations[p.id]}
                    isOpen={expandedExplanation === p.id}
                    onToggle={() => setExpandedExplanation(expandedExplanation === p.id ? null : p.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── INTRO SCREEN ────────────────────────────────────────────

  if (screen === "intro" && selectedPattern) {
    const cycleSec = selectedPattern.steps.reduce((a, s) => a + s.duration, 0);
    const totalMin = Math.round((cycleSec * TOTAL_CYCLES) / 60);
    const stepsPreview = selectedPattern.steps
      .map((s) => `${s.label} ${s.duration}s`)
      .join(" \u2192 ");

    return (
      <div key="intro" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5 pb-24 pt-8">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          {/* Pattern icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-blue/80">
            <PatternIcon id={selectedPattern.id} />
          </div>

          {/* Pattern name */}
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-cream">
            {selectedPattern.name}
          </h2>

          {/* What you'll do */}
          <p className="mt-4 text-sm leading-relaxed text-cream">
            {breathingWhatYoullDo[selectedPattern.id]}
          </p>

          {/* Breathing pattern visualization */}
          <p className="mt-3 font-mono text-xs tracking-wide text-teal-soft/70">
            {stepsPreview}
          </p>

          {/* Why it helps */}
          <p className="mt-5 text-sm leading-relaxed text-cream-dim/60">
            {breathingExplanations[selectedPattern.id]}
          </p>

          {/* Session info */}
          <p className="mt-4 text-xs text-cream-dim/40">
            About {totalMin} minute{totalMin !== 1 ? "s" : ""}, {TOTAL_CYCLES} rounds
          </p>

          {/* Voice guidance callout */}
          <p className="mt-2 text-[11px] text-cream-dim/30">
            Voice guidance, ambient sounds, and eyes-free mode available during the session
          </p>

          {/* Begin button */}
          <button
            onClick={startSessionFromIntro}
            className="mt-8 w-full rounded-2xl bg-teal/20 px-8 py-4 text-base font-medium text-teal-soft transition-colors hover:bg-teal/30"
          >
            Begin
          </button>

          {/* Back link */}
          <button
            onClick={resetToSelect}
            className="mt-4 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
          >
            Back to patterns
          </button>
        </div>
      </div>
    );
  }

  // ─── SESSION SCREEN ───────────────────────────────────────────

  if (screen === "session" && selectedPattern && currentStep) {
    return (
      <div key="session" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        {/* Progress bar */}
        <div className="fixed left-0 right-0 top-4 z-20 px-6">
          <SessionProgressBar current={currentCycle + 1} total={TOTAL_CYCLES} />
        </div>

        {/* Minimal top bar: cycle dots + key toggles */}
        <div className="fixed left-0 right-0 top-0 z-20 safe-top">
          {/* Cycle dots */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
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
          {/* Toggles row */}
          <div className="flex items-center justify-center gap-3 pb-2">
            <button
              onClick={() => {
                const next = voiceGuidance.toggle();
                setVoiceOn(next);
              }}
              className={`text-[10px] transition-all ${
                voiceOn ? "text-teal-soft" : "text-cream-dim/30"
              }`}
            >
              {voiceOn ? "Voice on" : "Voice off"}
            </button>
            <span className="text-cream-dim/15">|</span>
            <button
              onClick={() => {
                const sounds: AmbientSound[] = ["off", "rain", "ocean", "forest"];
                const idx = sounds.indexOf(ambientSound);
                const next = sounds[(idx + 1) % sounds.length];
                if (next === "off") { ambientAudio.stop(); setAmbientSound("off"); }
                else { ambientAudio.start(next); setAmbientSound(next); }
              }}
              className="text-[10px] text-cream-dim/30 transition-all"
            >
              {ambientSound === "off" ? "Sound off" : ambientSound === "rain" ? "Rain" : ambientSound === "ocean" ? "Ocean" : "Forest"}
            </button>
            <span className="text-cream-dim/15">|</span>
            <button
              onClick={() => setEyesFree((v) => !v)}
              className={`text-[10px] transition-all ${
                eyesFree ? "text-teal-soft" : "text-cream-dim/30"
              }`}
            >
              {eyesFree ? "Eyes-free on" : "Eyes-free"}
            </button>
          </div>
        </div>

        {/* Orb + phase */}
        <div className="flex flex-col items-center">
          <BreathingOrb progress={orbProgress} phase={currentStep.phase} />

          <div className="mt-12 text-center">
            <p
              className="text-3xl font-light tracking-wide text-cream transition-opacity duration-500"
              key={`${currentCycle}-${currentStepIndex}`}
              aria-live="polite"
            >
              {currentStep.label}
            </p>
            <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/70" role="timer" aria-label={`${secondsLeft} seconds remaining`}>
              {secondsLeft}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="fixed bottom-20 z-30 flex items-center gap-6">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-teal/20 bg-deep/80 text-cream-dim transition-colors hover:border-teal/40 hover:text-cream focus:outline-none focus:ring-2 focus:ring-teal/50"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M5 3L15 9L5 15V3Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
                <rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
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

        {/* Eyes-free overlay */}
        {eyesFree && (
          <div
            className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-black/85 transition-opacity duration-500"
            aria-hidden="true"
          >
            <p className="font-mono text-7xl font-extralight tabular-nums text-white/15">
              {secondsLeft}
            </p>
          </div>
        )}

        <PresenceCue active={!isPaused} />

        {/* Paused overlay */}
        {isPaused && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/60 backdrop-blur-sm">
            <div className="flex w-full max-w-xs flex-col items-center text-center px-5">
              <p className="text-lg text-cream/80">Paused</p>
              <p className="mt-2 text-xs text-cream-dim/40 leading-relaxed">
                {currentStep.phase === "hold"
                  ? "Just hold the air gently — don't force it. If it feels uncomfortable, exhale early."
                  : currentStep.phase === "inhale"
                    ? "Breathe in slowly through your nose. If your nose is blocked, your mouth is fine too."
                    : currentStep.phase === "exhale"
                      ? "Let the air out slowly and completely. Longer exhales calm your nervous system."
                      : "Just rest for a moment before the next breath."}
              </p>
              <button
                onClick={() => setIsPaused(false)}
                className="mt-5 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  resetToSelect();
                  router.push("/grounding");
                }}
                className="mt-3 text-xs text-cream-dim/35 transition-colors hover:text-cream-dim/60"
              >
                Breathing isn&apos;t working — try grounding instead
              </button>
            </div>
          </div>
        )}

        <EscapeHatch />
      </div>
    );
  }

  // ─── COMPLETE SCREEN ──────────────────────────────────────────

  if (screen === "complete") {
    return (
      <div key="complete" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique={selectedPattern?.name ?? "Guided Breathing"}
          onDone={() => router.push("/")}
          learnLink="/learn#breathing"
        />
      </div>
    );
  }

  return null;
}
