"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useBinauralBeats, BinauralToggle, BinauralPill, HeadphonesNotice } from "@/components/BinauralBeats";
import { SomaticIcon } from "@/components/Icons";
import AftercareFlow from "@/components/AftercareFlow";
import SessionProgressBar from "@/components/SessionProgressBar";
import { getCurrentNSState, type NSState } from "@/components/NSStateSelector";

// ─── Types ──────────────────────────────────────────────────────────

type Screen = "select" | "info" | "configure" | "session" | "complete";
type Technique =
  | "bilateral-tapping"
  | "gentle-swaying"
  | "return-to-safety"
  | "humming"
  | "vagus-nerve-massage"
  | "eye-press"
  | "body-shaking"
  | "air-punching"
  | "bearing-down"
  | "dancing"
  | "vestibular-eyes";

type Regulation = "up" | "down" | "both";
type Speed = "slow" | "medium" | "fast";

interface SessionStep {
  text: string;
  duration: number; // seconds
}

interface ExerciseInfo {
  id: Technique;
  name: string;
  description: string;
  why: string;
  regulation: Regulation;
  tags: string[];
  duration: number; // default minutes
  sessionInstruction?: string;
  sessionSteps?: SessionStep[];
  hasSpecialSession?: boolean;
}

const speedMs: Record<Speed, number> = { slow: 1000, medium: 600, fast: 400 };
const durationOptions = [2, 5, 10]; // minutes

// ─── Exercise Library ───────────────────────────────────────────────

