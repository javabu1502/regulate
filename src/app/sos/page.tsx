"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";
import { CallPersonButton } from "@/components/MyPerson";
import { useWakeLock } from "@/hooks/useWakeLock";
import { haptics } from "@/lib/haptics";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";

// ─── Breathing patterns ──────────────────────────────────────────────

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

// ─── 5-4-3-2-1 Grounding ────────────────────────────────────────────

const groundingSenses = [
  { count: 5, sense: "See", prompt: "What are 5 things you can see?" },
  { count: 4, sense: "Touch", prompt: "What are 4 things you can feel?" },
  { count: 3, sense: "Hear", prompt: "What are 3 sounds?" },
  { count: 2, sense: "Smell", prompt: "What are 2 things you can smell?" },
  { count: 1, sense: "Taste", prompt: "What's 1 thing you can taste?" },
];

// ─── Web Audio for bilateral tapping ─────────────────────────────────

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

// ─── "Try something else" menu items ─────────────────────────────────

// ─── All available exercises ──────────────────────────────────────────

const allExercises = [
  { id: "breathing", label: "Breathing", desc: "Physiological sigh — calms fast", time: "~2 min" },
  { id: "extended", label: "Extended exhale", desc: "Slower, longer — deep calm", time: "~3 min" },
  { id: "tapping", label: "Bilateral tapping", desc: "Left-right rhythm — processes stress", time: "2 min" },
  { id: "grounding", label: "5-4-3-2-1 Grounding", desc: "Come back to your senses", time: "~3 min" },
  { id: "gentle-movement", label: "Gentle movement", desc: "Small movements to come back online", time: "1 min" },
];

// ─── Recommended exercises per body state ────────────────────────────

const recommendations: Record<string, string[]> = {
  panicking: ["breathing", "tapping", "grounding"],
  anxious: ["extended", "breathing", "grounding"],
  shutdown: ["gentle-movement", "tapping", "breathing"],
};

function getRecommended(state: string | null) {
  const ids = recommendations[state || "panicking"] || recommendations.panicking;
  return ids.map((id) => allExercises.find((e) => e.id === id)!);
}

function getRemaining(state: string | null) {
  const ids = recommendations[state || "panicking"] || recommendations.panicking;
  return allExercises.filter((e) => !ids.includes(e.id));
}

// ─── Types ───────────────────────────────────────────────────────────

type SOSStep =
  | "recommend"
  | "all-tools"
  | "breathing"
  | "extended-exhale"
  | "check-in"
  | "pick-tool"
  | "bilateral-tapping"
  | "grounding"
  | "cold-water"
  | "gentle-movement"
  | "final";

// ─── Wrapper for Suspense (useSearchParams needs it) ────────────────

export default function SOSPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-midnight" />}>
      <SOSPageInner />
    </Suspense>
  );
}

// ─── Main component ─────────────────────────────────────────────────

function SOSPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bodyState = searchParams.get("state"); // "panicking" | "anxious" | "shutdown"
  useWakeLock(true);

  // Core state — start at recommendations
  const [step, setStep] = useState<SOSStep>("recommend");
  const [activeTool, setActiveTool] = useState("breathing");

  // Breathing state
  const [breathingPattern, setBreathingPattern] = useState<BreathStep[]>(sighSteps);
  const [breathingCycles, setBreathingCycles] = useState(SOS_SIGH_CYCLES);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(sighSteps[0].duration);
  const [orbProgress, setOrbProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([]);

  // Timed state (cold water, bilateral tapping)
  const [timedSecondsLeft, setTimedSecondsLeft] = useState(0);
  const timedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bilateral tapping
  const [tapSide, setTapSide] = useState<"left" | "right">("left");
  const tapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Ambient audio
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("off");

  const currentBreathStep = breathingPattern[currentStepIndex] ?? null;
  const currentGrounding = groundingSenses[groundingStep];

  // ─── Cleanup ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timedRef.current) clearInterval(timedRef.current);
      if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
      cancelAnimationFrame(animFrameRef.current);
      ambientAudio.stop();
    };
  }, []);

  useEffect(() => {
    if (step === "final") haptics.complete();
  }, [step]);

  // ─── Navigation ───────────────────────────────────────────────────

  function goHome() {
    ambientAudio.stop();
    router.push("/");
  }

  // ─── Start a specific tool ────────────────────────────────────────

  function startTool(toolId: string) {
    setActiveTool(toolId);
    switch (toolId) {
      case "breathing":
        startBreathing(sighSteps, SOS_SIGH_CYCLES);
        break;
      case "extended":
        startBreathing(extendedExhaleSteps, EXTENDED_EXHALE_CYCLES);
        break;
      case "tapping":
        startBilateralTapping();
        break;
      case "grounding":
        startGrounding();
        break;
      case "gentle-movement":
        startGentleMovement();
        break;
    }
  }

  // ─── Breathing ────────────────────────────────────────────────────

  function startBreathing(pattern: BreathStep[], cycles: number) {
    setBreathingPattern(pattern);
    setBreathingCycles(cycles);
    setCurrentCycle(0);
    setCurrentStepIndex(0);
    setSecondsLeft(pattern[0].duration);
    setOrbProgress(0);
    elapsedRef.current = 0;
    setStep("breathing");
  }

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
        setStep("check-in");
      }
    }
  }, [currentStepIndex, currentCycle, breathingPattern, breathingCycles]);

  useEffect(() => {
    if (step !== "breathing") return;
    if (!currentBreathStep) return;

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

  // ─── Bilateral tapping ────────────────────────────────────────────

  function startBilateralTapping() {
    setTimedSecondsLeft(120);
    setTapSide("left");
    setStep("bilateral-tapping");
  }

  useEffect(() => {
    if (step !== "bilateral-tapping") return;

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
    }, 1000);

    return () => {
      if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
    };
  }, [step]);

  // ─── Gentle movement ───────────────────────────────────────────────

  function startGentleMovement() {
    setTimedSecondsLeft(60);
    setStep("gentle-movement");
  }

  // ─── Timed steps countdown ───────────────────────────────────────

  useEffect(() => {
    const timedSteps: SOSStep[] = ["cold-water", "bilateral-tapping", "gentle-movement"];
    if (!timedSteps.includes(step)) return;

    timedRef.current = setInterval(() => {
      setTimedSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timedRef.current) clearInterval(timedRef.current);
          if (step === "bilateral-tapping" && tapIntervalRef.current) {
            clearInterval(tapIntervalRef.current);
          }
          setStep("check-in");
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

  // ─── Cold water ───────────────────────────────────────────────────

  function startColdWater() {
    setTimedSecondsLeft(30);
    setStep("cold-water");
  }

  // ─── Grounding ────────────────────────────────────────────────────

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
          setStep("check-in");
        }
      }, 500);
    }
  }

  // ─── Save what helped ─────────────────────────────────────────────

  function recordHelped() {
    const label = allExercises.find((t) => t.id === activeTool)?.label || "Breathing";
    try {
      localStorage.setItem("regulate-last-helped", JSON.stringify({ id: activeTool, label, ts: new Date().toISOString() }));
      // Also append to session history
      const history = JSON.parse(localStorage.getItem("regulate-sos-history") || "[]");
      history.push({ tool: activeTool, label, ts: new Date().toISOString(), helped: true });
      localStorage.setItem("regulate-sos-history", JSON.stringify(history.slice(-50)));
    } catch { /* */ }
  }

  // ─── Format time ──────────────────────────────────────────────────

  function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ─── Ambient sound toggle (shared across screens) ─────────────────

  function AmbientToggle() {
    return (
      <div className="fixed right-4 top-6 z-10 flex gap-1.5">
        {(["rain", "ocean", "off"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              if (s === "off") { ambientAudio.stop(); setAmbientSound("off"); }
              else { ambientAudio.start(s); setAmbientSound(s); }
            }}
            className={`rounded-full px-2.5 py-1 text-[10px] transition-all ${
              ambientSound === s
                ? "bg-teal/20 text-teal-soft"
                : "text-cream-dim/30 hover:text-cream-dim/50"
            }`}
          >
            {s === "off" ? "Quiet" : s === "rain" ? "Rain" : "Ocean"}
          </button>
        ))}
      </div>
    );
  }

  // Back button (shared)
  function BackButton({ onClick }: { onClick: () => void }) {
    return (
      <button onClick={onClick} className="fixed left-4 top-6 z-10 p-2 text-cream-dim/40 hover:text-cream-dim" aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    );
  }

  // ─── RECOMMEND (shows top picks based on body state) ───────────────

  if (step === "recommend") {
    const recommended = getRecommended(bodyState);
    const stateLabel =
      bodyState === "panicking" ? "Let\u2019s slow things down" :
      bodyState === "shutdown" ? "Let\u2019s bring you back gently" :
      "Here are some things that can help";

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={goHome} />

        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">{stateLabel}</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/50">Pick one. We&apos;ll start right away.</p>

          <div className="mt-8 flex flex-col gap-3">
            {recommended.map((ex) => (
              <button
                key={ex.id}
                onClick={() => startTool(ex.id)}
                className="w-full rounded-2xl border border-teal/20 bg-teal/5 px-5 py-4 text-left transition-all hover:border-teal/40 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-cream">{ex.label}</span>
                  <span className="text-[10px] text-cream-dim/40">{ex.time}</span>
                </div>
                <span className="mt-1 block text-xs text-cream-dim/50">{ex.desc}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep("all-tools")}
            className="mt-5 w-full text-center text-sm text-cream-dim/40 transition-colors hover:text-cream-dim"
          >
            See more options
          </button>

          {/* Crisis line */}
          <div className="mt-8 flex justify-center">
            <a href="tel:988" className="text-[10px] text-cream-dim/25 underline underline-offset-2 hover:text-cream-dim/50">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── ALL TOOLS (expanded list) ────────────────────────────────────

  if (step === "all-tools") {
    const recommended = getRecommended(bodyState);
    const remaining = getRemaining(bodyState);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={() => setStep("recommend")} />

        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">All exercises</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/50">Pick any one to start.</p>

          {/* Recommended first */}
          <p className="mb-2 mt-8 text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
            Recommended for you
          </p>
          <div className="flex flex-col gap-2">
            {recommended.map((ex) => (
              <button
                key={ex.id}
                onClick={() => startTool(ex.id)}
                className="w-full rounded-xl border border-teal/20 bg-teal/5 px-4 py-3.5 text-left transition-all hover:border-teal/40 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cream">{ex.label}</span>
                  <span className="text-[10px] text-cream-dim/40">{ex.time}</span>
                </div>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{ex.desc}</span>
              </button>
            ))}
          </div>

          {/* Others */}
          <p className="mb-2 mt-6 text-[10px] font-medium uppercase tracking-widest text-cream-dim/30">
            Other exercises
          </p>
          <div className="flex flex-col gap-2">
            {remaining.map((ex) => (
              <button
                key={ex.id}
                onClick={() => startTool(ex.id)}
                className="w-full rounded-xl border border-slate-blue/30 bg-deep/40 px-4 py-3.5 text-left transition-all hover:border-teal/20 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cream">{ex.label}</span>
                  <span className="text-[10px] text-cream-dim/40">{ex.time}</span>
                </div>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{ex.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── BREATHING (the default — starts immediately) ──────────────────

  if (step === "breathing" && currentBreathStep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />
        <AmbientToggle />

        {/* Cycle progress */}
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

        {activeTool === "extended" && (
          <p className="fixed top-14 text-xs text-cream-dim/40">Extended exhale</p>
        )}

        <BreathingOrb progress={orbProgress} phase={currentBreathStep.phase} />

        <div className="mt-12 text-center">
          <p className="text-3xl font-light tracking-wide text-cream" aria-live="polite">{currentBreathStep.label}</p>
          <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/70">{secondsLeft}</p>
        </div>

        {/* Crisis line — always visible, never distracting */}
        <div className="fixed bottom-16 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-3">
            <a href="tel:988" className="text-[10px] text-cream-dim/30 underline underline-offset-2">988 Lifeline</a>
            <span className="text-[10px] text-cream-dim/20">|</span>
            <span className="text-[10px] text-cream-dim/30">Text HOME to 741741</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── BILATERAL TAPPING ────────────────────────────────────────────

  if (step === "bilateral-tapping") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight">
        <BackButton onClick={goHome} />
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {formatTimer(timedSecondsLeft)}
        </div>

        <div className="flex w-full flex-1">
          <div className={`flex flex-1 items-center justify-center transition-colors duration-300 ${tapSide === "left" ? "bg-teal/8" : ""}`}>
            <div className={`h-16 w-16 rounded-full transition-all duration-200 ${tapSide === "left" ? "scale-110 bg-teal/30 shadow-lg shadow-teal/20" : "scale-90 bg-slate-blue/20"}`} />
          </div>
          <div className={`flex flex-1 items-center justify-center transition-colors duration-300 ${tapSide === "right" ? "bg-teal/8" : ""}`}>
            <div className={`h-16 w-16 rounded-full transition-all duration-200 ${tapSide === "right" ? "scale-110 bg-teal/30 shadow-lg shadow-teal/20" : "scale-90 bg-slate-blue/20"}`} />
          </div>
        </div>

        <div className="fixed bottom-24 text-center">
          <p className="text-sm text-cream-dim">Let&apos;s tap together. Left, right, left, right.</p>
        </div>

        <button
          onClick={() => {
            if (timedRef.current) clearInterval(timedRef.current);
            if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
            setStep("check-in");
          }}
          className="fixed bottom-14 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
        >
          I&apos;m ready to stop
        </button>
      </div>
    );
  }

  // ─── COLD WATER ───────────────────────────────────────────────────

  if (step === "cold-water") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {timedSecondsLeft > 0 ? formatTimer(timedSecondsLeft) : ""}
        </div>

        <div className="text-center">
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

          <h2 className="text-2xl font-light text-cream">Let&apos;s activate your dive reflex</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            Splash cold water on your face, or hold something cold against your cheeks and forehead. Let&apos;s stay here for 30 seconds.
          </p>
        </div>

        <button
          onClick={() => {
            if (timedRef.current) clearInterval(timedRef.current);
            setStep("check-in");
          }}
          className="fixed bottom-14 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
        >
          Done
        </button>
      </div>
    );
  }

  // ─── GENTLE MOVEMENT (shutdown state) ──────────────────────────────

  if (step === "gentle-movement") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />
        <div className="fixed right-4 top-6 font-mono text-sm text-cream-dim/40">
          {timedSecondsLeft > 0 ? formatTimer(timedSecondsLeft) : ""}
        </div>

        <div className="text-center">
          <div className="mx-auto mb-8">
            <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto">
              <circle cx="40" cy="30" r="10" fill="rgba(110,196,199,0.15)" stroke="rgba(110,196,199,0.3)" strokeWidth="1.5">
                <animate attributeName="cx" values="35;45;35" dur="3s" repeatCount="indefinite" />
              </circle>
              <line x1="40" y1="40" x2="40" y2="65" stroke="rgba(110,196,199,0.2)" strokeWidth="1.5">
                <animate attributeName="x1" values="35;45;35" dur="3s" repeatCount="indefinite" />
                <animate attributeName="x2" values="38;42;38" dur="3s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>

          <h2 className="text-2xl font-light text-cream">Let&apos;s wake your body up gently</h2>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
            Wiggle your fingers and toes. Roll your shoulders slowly. Rock side to side. Small movements — just enough to feel something.
          </p>
        </div>

        <button
          onClick={() => {
            if (timedRef.current) clearInterval(timedRef.current);
            setStep("check-in");
          }}
          className="fixed bottom-14 rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
        >
          {timedSecondsLeft === 0 ? "Ready to continue" : "I\u2019m ready"}
        </button>
      </div>
    );
  }

  // ─── GROUNDING ────────────────────────────────────────────────────

  if (step === "grounding") {
    const totalItems = groundingSenses.reduce((s, g) => s + g.count, 0);
    const doneItems = groundingSenses.slice(0, groundingStep).reduce((s, g) => s + g.count, 0) + checked.filter(Boolean).length;
    const progress = (doneItems / totalItems) * 100;

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />
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
      </div>
    );
  }

  // ─── CHECK-IN (after any exercise) ────────────────────────────────

  if (step === "check-in") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-light text-cream">How does your body feel?</h2>
          <p className="mt-2 text-sm text-cream-dim">No rush. Just notice.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => {
                recordHelped();
                setStep("final");
              }}
              className="w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Lighter
            </button>
            <button
              onClick={() => setStep("pick-tool")}
              className="w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all hover:bg-candle/25 active:scale-[0.98]"
            >
              I need something else
            </button>
            <button
              onClick={() => setStep("final")}
              className="mt-1 text-xs text-cream-dim/30 hover:text-cream-dim"
            >
              I&apos;m done for now
            </button>
          </div>

          {/* Crisis line always visible */}
          <div className="mt-8 flex flex-col items-center gap-1">
            <a href="tel:988" className="text-xs text-cream-dim/40 underline underline-offset-2 hover:text-cream-dim">988 Suicide &amp; Crisis Lifeline</a>
            <span className="text-[10px] text-cream-dim/30">Text HOME to 741741</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── PICK TOOL (after check-in → "I need something else") ──────────

  if (step === "pick-tool") {
    const others = allExercises.filter((e) => e.id !== activeTool);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={() => setStep("check-in")} />
        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">Let&apos;s try something different</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/50">Pick one. We&apos;ll start right away.</p>

          <div className="mt-8 flex flex-col gap-2">
            {others.map((ex) => (
              <button
                key={ex.id}
                onClick={() => startTool(ex.id)}
                className="w-full rounded-xl border border-slate-blue/30 bg-deep/40 px-4 py-3.5 text-left transition-all hover:border-teal/20 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cream">{ex.label}</span>
                  <span className="text-[10px] text-cream-dim/40">{ex.time}</span>
                </div>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{ex.desc}</span>
              </button>
            ))}
          </div>

          <button onClick={goHome} className="mt-5 w-full text-center text-xs text-cream-dim/30 hover:text-cream-dim">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ─── FINAL ────────────────────────────────────────────────────────

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
            You&apos;re okay. That took courage.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/journal"
              className="rounded-xl bg-candle/15 px-8 py-3 text-sm font-medium text-candle transition-colors hover:bg-candle/25"
            >
              Log this moment
            </Link>
            <CallPersonButton />
            <button
              onClick={goHome}
              className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
