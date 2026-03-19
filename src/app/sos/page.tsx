"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BreathingOrb from "@/components/BreathingOrb";
import { CallPersonButton } from "@/components/MyPerson";
import { useWakeLock } from "@/hooks/useWakeLock";
import { haptics } from "@/lib/haptics";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";
import { getPersonalizedRecommendations } from "@/lib/recommendations";
import { isPremium } from "@/lib/premium";
import PresenceCue from "@/components/PresenceCue";
import { useAudioGuide } from "@/hooks/useAudioGuide";

// ─── Breathing patterns ──────────────────────────────────────────────

type Phase = "inhale" | "hold" | "exhale" | "rest";

interface BreathStep {
  phase: Phase;
  duration: number;
  label: string;
}

const sighSteps: BreathStep[] = [
  { phase: "inhale", duration: 2, label: "Inhale" },
  { phase: "inhale", duration: 2, label: "Sip in more" },
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
  { count: 5, sense: "See", prompt: "Name 5 things you can see right now." },
  { count: 4, sense: "Touch", prompt: "Notice 4 things you can physically feel." },
  { count: 3, sense: "Hear", prompt: "What are 3 sounds around you?" },
  { count: 2, sense: "Smell", prompt: "Can you notice 2 smells?" },
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

// ─── Location context filtering ─────────────────────────────────────
// "Where are you?" - filters exercises to what's appropriate for the setting

type LocationContext = "anywhere" | "home" | "work" | "bed" | "people" | "driving";

const locationContextOptions: { id: LocationContext; label: string; sub: string; icon: string }[] = [
  { id: "home", label: "At home", sub: "All techniques available", icon: "\u{1F3E0}" },
  { id: "work", label: "At work / in public", sub: "Discreet techniques only", icon: "\u{1F3E2}" },
  { id: "bed", label: "In bed", sub: "Gentle, sleep-friendly", icon: "\u{1F6CF}\uFE0F" },
  { id: "people", label: "With people", sub: "Nothing that looks unusual", icon: "\u{1F465}" },
  { id: "driving", label: "Driving / commuting", sub: "Audio-only, eyes open", icon: "\u{1F697}" },
];

// Which exercise IDs are allowed in each context
const contextAllowedExercises: Record<LocationContext, string[] | "all"> = {
  anywhere: "all",
  home: "all",
  work: ["breathing", "extended", "grounding", "body-scan", "affirmations"],
  bed: ["breathing", "extended", "body-scan", "sleep", "affirmations"],
  people: ["breathing", "extended", "grounding", "affirmations"],
  driving: ["breathing", "extended"],
};

const contextLabels: Record<LocationContext, string> = {
  anywhere: "Anywhere",
  home: "At home",
  work: "At work",
  bed: "In bed",
  people: "With people",
  driving: "Driving",
};

function filterByContext(exercises: Exercise[], context: LocationContext): Exercise[] {
  const allowed = contextAllowedExercises[context];
  if (allowed === "all") return exercises;
  return exercises.filter((e) => allowed.includes(e.id));
}

// ─── All available exercises ──────────────────────────────────────────
// "inline" = runs inside the SOS page, "link" = navigates to a module page

interface Exercise {
  id: string;
  label: string;
  desc: string;
  icon: string;
  time: string;
  type: "inline" | "link";
  href?: string;
}

const allExercises: Exercise[] = [
  // Inline (built into SOS flow)
  { id: "breathing", label: "Physiological sigh", icon: "\u{1F32C}\uFE0F", desc: "Two quick inhales, one long exhale. You'll feel it right away.", time: "~1 min", type: "inline" },
  { id: "extended", label: "Extended exhale", icon: "\u{1FAC1}", desc: "Breathe in for 4, out for 8. Slows everything down.", time: "~1 min", type: "inline" },
  { id: "tapping", label: "Bilateral tapping", icon: "\u{1F932}", desc: "Tap left, tap right. The rhythm gives your brain something to hold onto.", time: "2 min", type: "inline" },
  { id: "grounding", label: "5-4-3-2-1 Grounding", icon: "\u{1F441}\uFE0F", desc: "Name what you see, hear, and feel. Gets you out of your head.", time: "~3 min", type: "inline" },
  { id: "gentle-movement", label: "Gentle movement", icon: "\u{1F30A}", desc: "Wiggle, rock, stretch. Even tiny movements help.", time: "1 min", type: "inline" },
  // Links (navigate to module pages)
  { id: "body-scan", label: "Body scan", icon: "\u{1F9D8}", desc: "Go through your body slowly. Notice what's tight, let it soften.", time: "5 min", type: "link", href: "/body-scan" },
  { id: "somatic", label: "Somatic exercises", icon: "\u{1FAE8}", desc: "Shake it out, hum, move. Let your body release what it's holding.", time: "2-5 min", type: "link", href: "/somatic" },
  { id: "affirmations", label: "Affirmations", icon: "\u{1F4AC}", desc: "Simple words that meet you where you are.", time: "~2 min", type: "link", href: "/affirmations" },
  { id: "sleep", label: "Sleep sequence", icon: "\u{1F319}", desc: "Breathing and relaxation for when you can't shut off.", time: "3-5 min", type: "link", href: "/sleep" },
];

// ─── Recommended exercises per body state ────────────────────────────
// Uses personalized recommendations from user history + clinical defaults

function getRecommended(state: string | null): Exercise[] {
  const ids = getPersonalizedRecommendations(state || "panicking");
  return ids.map((id) => allExercises.find((e) => e.id === id)!).filter(Boolean);
}

function getRemaining(state: string | null): Exercise[] {
  const ids = getPersonalizedRecommendations(state || "panicking");
  return allExercises.filter((e) => !ids.includes(e.id));
}

// ─── Per-state explanations for why each exercise helps ──────────────

type BodyStateKey = "panicking" | "anxious" | "shutdown";

const exerciseWhyMap: Record<BodyStateKey, Record<string, string>> = {
  panicking: {
    breathing: "This one works fast. The double inhale stimulates your vagus nerve, and the long exhale tells your body it's okay to slow down. Most people feel a shift within a few breaths.",
    extended: "When you breathe out longer than you breathe in, your parasympathetic nervous system kicks in - your body's built-in brake pedal. Your heart rate actually drops. You can feel it happen.",
    tapping: "Bilateral stimulation - the left-right rhythm - gives your brain something to focus on besides the panic. It helps you process what's happening instead of just spinning.",
    grounding: "Panic pulls you into the future - into what might happen. Your senses bring you back to right now, where you're actually okay.",
    "gentle-movement": "When you're frozen in panic, even wiggling your toes can help. Small movements remind your body that it can move, that it's not stuck.",
    "body-scan": "Instead of fighting the panic, you just notice your body. Where's the tension? Where's it okay? It gives your mind somewhere to go besides the spiral.",
    somatic: "Panic creates a lot of physical energy. Shaking, humming, and moving help your body actually discharge it instead of keeping it locked up.",
    affirmations: "When panic is loud, a few simple words can cut through. Not positive thinking - just something steady to hold onto.",
    sleep: "Breathing plus progressive muscle relaxation. You tense, then release. It helps your whole body let go, even when your mind won't stop.",
  },
  anxious: {
    breathing: "Anxiety makes your breathing shallow, which makes the anxiety worse. This breaks that loop. Two quick inhales, long exhale, and your body starts to ease up.",
    extended: "Longer exhales activate your parasympathetic nervous system, which slows your heart rate down. One of the most reliable ways to take the edge off.",
    tapping: "The left-right rhythm helps your brain process anxious thoughts instead of just looping on them. Think of it like giving your brain a track to run on.",
    grounding: "Anxiety lives in worried thoughts about what might happen. Your five senses bring you back to what's actually happening right now.",
    "gentle-movement": "Rocking and swaying are naturally calming. It's why we do it instinctively. Gentle movement settles your body when your mind won't stop.",
    "body-scan": "Anxiety hides in your body as tension you don't even notice. Jaw, shoulders, stomach. Scanning helps you find it and let it soften.",
    somatic: "Your body holds anxiety as muscle tension and restlessness. These exercises give all that energy somewhere to go.",
    affirmations: "Anxious thoughts repeat themselves. Affirmations aren't about positive thinking - they give your mind a different track, one you chose.",
    sleep: "When anxiety keeps you up, body-first relaxation works better than trying to think your way to sleep. This sequence works with your body, not against it.",
  },
  shutdown: {
    breathing: "When you're shut down, breathing can feel hard. The double inhale is gentle - it opens things up without forcing anything.",
    extended: "Long, slow exhales help you come back gradually. No rush. Just letting your body know it's safe to feel things again.",
    tapping: "The gentle left-right sensation gives your body some input without overwhelming it. Just enough to start waking things up.",
    grounding: "When you feel numb or far away, your senses are a way back in. Each thing you notice reconnects you a little more.",
    "gentle-movement": "Small movements tell your body it's okay to come back. Wiggling, rocking, stretching. Nothing big - just enough.",
    "body-scan": "When everything feels muted, scanning helps you find the places where you can still feel something. That's your starting point.",
    somatic: "Gentle shaking, humming, and movement help your body shift from shutdown back toward feeling present. Go as slow as you need to.",
    affirmations: "When shutdown makes everything feel far away, simple warm words can still reach you. Not demanding, just an invitation.",
    sleep: "If your body is pulling you toward collapse, this sequence helps you rest on purpose. There's a difference between shutdown and chosen rest.",
  },
};

function getExerciseWhy(state: string, exerciseId: string): string {
  const key = (state || "panicking") as BodyStateKey;
  return exerciseWhyMap[key]?.[exerciseId] || "";
}

// ─── Body state check options ────────────────────────────────────────

const bodyStateOptions: { id: BodyStateKey; label: string; sub: string }[] = [
  { id: "panicking", label: "Panicking or overwhelmed", sub: "Racing heart, can't breathe, everything is too much" },
  { id: "anxious", label: "Anxious or on edge", sub: "Tense, worried, restless, can't settle" },
  { id: "shutdown", label: "Shut down or numb", sub: "Disconnected, frozen, can't feel much" },
];

// ─── Types ───────────────────────────────────────────────────────────

type SOSStep =
  | "body-check"
  | "auto-start"
  | "context"
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
  const bodyStateParam = searchParams.get("state"); // "panicking" | "anxious" | "shutdown"
  useWakeLock(true);

  // Local body state - set by URL param or user selection in body-check step
  const [selectedBodyState, setSelectedBodyState] = useState<string | null>(bodyStateParam);

  // Core state - if body state provided via URL, show recommendations; otherwise ask
  const [step, setStep] = useState<SOSStep>(() => bodyStateParam ? "recommend" : "body-check");
  const [activeTool, setActiveTool] = useState("breathing");

  // Location context - defaults to "anywhere" (no filter)
  const [locationContext, setLocationContext] = useState<LocationContext>("anywhere");

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

  // Voice audio
  const breathingAudio = useAudioGuide("breathing");
  const sosAudio = useAudioGuide("sos");

  // Check back later
  const [checkBackScheduled, setCheckBackScheduled] = useState(false);

  // My Person contacts (for exercise screens)
  const [myPersonContacts, setMyPersonContacts] = useState<{name: string; phone: string}[]>([]);

  // Last helped
  const [lastHelped, setLastHelped] = useState<{id: string; label: string; ts: string} | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("my_person");
      if (raw) {
        const parsed = JSON.parse(raw);
        const contacts = Array.isArray(parsed)
          ? parsed.filter((c: { name?: string; phone?: string }) => c.name && c.phone)
          : parsed && parsed.name && parsed.phone ? [parsed] : [];
        setMyPersonContacts(contacts);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("regulate-last-helped");
      if (raw) {
        const data = JSON.parse(raw);
        const daysSince = (Date.now() - new Date(data.ts).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) setLastHelped(data);
      }
    } catch {}
  }, []);

  // After context is selected, auto-start the #1 recommended exercise when a body state is provided.
  // During panic the prefrontal cortex is offline - don't make users read and choose.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (step !== "auto-start" || autoStarted.current) return;
    autoStarted.current = true;
    const recommended = filterByContext(getRecommended(selectedBodyState), locationContext);
    if (recommended.length > 0) {
      startTool(recommended[0].id);
    } else {
      setStep("recommend");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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

  // ─── Context selection handler ─────────────────────────────────────

  function selectContext(ctx: LocationContext) {
    setLocationContext(ctx);
    if (selectedBodyState) {
      // Go to auto-start (will pick the best context-appropriate exercise)
      autoStarted.current = false;
      setStep("auto-start");
    } else {
      setStep("recommend");
    }
  }

  // ─── Start a specific tool ────────────────────────────────────────

  function startTool(toolId: string) {
    const exercise = allExercises.find((e) => e.id === toolId);
    if (exercise?.type === "link" && exercise.href) {
      router.push(exercise.href);
      return;
    }
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

  // Play breathing voice clips
  const sosSenseFileMap = ["see-5", "touch-4", "hear-3", "smell-2", "taste-1"];
  useEffect(() => {
    if (step === "breathing" && currentBreathStep) {
      const filename = currentBreathStep.label.toLowerCase().replace(/\s+/g, "-");
      breathingAudio.play(filename);
    }
  }, [currentStepIndex, currentCycle, step]);

  // Play grounding voice clips
  useEffect(() => {
    if (step === "grounding") {
      sosAudio.play(sosSenseFileMap[groundingStep]);
    }
  }, [groundingStep, step]);

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

  function recordPartialSession() {
    if (!isPremium()) return;
    const label = allExercises.find((t) => t.id === activeTool)?.label || "Exercise";
    try {
      const history = JSON.parse(localStorage.getItem("regulate-sos-history") || "[]");
      history.push({ tool: activeTool, label, ts: new Date().toISOString(), helped: false, partial: true });
      localStorage.setItem("regulate-sos-history", JSON.stringify(history.slice(-50)));
    } catch {}
  }

  function recordHelped() {
    if (!isPremium()) return;
    const label = allExercises.find((t) => t.id === activeTool)?.label || "Breathing";
    try {
      localStorage.setItem("regulate-last-helped", JSON.stringify({ id: activeTool, label, ts: new Date().toISOString() }));
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
        {(["rain", "ocean", "forest", "white-noise", "off"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              if (s === "off" || ambientSound === s) { ambientAudio.stop(); setAmbientSound("off"); }
              else { ambientAudio.start(s); setAmbientSound(s); }
            }}
            className={`rounded-full px-2.5 py-2 text-[10px] transition-all ${
              ambientSound === s
                ? "bg-teal/20 text-teal-soft"
                : "text-cream-dim/60 hover:text-cream-dim/70"
            }`}
            aria-label={`${s === "off" ? "Quiet" : s === "rain" ? "Rain" : s === "ocean" ? "Ocean" : s === "forest" ? "Forest" : "White noise"} ambient sound`}
            aria-pressed={ambientSound === s}
          >
            {s === "off" ? "Quiet" : s === "rain" ? "Rain" : s === "ocean" ? "Ocean" : s === "forest" ? "Forest" : "Noise"}
          </button>
        ))}
      </div>
    );
  }

  // Small "Call [Name]" button for active exercise screens
  function CallDuringExercise() {
    if (myPersonContacts.length === 0) return null;
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {myPersonContacts.map((c, i) => (
          <a
            key={i}
            href={`tel:${c.phone}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-blue/20 px-3 py-2 text-xs text-cream-dim/60 transition-colors hover:border-teal/30 hover:text-cream-dim"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 2.5C3 2.5 4.5 2 5.5 3.5L6.5 5.5C6.5 5.5 5.5 6.5 6.5 8C7.5 9.5 8.5 9 8.5 9L10.5 10C12 11 11.5 12.5 11.5 12.5C10.5 14 8 13.5 6 11.5C4 9.5 2.5 7 3 5C3 5 3 3.5 3 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Call {c.name}
          </a>
        ))}
      </div>
    );
  }

  // "Try something else" link (shared across exercise screens)
  function TrySomethingElse() {
    return (
      <button
        onClick={() => {
          recordPartialSession();
          setStep("pick-tool");
        }}
        className="min-h-[44px] text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim/70"
      >
        Try something else
      </button>
    );
  }

  // Back button (shared)
  function BackButton({ onClick }: { onClick: () => void }) {
    return (
      <button onClick={onClick} className="fixed left-4 top-6 z-10 flex h-11 w-11 items-center justify-center text-cream-dim/60 hover:text-cream-dim focus:outline-none focus:ring-2 focus:ring-teal/50 rounded-lg" aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    );
  }

  // Home button - exits SOS flow entirely
  function HomeButton() {
    return (
      <button onClick={goHome} className="fixed right-4 top-6 z-10 flex h-11 w-11 items-center justify-center text-cream-dim/40 hover:text-cream-dim focus:outline-none focus:ring-2 focus:ring-teal/50 rounded-lg" aria-label="Go home">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10L10 3L17 10M5 8.5V16H8.5V12H11.5V16H15V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    );
  }

  // Context badge - small indicator showing current location filter with change option
  function ContextBadge() {
    if (locationContext === "anywhere") return null;
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] text-cream-dim/40">
          {contextLabels[locationContext]}
        </span>
        <button
          onClick={() => setStep("context")}
          className="text-[10px] text-teal-soft/50 underline underline-offset-2 transition-colors hover:text-teal-soft"
        >
          Change
        </button>
      </div>
    );
  }

  // ─── BODY CHECK (how is your body?) ──────────────────────────────────

  if (step === "body-check") {
    return (
      <div key="body-check" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />

        <div className="w-full max-w-sm">
          <PresenceCue active />
          <h2 className="mt-4 text-center text-xl font-light text-cream">How is your body right now?</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/60">
            This helps us pick the right tool for you.
          </p>

          {/* Instant breathing — skip all choices */}
          <div className="mt-8">
            <button
              onClick={() => {
                setActiveTool("breathing");
                startBreathing(sighSteps, SOS_SIGH_CYCLES);
              }}
              className="w-full rounded-2xl border border-candle/30 bg-candle/10 px-5 py-6 text-center transition-all hover:border-candle/40 active:scale-[0.98]"
            >
              <span className="block text-lg font-medium text-cream">Just breathe with me</span>
              <span className="mt-1.5 block text-xs text-cream-dim/50">No choices needed — we&apos;ll start right away</span>
            </button>
          </div>

          {/* Divider */}
          <div className="mt-6 mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-blue/15" />
            <span className="text-[11px] text-cream-dim/40">or tell us more</span>
            <div className="h-px flex-1 bg-slate-blue/15" />
          </div>

          <div className="flex flex-col gap-3">
            {bodyStateOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedBodyState(opt.id);
                  setStep("recommend");
                }}
                className="w-full rounded-2xl border border-slate-blue/20 bg-deep/40 px-5 py-5 text-left transition-all hover:border-teal/30 active:scale-[0.98]"
              >
                <span className="block text-base font-medium text-cream">{opt.label}</span>
                <span className="mt-1 block text-xs text-cream-dim/60">{opt.sub}</span>
              </button>
            ))}

            {/* Can't sleep */}
            <button
              onClick={() => router.push("/sleep")}
              className="w-full rounded-2xl border border-lavender/15 bg-lavender/5 px-5 py-5 text-left transition-all hover:border-lavender/25 active:scale-[0.98]"
            >
              <span className="block text-base font-medium text-lavender">Can&apos;t sleep</span>
              <span className="mt-1 block text-xs text-cream-dim/60">Restless, racing thoughts, wide awake</span>
            </button>
          </div>

          {/* I'm okay escape */}
          <button
            onClick={goHome}
            className="mt-5 w-full text-center text-sm text-cream-dim/50 transition-colors hover:text-cream-dim/70"
          >
            I&apos;m okay - just exploring
          </button>

          {/* Crisis line */}
          <div className="mt-8 flex justify-center">
            <a href="tel:988" className="text-[10px] text-cream-dim/60 underline underline-offset-2 hover:text-cream-dim/70">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── CONTEXT (where are you?) ──────────────────────────────────────

  if (step === "context") {
    const stateColor =
      selectedBodyState === "panicking" ? "border-coral/20" :
      selectedBodyState === "shutdown" ? "border-indigo/20" :
      selectedBodyState === "anxious" ? "border-candle/20" :
      "border-teal/20";

    return (
      <div key="context" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={goHome} />

        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">Where are you right now?</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/60">
            We&apos;ll show what works for where you are.
          </p>

          <div className="mt-8 flex flex-col gap-2.5">
            {locationContextOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectContext(opt.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border ${stateColor} bg-deep/40 px-5 py-4 text-left transition-all hover:border-teal/30 active:scale-[0.98]`}
              >
                <span className="text-2xl" role="img" aria-hidden="true">{opt.icon}</span>
                <div className="min-w-0">
                  <span className="block text-base font-medium text-cream">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-cream-dim/60">{opt.sub}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => selectContext("anywhere")}
            className="mt-5 w-full min-h-[44px] text-center text-sm text-cream-dim/60 transition-colors hover:text-cream-dim"
          >
            Skip - show everything
          </button>

          {/* Crisis line */}
          <div className="mt-8 flex justify-center">
            <a href="tel:988" className="text-[10px] text-cream-dim/60 underline underline-offset-2 hover:text-cream-dim/70">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── AUTO-START (brief loading state while exercise initializes) ────

  if (step === "auto-start") {
    return <div className="fixed inset-0 bg-midnight" />;
  }

  // ─── RECOMMEND (top pick + why + alternatives) ──────────────────────

  if (step === "recommend") {
    const recommended = filterByContext(getRecommended(selectedBodyState), locationContext);
    const remaining = filterByContext(getRemaining(selectedBodyState), locationContext);
    const alternatives = remaining.slice(0, 3);
    const topPick = recommended[0] || null;
    const otherPicks = recommended.slice(1);

    const stateLabel =
      selectedBodyState === "panicking" ? "Let\u2019s slow things down" :
      selectedBodyState === "shutdown" ? "Let\u2019s bring you back gently" :
      selectedBodyState === "anxious" ? "Let\u2019s settle your system" :
      "Here\u2019s what can help";

    return (
      <div key="recommend" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={() => bodyStateParam ? goHome() : setStep("body-check")} />
        {!bodyStateParam && <HomeButton />}

        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">{stateLabel}</h2>
          <div className="mt-1.5">
            <ContextBadge />
          </div>

          {/* Top recommendation with "why" */}
          {topPick && (
            <div className="mt-8">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-teal-soft/60">
                We recommend
              </p>
              <button
                onClick={() => startTool(topPick.id)}
                className="w-full rounded-2xl border border-teal/25 bg-teal/8 px-5 py-5 text-left transition-all hover:border-teal/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" role="img" aria-hidden="true">{topPick.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-base font-medium text-cream">{topPick.label}</span>
                    <span className="block text-xs text-cream-dim/40 mt-0.5">{topPick.time}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-cream-dim/60">
                  {getExerciseWhy(selectedBodyState || "panicking", topPick.id)}
                </p>
              </button>
            </div>
          )}

          {/* Other recommended + alternatives */}
          {(otherPicks.length > 0 || alternatives.length > 0) && (
            <div className="mt-6">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-cream-dim/40">
                Or try one of these
              </p>
              <div className="flex flex-col gap-2">
                {[...otherPicks, ...alternatives].slice(0, 3).map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => startTool(ex.id)}
                    className="w-full rounded-xl border border-slate-blue/15 bg-deep/30 px-4 py-4 text-left transition-all hover:border-teal/25 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base" role="img" aria-hidden="true">{ex.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-cream">{ex.label}</span>
                        <span className="block text-[11px] text-cream-dim/40 mt-0.5">{ex.time}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-cream-dim/45">
                      {getExerciseWhy(selectedBodyState || "panicking", ex.id)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("all-tools")}
            className="mt-5 flex min-h-[44px] items-center justify-center gap-1 w-full text-xs text-cream-dim/60 transition-colors hover:text-cream-dim/70"
          >
            {selectedBodyState === "panicking" ? "All exercises for panic" :
             selectedBodyState === "anxious" ? "All exercises for anxiety" :
             selectedBodyState === "shutdown" ? "All exercises for shutdown" :
             "See all exercises"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          {/* My toolkit link */}
          <Link
            href="/toolkit"
            className="mt-3 flex min-h-[44px] items-center justify-center gap-1.5 w-full text-xs text-candle/50 transition-colors hover:text-candle/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            My emergency toolkit
          </Link>

          {/* Crisis line */}
          <div className="mt-6 flex justify-center">
            <a href="tel:988" className="text-[10px] text-cream-dim/60 underline underline-offset-2 hover:text-cream-dim/70">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── ALL TOOLS (expanded list) ────────────────────────────────────

  if (step === "all-tools") {
    const recommended = filterByContext(getRecommended(selectedBodyState), locationContext);
    const recommendedIds = new Set(recommended.map((e) => e.id));
    const remaining = filterByContext(
      allExercises.filter((e) => !recommendedIds.has(e.id)),
      locationContext,
    );

    return (
      <div key="all-tools" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={() => setStep("recommend")} />
        <HomeButton />

        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">
            {selectedBodyState === "panicking" ? "Exercises for panic" :
             selectedBodyState === "anxious" ? "Exercises for anxiety" :
             selectedBodyState === "shutdown" ? "Exercises for shutdown" :
             "All exercises"}
          </h2>
          <p className="mt-2 text-center text-xs text-cream-dim/60">
            {selectedBodyState === "panicking" ? "These can help take the edge off when everything is too much." :
             selectedBodyState === "anxious" ? "These help your body settle when you can't stop buzzing." :
             selectedBodyState === "shutdown" ? "Gentle ways to come back when you feel numb or far away." :
             "Pick any one to start."}
          </p>
          <div className="mt-1.5">
            <ContextBadge />
          </div>

          {/* Recommended first */}
          {recommended.length > 0 && (
            <>
              <p className="mb-2 mt-6 text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
                Recommended for you
              </p>
              <div className="flex flex-col gap-2">
                {recommended.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => startTool(ex.id)}
                    className="w-full rounded-xl border border-teal/20 bg-teal/5 px-4 py-4 text-left transition-all hover:border-teal/40 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base" role="img" aria-hidden="true">{ex.icon}</span>
                      <span className="flex-1 text-sm font-medium text-cream">{ex.label}</span>
                      <span className="text-[10px] text-cream-dim/40">{ex.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Others */}
          {remaining.length > 0 && (
            <>
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
                    <span className="mt-0.5 block text-xs text-cream-dim/60">{ex.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── BREATHING (the default - starts immediately) ──────────────────

  if (step === "breathing" && currentBreathStep) {
    return (
      <div key="breathing" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={() => { recordPartialSession(); goHome(); }} />
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
          <p className="mt-3 font-mono text-5xl font-extralight tabular-nums text-cream/70" role="timer" aria-label={`${secondsLeft} seconds remaining`}>{secondsLeft}</p>
        </div>

        {/* Try something else + Call person + Crisis line - always visible, never distracting */}
        <div className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-3">
          <CallDuringExercise />
          <TrySomethingElse />
          <div className="flex items-center gap-3">
            <a href="tel:988" className="text-[10px] text-cream-dim/60 underline underline-offset-2">988 Lifeline</a>
            <span className="text-[10px] text-cream-dim/30" aria-hidden="true">|</span>
            <span className="text-[10px] text-cream-dim/60">Text HOME to 741741</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── BILATERAL TAPPING ────────────────────────────────────────────

  if (step === "bilateral-tapping") {
    return (
      <div key="bilateral-tapping" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight">
        <BackButton onClick={() => { recordPartialSession(); goHome(); }} />
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

        <div className="fixed bottom-10 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
              setStep("check-in");
            }}
            className="rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
          >
            I&apos;m ready to stop
          </button>
          <CallDuringExercise />
          <TrySomethingElse />
        </div>
      </div>
    );
  }

  // ─── COLD WATER ───────────────────────────────────────────────────

  if (step === "cold-water") {
    return (
      <div key="cold-water" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={() => { recordPartialSession(); goHome(); }} />
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

        <div className="fixed bottom-10 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              setStep("check-in");
            }}
            className="rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
          >
            Done
          </button>
          <CallDuringExercise />
          <TrySomethingElse />
        </div>
      </div>
    );
  }

  // ─── GENTLE MOVEMENT (shutdown state) ──────────────────────────────

  if (step === "gentle-movement") {
    return (
      <div key="gentle-movement" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={() => { recordPartialSession(); goHome(); }} />
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
            Wiggle your fingers and toes. Roll your shoulders slowly. Rock side to side. Small movements - just enough to feel something.
          </p>
        </div>

        <div className="fixed bottom-10 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              if (timedRef.current) clearInterval(timedRef.current);
              setStep("check-in");
            }}
            className="rounded-xl bg-teal/15 px-6 py-3 text-sm text-teal-soft hover:bg-teal/25"
          >
            {timedSecondsLeft === 0 ? "Ready to continue" : "I\u2019m ready"}
          </button>
          <CallDuringExercise />
          <TrySomethingElse />
        </div>
      </div>
    );
  }

  // ─── GROUNDING ────────────────────────────────────────────────────

  if (step === "grounding") {
    const totalItems = groundingSenses.reduce((s, g) => s + g.count, 0);
    const doneItems = groundingSenses.slice(0, groundingStep).reduce((s, g) => s + g.count, 0) + checked.filter(Boolean).length;
    const progress = (doneItems / totalItems) * 100;

    return (
      <div key="grounding" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-5">
        <BackButton onClick={() => { recordPartialSession(); goHome(); }} />
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

        <div className="fixed bottom-10 flex flex-col items-center gap-3">
          <CallDuringExercise />
          <TrySomethingElse />
        </div>
      </div>
    );
  }

  // ─── CHECK-IN (after any exercise) ────────────────────────────────

  if (step === "check-in") {
    return (
      <div key="check-in" className="animate-screen-enter fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
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
              onClick={() => {
                recordPartialSession();
                setStep("pick-tool");
              }}
              className="w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all hover:bg-candle/25 active:scale-[0.98]"
            >
              I need something else
            </button>
            <button
              onClick={() => {
                recordPartialSession();
                setStep("final");
              }}
              className="mt-1 min-h-[44px] text-xs text-cream-dim/60 hover:text-cream-dim"
            >
              I&apos;m done for now
            </button>
          </div>

          {/* Crisis line always visible */}
          <div className="mt-8 flex flex-col items-center gap-1">
            <a href="tel:988" className="text-xs text-cream-dim/60 underline underline-offset-2 hover:text-cream-dim">988 Suicide &amp; Crisis Lifeline</a>
            <span className="text-[10px] text-cream-dim/60">Text HOME to 741741</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── PICK TOOL (after check-in -> "I need something else") ──────────

  if (step === "pick-tool") {
    const others = filterByContext(
      allExercises.filter((e) => e.id !== activeTool),
      locationContext,
    );

    return (
      <div key="pick-tool" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center bg-midnight px-5 pt-14 pb-10 overflow-y-auto">
        <BackButton onClick={() => setStep("recommend")} />
        <div className="w-full max-w-sm">
          <h2 className="text-center text-xl font-light text-cream">Let&apos;s try something different</h2>
          <p className="mt-2 text-center text-xs text-cream-dim/60">Pick one. We&apos;ll start right away.</p>
          <div className="mt-1.5">
            <ContextBadge />
          </div>

          <div className="mt-6 flex flex-col gap-2">
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
                <span className="mt-0.5 block text-xs text-cream-dim/60">{ex.desc}</span>
              </button>
            ))}
          </div>

          {others.length === 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-cream-dim/60">No other exercises match this setting.</p>
              <button
                onClick={() => setStep("context")}
                className="mt-3 text-sm text-teal-soft/60 underline underline-offset-2 hover:text-teal-soft"
              >
                Change location
              </button>
            </div>
          )}

          <button onClick={goHome} className="mt-5 w-full min-h-[44px] text-center text-xs text-cream-dim/60 hover:text-cream-dim">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ─── FINAL ────────────────────────────────────────────────────────

  if (step === "final") {
    return (
      <div key="final" className="animate-screen-enter fixed inset-0 z-50 flex items-center justify-center bg-midnight px-5">
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
            {!checkBackScheduled ? (
              <button
                onClick={async () => {
                  try {
                    // Always save check-back to localStorage (primary mechanism)
                    localStorage.setItem("regulate-check-back", JSON.stringify({
                      ts: Date.now(),
                      tool: activeTool,
                      state: selectedBodyState,
                    }));

                    // Try to schedule a push notification as enhancement
                    if ("Notification" in window && "serviceWorker" in navigator) {
                      let permission = Notification.permission;

                      // Only ask if not yet decided - never ask proactively
                      if (permission === "default") {
                        permission = await Notification.requestPermission();
                      }

                      if (permission === "granted") {
                        // Schedule notification for 2 hours from now
                        localStorage.setItem("regulate-notification-scheduled", JSON.stringify({
                          time: Date.now() + 2 * 60 * 60 * 1000,
                        }));
                      }
                      // If denied, localStorage check-back still works as fallback
                    }
                  } catch {}
                  setCheckBackScheduled(true);
                }}
                className="rounded-xl border border-teal/15 bg-deep/60 px-8 py-3 text-sm text-cream-dim transition-colors hover:border-teal/30 hover:text-cream"
              >
                Remind me to check in later
              </button>
            ) : (
              <p className="rounded-xl bg-teal/10 px-8 py-3 text-sm text-teal-soft/70">
                {typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
                  ? "We\u2019ll send you a gentle reminder"
                  : "We\u2019ll check in when you come back"}
              </p>
            )}
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