const techniques: ExerciseInfo[] = [
  {
    id: "bilateral-tapping",
    name: "Butterfly Hug",
    description: "Bilateral tapping, alternating left/right rhythm",
    why: "Alternating stimulation across both sides of your body helps your brain process and integrate overwhelming experiences. It's the same mechanism used in EMDR therapy \u2014 it calms the alarm system by giving your brain something rhythmic and predictable to follow.",
    regulation: "down",
    tags: ["processing", "calming"],
    duration: 5,
    hasSpecialSession: true,
  },
  {
    id: "gentle-swaying",
    name: "Gentle Swaying",
    description: "Side-to-side rhythmic movement",
    why: "Rocking and swaying mimics the motion that soothed you as an infant. It activates the vestibular system, which sends calming signals to your nervous system. This is why rocking chairs feel so comforting.",
    regulation: "down",
    tags: ["soothing", "grounding"],
    duration: 5,
    hasSpecialSession: true,
  },
  {
    id: "return-to-safety",
    name: "Return to Safety",
    description: "Gentle re-orienting after a panic attack or moment of feeling unsafe.",
    why: "After a panic attack, your body stays on high alert — scanning for danger even though the threat has passed. This sequence gently tells your nervous system that the danger is over. We move slowly through orienting, grounding, and containment to help your body remember it's safe.",
    regulation: "down" as const,
    tags: ["post-attack", "safety", "grounding"],
    duration: 5,
    sessionSteps: [
      { text: "Look around slowly. Name where you are. The room, the time, the day.", duration: 40 },
      { text: "Feel your back against the chair or wall. Let it hold you.", duration: 30 },
      { text: "Press your feet firmly into the floor. You are here. You are solid.", duration: 30 },
      { text: "Place one hand on your chest, one on your belly. Feel yourself breathing.", duration: 40 },
      { text: "Wrap your arms around yourself. Squeeze gently, like a hug. Hold.", duration: 30 },
      { text: "Say quietly: I am safe. My body is safe. This moment is safe.", duration: 30 },
      { text: "Stay here as long as you need. There's no rush to move on.", duration: 30 },
    ],
  },
  {
    id: "humming",
    name: "Humming / Voo Sound",
    description: "Deep humming or the 'voo' sound",
    why: "The vibration of humming stimulates your vagus nerve \u2014 the main nerve that tells your body it's safe to relax. The longer the exhale through humming, the stronger the calming signal. The 'voo' sound specifically resonates in your chest and belly.",
    regulation: "down",
    tags: ["vagus nerve", "calming"],
    duration: 3,
    sessionInstruction: "Let's hum together. Take a breath in, then hum as you exhale. Feel the vibration in your chest. Try making a low 'voo' sound \u2014 like a foghorn in the distance.",
  },
  {
    id: "vagus-nerve-massage",
    name: "Vagus Nerve Massage",
    description: "Gentle pressure on calming points",
    why: "Your vagus nerve runs through your neck and behind your ears. Gentle pressure on these areas activates the parasympathetic nervous system \u2014 your body's built-in calming system. It's like pressing your own reset button.",
    regulation: "down",
    tags: ["vagus nerve", "hands-on"],
    duration: 3,
    sessionSteps: [
      { text: "Place two fingers behind each earlobe. Apply gentle pressure and make small circles.", duration: 30 },
      { text: "Move to the sides of your neck. Gentle pressure, slow circles.", duration: 30 },
      { text: "Place your hand on your chest. Feel your heartbeat slow.", duration: 30 },
      { text: "Gently massage the space between your collarbones.", duration: 30 },
      { text: "Rest your hands on your belly. Breathe.", duration: 30 },
    ],
  },
  {
    id: "eye-press",
    name: "Eye Press Reset",
    description: "Gentle pressure on closed eyes",
    why: "Pressing gently on your closed eyes activates the oculocardiac reflex \u2014 a direct line to your vagus nerve that slows your heart rate. It's one of the fastest ways to shift from fight-or-flight to calm.",
    regulation: "down",
    tags: ["vagus nerve", "quick"],
    duration: 2,
    sessionSteps: [
      { text: "Close your eyes. Place your palms gently over them. Apply light pressure \u2014 not too hard, just enough to feel it. Breathe slowly.", duration: 30 },
      { text: "Release. Let your hands rest at your sides. Notice any shift.", duration: 10 },
      { text: "Place your palms over your eyes again. Light, gentle pressure. Slow, deep breaths.", duration: 30 },
      { text: "Release. Feel the warmth from your palms lingering.", duration: 10 },
      { text: "One more time. Palms over eyes. Gentle pressure. Breathe.", duration: 30 },
      { text: "Release and rest. Notice how your body feels now.", duration: 10 },
    ],
  },
  {
    id: "body-shaking",
    name: "Body Shaking / TRE",
    description: "Shake out tension and stored energy",
    why: "Animals shake after a threatening experience to discharge the stress energy trapped in their muscles. Humans hold onto this energy, which is why we feel 'frozen' or 'stuck.' Shaking lets your body complete the stress response it couldn't finish.",
    regulation: "up",
    tags: ["release", "energizing"],
    duration: 5,
    sessionSteps: [
      { text: "Start with your hands. Shake them like you're flicking off water.", duration: 30 },
      { text: "Add your arms. Let them shake loosely.", duration: 30 },
      { text: "Let it move into your shoulders and torso.", duration: 30 },
      { text: "Bounce your knees. Let your whole body shake.", duration: 60 },
      { text: "Slow down gradually. Feel the tingling.", duration: 30 },
      { text: "Stand still. Notice what's different.", duration: 30 },
    ],
  },
  {
    id: "air-punching",
    name: "Air Punching",
    description: "Controlled punching movements",
    why: "When your body is stuck in freeze, it needs to complete the fight response it couldn't express. Punching the air gives your muscles permission to discharge that trapped energy safely. The movement tells your nervous system: the threat is over, you fought back.",
    regulation: "up",
    tags: ["release", "energizing", "fight response"],
    duration: 3,
    sessionInstruction: "Stand with feet shoulder-width. Punch forward with alternating arms. Start slow, find your rhythm. It's okay to make sounds. Let out whatever wants to come out.",
  },
  {
    id: "bearing-down",
    name: "Bearing Down (Valsalva)",
    description: "Engage your core against resistance",
    why: "Bearing down \u2014 like pushing against a closed throat \u2014 creates pressure that stimulates the vagus nerve powerfully. It's one of the strongest vagal maneuvers known to medicine. It can reset a racing heart in moments.",
    regulation: "up",
    tags: ["vagus nerve", "quick", "powerful"],
    duration: 2,
    sessionSteps: [
      { text: "Take a deep breath. Close your mouth and nose, and push down like you're trying to push something heavy. Hold for 10 seconds.", duration: 10 },
      { text: "Release and breathe normally. Rest.", duration: 20 },
      { text: "Again \u2014 deep breath in. Close off and bear down. Hold.", duration: 10 },
      { text: "Release. Breathe. Rest.", duration: 20 },
      { text: "Third round. Deep breath. Bear down. Hold.", duration: 10 },
      { text: "Release. Breathe. Rest.", duration: 20 },
      { text: "Last round. Deep breath. Bear down. Hold.", duration: 10 },
      { text: "Release. Let your body settle. Notice what's changed.", duration: 20 },
    ],
  },
  {
    id: "dancing",
    name: "Free Movement / Dancing",
    description: "Move your body however it wants",
    why: "When we're shut down, our body has forgotten it can move freely. Dancing or free movement reconnects you to your body's natural impulses. There's no right way to do this \u2014 the movement itself is the medicine.",
    regulation: "up",
    tags: ["expression", "energizing"],
    duration: 5,
    sessionInstruction: "Move however your body wants to. There are no rules. Sway, stomp, wave your arms, spin. Let your body lead.",
  },
  {
    id: "vestibular-eyes",
    name: "Vestibular Eye Movement",
    description: "Slow eye tracking exercises",
    why: "Your vestibular system (inner ear + eyes) is deeply connected to your sense of safety. Slow, controlled eye movements help recalibrate this system when it's been disrupted by stress. It's why following a moving object can feel instantly calming.",
    regulation: "both",
    tags: ["calming", "orienting"],
    duration: 3,
    hasSpecialSession: true,
  },
];

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

// ─── Helpers ────────────────────────────────────────────────────────

function regulationLabel(r: Regulation): string {
  if (r === "down") return "Down-regulate";
  if (r === "up") return "Up-regulate";
  return "Both";
}

function regulationColor(r: Regulation): string {
  if (r === "down") return "bg-teal/10 text-teal-soft";
  if (r === "up") return "bg-candle/10 text-candle";
  return "bg-purple-400/10 text-purple-300";
}

function getRecommendations(nsState: NSState | null): { ids: Set<Technique>; reason: string } {
  if (nsState === "hyperactivated") {
    const downTechniques = techniques.filter((t) => t.regulation === "down");
    // Ensure return-to-safety is in the top 3 for hyperactivated state
    const top = downTechniques.slice(0, 3).map((t) => t.id);
    if (!top.includes("return-to-safety")) {
      top[2] = "return-to-safety";
    }
    const ids = new Set(top);
    return { ids, reason: "Helps your body remember it's safe after a difficult moment" };
  }
  if (nsState === "activated") {
    const downTechniques = techniques.filter((t) => t.regulation === "down");
    const ids = new Set(downTechniques.slice(0, 3).map((t) => t.id));
    return { ids, reason: "Helps calm an activated nervous system" };
  }
  if (nsState === "hypoactivated") {
    const upTechniques = techniques.filter((t) => t.regulation === "up");
    const ids = new Set(upTechniques.slice(0, 3).map((t) => t.id));
    return { ids, reason: "Helps gently activate a shut-down system" };
  }
  return { ids: new Set(), reason: "" };
}

function getSortedTechniques(nsState: NSState | null): ExerciseInfo[] {
  if (nsState === "hyperactivated" || nsState === "activated") {
    return [
      ...techniques.filter((t) => t.regulation === "down"),
      ...techniques.filter((t) => t.regulation === "both"),
      ...techniques.filter((t) => t.regulation === "up"),
    ];
  }
  if (nsState === "hypoactivated") {
    return [
      ...techniques.filter((t) => t.regulation === "up"),
      ...techniques.filter((t) => t.regulation === "both"),
      ...techniques.filter((t) => t.regulation === "down"),
    ];
  }
  return techniques;
}

// ─── Component ──────────────────────────────────────────────────────

export default function SomaticPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("select");
  const [technique, setTechnique] = useState<Technique>("bilateral-tapping");
  const [speed, setSpeed] = useState<Speed>("medium");
  const [duration, setDuration] = useState(5);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [nsState, setNsState] = useState<NSState | null>(null);

  // Session state
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Swaying state
  const [swayPosition, setSwayPosition] = useState(0);

  // Step-based session state
  const [sessionStep, setSessionStep] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);

  // Humming phase state
  const [hummingPhase, setHummingPhase] = useState<"inhale" | "hum">("inhale");

  // Vestibular eyes state
  const [dotX, setDotX] = useState(50);
  const [dotY, setDotY] = useState(50);
  const vestibularRef = useRef<number | null>(null);

  useWakeLock(screen === "session" && !isPaused);
  const binaural = useBinauralBeats();

  const totalSeconds = duration * 60;
  const currentExercise = techniques.find((t) => t.id === technique)!;
  const recommendations = getRecommendations(nsState);
  const sortedTechniques = getSortedTechniques(nsState);

  // ─── Load NS state on mount ─────────────────────────────────────

  useEffect(() => {
    setNsState(getCurrentNSState());
  }, []);

  // ─── Cleanup ────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (tapIntervalRef.current) clearInterval(tapIntervalRef.current);
    if (vestibularRef.current) cancelAnimationFrame(vestibularRef.current);
    intervalRef.current = null;
    tapIntervalRef.current = null;
    vestibularRef.current = null;
  }, []);

  useEffect(() => {
    return stopSession;
  }, [stopSession]);

  // ─── Tapping session ───────────────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || technique !== "bilateral-tapping" || isPaused) {
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

        if (hapticEnabled && navigator.vibrate) {
          navigator.vibrate(30);
        }

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
    if (screen !== "session" || technique !== "gentle-swaying" || isPaused) return;

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

  // ─── Vestibular eyes session ──────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || technique !== "vestibular-eyes" || isPaused) return;

    const startTime = performance.now();
    const phaseDuration = totalSeconds / 4; // split into 4 phases

    const animate = (now: number) => {
      const t = (now - startTime) / 1000;
      const phase = Math.min(Math.floor(t / phaseDuration), 3);
      const phaseT = (t % phaseDuration) / phaseDuration;
      const angle = phaseT * Math.PI * 2 * 3; // 3 full cycles per phase

      switch (phase) {
        case 0: // horizontal
          setDotX(50 + Math.sin(angle) * 35);
          setDotY(50);
          break;
        case 1: // vertical
          setDotX(50);
          setDotY(50 + Math.sin(angle) * 30);
          break;
        case 2: // diagonal
          setDotX(50 + Math.sin(angle) * 30);
          setDotY(50 + Math.sin(angle) * 25);
          break;
        case 3: // circular
          setDotX(50 + Math.cos(angle) * 30);
          setDotY(50 + Math.sin(angle) * 25);
          break;
      }

      vestibularRef.current = requestAnimationFrame(animate);
    };

    vestibularRef.current = requestAnimationFrame(animate);

    return () => {
      if (vestibularRef.current) cancelAnimationFrame(vestibularRef.current);
    };
  }, [screen, technique, isPaused, totalSeconds]);

  // ─── Step-based session timer ─────────────────────────────────

  useEffect(() => {
    if (screen !== "session" || isPaused) return;
    if (!currentExercise.sessionSteps && technique !== "humming") return;

    // For humming, handle phase cycling
    if (technique === "humming") {
      const phaseInterval = setInterval(() => {
        setHummingPhase((prev) => (prev === "inhale" ? "hum" : "inhale"));
      }, hummingPhase === "inhale" ? 4000 : 8000);

      return () => clearInterval(phaseInterval);
    }

    // For step-based exercises
    const steps = currentExercise.sessionSteps!;
    const stepInterval = setInterval(() => {
      setStepElapsed((prev) => {
        const currentStepDuration = steps[sessionStep]?.duration ?? 30;
        if (prev + 1 >= currentStepDuration) {
          // Advance to next step
          setSessionStep((s) => {
            if (s + 1 >= steps.length) {
              return s; // stay on last step, main timer will handle completion
            }
            return s + 1;
          });
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(stepInterval);
  }, [screen, isPaused, technique, sessionStep, hummingPhase, currentExercise]);

  // ─── Main Timer ─────────────────────────────────────────────────

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
    setSessionStep(0);
    setStepElapsed(0);
    setHummingPhase("inhale");
    setScreen("session");
  }

  function resetToSelect() {
    stopSession();
    setScreen("select");
    setIsPaused(false);
    binaural.stop();
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function selectTechnique(id: Technique) {
    const exercise = techniques.find((t) => t.id === id)!;
    setTechnique(id);
    setDuration(exercise.duration);
    setScreen("info");
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

  // ─── Pause overlay ────────────────────────────────────────────

  function PauseOverlay() {
    if (!isPaused) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-lg text-cream/80">Paused</p>
          <button onClick={() => setIsPaused(false)} className="mt-4 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30">
            Resume
          </button>
        </div>
      </div>
    );
  }

  // ─── Session controls ─────────────────────────────────────────

  function SessionControls() {
    return (
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center gap-6">
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
    );
  }

  // ─── Session header (progress + timer) ────────────────────────

  function SessionHeader() {
    const remaining = totalSeconds - elapsed;
    return (
      <>
        <div className="fixed left-0 right-0 top-2 z-20 px-6">
          <SessionProgressBar current={Math.min(elapsed, totalSeconds)} total={totalSeconds} />
        </div>
        <div className="fixed left-0 right-0 top-14 text-center">
          <p className="font-mono text-sm text-cream-dim/60">{formatTime(remaining)}</p>
        </div>
      </>
    );
  }

  // ─── Binaural overlays ────────────────────────────────────────

  function BinauralOverlays() {
    return (
      <>
        {binaural.isPlaying && binaural.activePreset && <BinauralPill preset={binaural.activePreset} onStop={binaural.stop} />}
        {binaural.showHeadphones && <HeadphonesNotice onDismiss={binaural.dismissHeadphones} />}
      </>
    );
  }

  // ─── SELECT SCREEN ────────────────────────────────────────────

  if (screen === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 flex justify-center"><SomaticIcon className="h-8 w-8 text-teal-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Somatic Movement</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Move gently to release what your body is holding.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {sortedTechniques.map((ex) => {
              const isRecommended = recommendations.ids.has(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => selectTechnique(ex.id)}
                  className={`group w-full rounded-2xl border ${
                    isRecommended ? "border-teal/40" : "border-teal/15"
                  } bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8`}
                >
                  {isRecommended && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-medium text-teal-soft">
                        Recommended
                      </span>
                      <span className="text-xs text-cream-dim">{recommendations.reason}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/80">
                      <ExerciseIcon id={ex.id} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-medium text-cream">{ex.name}</h3>
                      <p className="mt-0.5 text-sm text-cream-dim">{ex.description}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${regulationColor(ex.regulation)}`}>
                          {regulationLabel(ex.regulation)}
                        </span>
                        <span className="text-xs text-cream-dim/50">{ex.duration} min</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── INFO SCREEN ──────────────────────────────────────────────

  if (screen === "info") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={resetToSelect} label="Exercises" />

          <header className="mb-6 mt-6 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-blue/80">
                <ExerciseIcon id={technique} className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">{currentExercise.name}</h1>
            <p className="mt-2 text-sm text-cream-dim">{currentExercise.description}</p>
          </header>

          {/* Why it works */}
          <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-teal-soft/70">Why this works</p>
            <p className="text-sm leading-relaxed text-cream/90">{currentExercise.why}</p>
          </div>

          {/* Regulation type */}
          <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
            <p className="text-sm text-cream-dim">
              This exercise helps{" "}
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${regulationColor(currentExercise.regulation)}`}>
                {regulationLabel(currentExercise.regulation)}
              </span>
            </p>
          </div>

          {/* Duration */}
          <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
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

          {/* Tapping-specific config */}
          {technique === "bilateral-tapping" && (
            <>
              <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
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

              <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
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
            </>
          )}

          {/* Binaural beats */}
          <div className="mb-4 rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
            <BinauralToggle presetId="calm" isPlaying={binaural.isPlaying} onToggle={binaural.toggle} />
          </div>

          <button
            onClick={startSession}
            className="mt-2 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft backdrop-blur-sm transition-all duration-300 hover:bg-teal/30 hover:shadow-lg hover:shadow-teal/10 active:scale-[0.98]"
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  // ─── SESSION: BILATERAL TAPPING ────────────────────────────────

  if (screen === "session" && technique === "bilateral-tapping") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-0">
        <SessionHeader />

        {/* Tap zones */}
        <div className="flex h-screen w-full">
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

          <div className="flex w-px items-center">
            <div className="h-32 w-px bg-slate-blue/20" />
          </div>

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

        <div className="fixed bottom-16 left-0 right-0 text-center">
          <p className="text-sm text-cream-dim/60">Tap along with the rhythm</p>
        </div>

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── SESSION: SWAYING ─────────────────────────────────────────

  if (screen === "session" && technique === "gentle-swaying") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <SessionHeader />

        <div className="flex flex-col items-center">
          <div className="relative h-[300px] w-[300px]">
            <div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle at ${50 + swayPosition * 0.15}% 50%, rgba(42,107,110,0.15) 0%, transparent 70%)`,
                transition: "background 0.1s ease-out",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-32 w-32 rounded-full"
              style={{
                transform: `translate(calc(-50% + ${swayPosition * 0.6}px), -50%)`,
                background: "radial-gradient(circle at 40% 35%, rgba(90,171,174,0.4) 0%, rgba(42,107,110,0.25) 50%, rgba(26,42,74,0.4) 100%)",
                boxShadow: `0 0 40px rgba(42,107,110,0.2), 0 0 80px rgba(42,107,110,0.1)`,
                transition: "transform 0.05s linear",
              }}
            />
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

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── SESSION: HUMMING ─────────────────────────────────────────

  if (screen === "session" && technique === "humming") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <SessionHeader />

        <div className="flex max-w-sm flex-col items-center text-center">
          <p className="mb-8 text-sm leading-relaxed text-cream-dim/80">
            {currentExercise.sessionInstruction}
          </p>

          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border border-teal/20 bg-teal/5">
            <p className={`text-2xl font-light transition-all duration-500 ${
              hummingPhase === "inhale" ? "text-cream/60 scale-90" : "text-teal-soft scale-110"
            }`}>
              {hummingPhase === "inhale" ? "Breathe in" : "Hummm..."}
            </p>
          </div>

          <p className="text-xs text-cream-dim/40">
            {hummingPhase === "inhale" ? "4 seconds" : "8 seconds"}
          </p>
        </div>

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── SESSION: VESTIBULAR EYES ─────────────────────────────────

  if (screen === "session" && technique === "vestibular-eyes") {
    const phaseIndex = Math.min(Math.floor(elapsed / (totalSeconds / 4)), 3);
    const phaseNames = ["Horizontal", "Vertical", "Diagonal", "Circular"];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <SessionHeader />

        <div className="flex flex-col items-center">
          <p className="mb-4 text-sm text-cream-dim/60">Follow the dot with your eyes, not your head</p>
          <p className="mb-6 text-xs text-teal-soft/70">{phaseNames[phaseIndex]} tracking</p>

          <div className="relative h-[300px] w-[300px] rounded-2xl border border-slate-blue/20 bg-deep/40">
            <div
              className="absolute h-3 w-3 rounded-full bg-teal-soft shadow-lg shadow-teal/30"
              style={{
                left: `${dotX}%`,
                top: `${dotY}%`,
                transform: "translate(-50%, -50%)",
                transition: "left 0.05s linear, top 0.05s linear",
              }}
            />
          </div>
        </div>

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── SESSION: STEP-BASED ──────────────────────────────────────

  if (screen === "session" && currentExercise.sessionSteps) {
    const steps = currentExercise.sessionSteps;
    const currentStepData = steps[sessionStep] ?? steps[steps.length - 1];
    const stepProgress = Math.min(stepElapsed / currentStepData.duration, 1);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <SessionHeader />

        <div className="flex max-w-sm flex-col items-center text-center">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < sessionStep
                    ? "w-6 bg-teal-soft/60"
                    : i === sessionStep
                    ? "w-8 bg-teal-soft"
                    : "w-4 bg-slate-blue/40"
                }`}
              />
            ))}
          </div>

          {/* Step text */}
          <p className="mb-6 text-lg font-light leading-relaxed text-cream/90">
            {currentStepData.text}
          </p>

          {/* Step progress ring */}
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(42,107,110,0.15)" strokeWidth="3" />
              <circle
                cx="48" cy="48" r="42" fill="none" stroke="rgba(90,171,174,0.6)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${stepProgress * 264} 264`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="text-sm text-cream-dim/60">
              {Math.max(0, currentStepData.duration - stepElapsed)}s
            </span>
          </div>

          <p className="mt-4 text-xs text-cream-dim/40">
            Step {sessionStep + 1} of {steps.length}
          </p>
        </div>

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── SESSION: TIMER-BASED (air-punching, dancing) ─────────────

  if (screen === "session") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <SessionHeader />

        <div className="flex max-w-sm flex-col items-center text-center">
          <p className="mb-8 text-lg font-light leading-relaxed text-cream/90">
            {currentExercise.sessionInstruction ?? currentExercise.description}
          </p>

          {/* Pulsing circle for rhythm */}
          <div className="flex h-32 w-32 items-center justify-center rounded-full border border-teal/20 bg-teal/5">
            <div
              className="h-16 w-16 rounded-full bg-teal/20"
              style={{
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>

          <p className="mt-6 text-sm text-cream-dim/60">{currentExercise.name}</p>
        </div>

        <SessionControls />
        <PauseOverlay />
        <BinauralOverlays />
      </div>
    );
  }

  // ─── COMPLETE SCREEN ──────────────────────────────────────────

  if (screen === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique={currentExercise.name}
          onDone={() => router.push("/")}
        />
      </div>
    );
  }

  return null;
}

// ─── Exercise Icons ─────────────────────────────────────────────────

function ExerciseIcon({ id, className = "h-6 w-6 text-teal-soft" }: { id: Technique; className?: string }) {
  switch (id) {
    case "bilateral-tapping":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M7 12L7 4M17 12L17 4M5 8h4M15 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 16c2-2 4-3 8-3s6 1 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "gentle-swaying":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M4 20C8 12 10 8 12 8C14 8 16 12 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "humming":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M3 12h2M7 8h2M7 16h2M13 6h2M13 18h2M19 10h2M19 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "vagus-nerve-massage":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 12v4M8 20c0-2 2-4 4-4s4 2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "eye-press":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "body-shaking":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M12 4v4M8 10l-3 6M16 10l3 6M10 20l2-6 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "air-punching":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M19 12l-4-4M19 12l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bearing-down":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M12 4v12M8 12l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 20h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "dancing":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 8l3 4 3-4M12 12v4M8 20l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "vestibular-eyes":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 8c2-3 5-5 8-5s6 2 8 5M4 16c2 3 5 5 8 5s6-2 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}
