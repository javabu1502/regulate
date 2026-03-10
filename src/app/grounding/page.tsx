"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroundingIcon } from "@/components/Icons";
import AftercareFlow from "@/components/AftercareFlow";
import MicroExplanation from "@/components/MicroExplanation";
import { haptics } from "@/lib/haptics";
import PresenceCue from "@/components/PresenceCue";
import EscapeHatch from "@/components/EscapeHatch";

// ─── Data ───────────────────────────────────────────────────────────

interface SenseStep {
  count: number;
  sense: string;
  prompt: string;
  icon: React.ReactNode;
}

const senseSteps: SenseStep[] = [
  {
    count: 5,
    sense: "See",
    prompt: "Name 5 things you can see right now.",
    icon: (
      <svg className="h-10 w-10 text-teal-soft" viewBox="0 0 40 40" fill="none">
        <path d="M4 20C4 20 10 8 20 8C30 8 36 20 36 20C36 20 30 32 20 32C10 32 4 20 4 20Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    count: 4,
    sense: "Touch",
    prompt: "Notice 4 things you can physically feel.",
    icon: (
      <svg className="h-10 w-10 text-teal-soft" viewBox="0 0 40 40" fill="none">
        <path d="M20 8V14M20 14C16 14 12 18 12 22V30M20 14C24 14 28 18 28 22V26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="6" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    count: 3,
    sense: "Hear",
    prompt: "What are 3 sounds around you?",
    icon: (
      <svg className="h-10 w-10 text-teal-soft" viewBox="0 0 40 40" fill="none">
        <path d="M14 16V24L22 28V12L14 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M26 15C27.5 16.5 28 18 28 20C28 22 27.5 23.5 26 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 12C32.5 14.5 34 17 34 20C34 23 32.5 25.5 30 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    count: 2,
    sense: "Smell",
    prompt: "Can you notice 2 smells?",
    icon: (
      <svg className="h-10 w-10 text-teal-soft" viewBox="0 0 40 40" fill="none">
        <path d="M16 28C16 28 14 24 14 20C14 16 18 12 20 12C22 12 26 16 26 20C26 24 24 28 24 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 10C18 10 19 6 20 6C21 6 22 10 22 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 8C14 8 16 5 17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 8C26 8 24 5 23 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    count: 1,
    sense: "Taste",
    prompt: "What's 1 thing you can taste?",
    icon: (
      <svg className="h-10 w-10 text-teal-soft" viewBox="0 0 40 40" fill="none">
        <path d="M12 14C12 14 16 10 20 10C24 10 28 14 28 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 18H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 18V30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const bodySteps = [
  "Press your feet firmly into the floor. Notice the pressure.",
  "Squeeze both fists tight for 5 seconds... then release.",
  "Notice the weight of your body. Where does gravity pull you?",
  "Place one hand on your chest. Feel it rise and fall.",
  "You're here. Your body is holding you.",
];

const objectSteps = [
  "What color is it?",
  "What does it feel like? Smooth? Rough? Cold? Warm?",
  "How heavy is it?",
  "What does it smell like?",
  "Describe it to yourself as if you've never seen anything like it.",
];

const groundingExplanations: Record<string, string> = {
  sensory: "Engaging each sense pulls your attention into the present moment, interrupting the anxiety loop.",
  body: "Focusing on physical contact points reminds your nervous system that you are safe and supported right now.",
  object: "Detailed sensory focus on a single object anchors your attention and interrupts dissociation.",
};

// ─── Component ──────────────────────────────────────────────────────

type Screen = "select" | "intro" | "session" | "complete";
type GroundingType = "sensory" | "body" | "object";

export default function GroundingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("select");
  const [groundingType, setGroundingType] = useState<GroundingType>("sensory");
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  // Sensory grounding state
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [fadingOut, setFadingOut] = useState(false);

  // Body / Object grounding state
  const [simpleStepIndex, setSimpleStepIndex] = useState(0);

  const currentSense = senseSteps[stepIndex];
  const totalItems = senseSteps.reduce((sum, s) => sum + s.count, 0);
  const completedItems = senseSteps
    .slice(0, stepIndex)
    .reduce((sum, s) => sum + s.count, 0) + checked.filter(Boolean).length;
  const progressPercent = (completedItems / totalItems) * 100;

  function selectType(type: GroundingType) {
    setGroundingType(type);
    setSimpleStepIndex(0);
    setStepIndex(0);
    setChecked([]);
    setFadingOut(false);
    setScreen("intro");
  }

  function startGrounding() {
    if (groundingType === "sensory") {
      setStepIndex(0);
      setChecked(Array(senseSteps[0].count).fill(false));
    } else {
      setSimpleStepIndex(0);
    }
    setScreen("session");
  }

  function checkItem(index: number) {
    const next = [...checked];
    if (next[index]) return;
    next[index] = true;
    setChecked(next);
    haptics.groundingCheck();

    if (next.every(Boolean)) {
      setTimeout(() => advanceSenseStep(), 600);
    }
  }

  function advanceSenseStep() {
    haptics.transition();
    setFadingOut(true);
    setTimeout(() => {
      const nextIndex = stepIndex + 1;
      if (nextIndex < senseSteps.length) {
        setStepIndex(nextIndex);
        setChecked(Array(senseSteps[nextIndex].count).fill(false));
      } else {
        setScreen("complete");
      }
      setFadingOut(false);
    }, 300);
  }

  function advanceSimpleStep() {
    const steps = groundingType === "body" ? bodySteps : objectSteps;
    if (simpleStepIndex < steps.length - 1) {
      haptics.transition();
      setSimpleStepIndex((i) => i + 1);
    } else {
      haptics.complete();
      setScreen("complete");
    }
  }

  // ─── SELECT ─────────────────────────────────────────────────────

  if (screen === "select") {
    return (
      <div key="select" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 flex justify-center">
              <GroundingIcon className="h-10 w-10 text-teal-soft" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">
              Grounding
            </h1>
          </header>

          <div className="flex flex-col gap-3">
            <div className="relative w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8">
              <button
                onClick={() => selectType("sensory")}
                className="group w-full text-left pr-6"
              >
                <h3 className="text-base font-medium text-cream">5-4-3-2-1 Senses</h3>
                <p className="mt-1 text-sm text-cream-dim">Engage all five senses</p>
              </button>
              <MicroExplanation
                text={groundingExplanations.sensory}
                isOpen={expandedExplanation === "sensory"}
                onToggle={() => setExpandedExplanation(expandedExplanation === "sensory" ? null : "sensory")}
              />
            </div>

            <div className="relative w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8">
              <button
                onClick={() => selectType("body")}
                className="group w-full text-left pr-6"
              >
                <h3 className="text-base font-medium text-cream">Body Grounding</h3>
                <p className="mt-1 text-sm text-cream-dim">Feel your body in space</p>
              </button>
              <MicroExplanation
                text={groundingExplanations.body}
                isOpen={expandedExplanation === "body"}
                onToggle={() => setExpandedExplanation(expandedExplanation === "body" ? null : "body")}
              />
            </div>

            <div className="relative w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:border-teal/35 hover:shadow-lg hover:shadow-teal/8">
              <button
                onClick={() => selectType("object")}
                className="group w-full text-left pr-6"
              >
                <h3 className="text-base font-medium text-cream">Object Grounding</h3>
                <p className="mt-1 text-sm text-cream-dim">Focus on a single object</p>
              </button>
              <MicroExplanation
                text={groundingExplanations.object}
                isOpen={expandedExplanation === "object"}
                onToggle={() => setExpandedExplanation(expandedExplanation === "object" ? null : "object")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTRO ────────────────────────────────────────────────────

  if (screen === "intro") {
    return (
      <div key="intro" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => setScreen("select")}
            className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="mb-6 flex justify-center"><GroundingIcon className="h-10 w-10 text-teal-soft" /></div>

            {groundingType === "sensory" && (
              <>
                <h1 className="text-2xl font-light tracking-tight text-cream">
                  Let&apos;s bring you back<br />to the present.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                  We&apos;ll go through your five senses, one at a time.
                  <br />
                  There&apos;s no rush.
                </p>
              </>
            )}

            {groundingType === "body" && (
              <>
                <h1 className="text-2xl font-light tracking-tight text-cream">
                  Feel your body<br />right here, right now.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                  We&apos;ll move through simple body sensations
                  <br />
                  to bring you back to the present.
                </p>
              </>
            )}

            {groundingType === "object" && (
              <>
                <h1 className="text-2xl font-light tracking-tight text-cream">
                  Pick up one object near you.
                  <br />
                  Hold it.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                  We&apos;ll explore it together, slowly.
                </p>
              </>
            )}

            <button
              onClick={startGrounding}
              className="mt-10 w-full max-w-[200px] rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all duration-300 hover:bg-teal/30 active:scale-[0.98]"
            >
              I&apos;m ready
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SESSION: SENSORY (5-4-3-2-1) ──────────────────────────────

  if (screen === "session" && groundingType === "sensory") {
    return (
      <div key="session-sensory" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        {/* Progress bar */}
        <div className="fixed left-0 right-0 top-0 z-20 h-1 bg-slate-blue/30">
          <div
            className="h-full bg-teal-soft/60 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className={`flex w-full max-w-md flex-1 flex-col items-center justify-center text-center transition-opacity duration-300 ${
            fadingOut ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Number */}
          <div className="mb-4 font-mono text-7xl font-extralight text-teal-soft/40">
            {currentSense.count}
          </div>

          {/* Icon */}
          <div className="mb-4">{currentSense.icon}</div>

          {/* Sense name */}
          <h2 className="text-2xl font-light text-cream">{currentSense.sense}</h2>

          {/* Prompt */}
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">{currentSense.prompt}</p>

          {/* Checkoff items */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {checked.map((isChecked, i) => (
              <button
                key={i}
                onClick={() => checkItem(i)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-lg transition-all duration-300 ${
                  isChecked
                    ? "scale-90 border-teal/40 bg-teal/20 text-teal-soft"
                    : "border-slate-blue/40 bg-deep/60 text-cream-dim hover:border-teal/30 hover:bg-deep/80 active:scale-95"
                }`}
              >
                {isChecked ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="text-sm">{i + 1}</span>
                )}
              </button>
            ))}
          </div>

          {/* Skip / early advance */}
          <button
            onClick={advanceSenseStep}
            className="mt-8 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
          >
            {checked.every(Boolean) ? "Continue" : "Skip this sense"}
          </button>
        </div>

        <PresenceCue active={true} />
        <EscapeHatch />
      </div>
    );
  }

  // ─── SESSION: BODY / OBJECT ───────────────────────────────────

  if (screen === "session" && (groundingType === "body" || groundingType === "object")) {
    const steps = groundingType === "body" ? bodySteps : objectSteps;

    return (
      <div key={`session-${groundingType}`} className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <p className="text-xl font-light leading-relaxed text-cream">
            {steps[simpleStepIndex]}
          </p>

          <button
            onClick={advanceSimpleStep}
            className="mt-10 rounded-2xl bg-teal/20 px-8 py-3 text-sm font-medium text-teal-soft transition-all duration-300 hover:bg-teal/30 active:scale-[0.98]"
          >
            Next
          </button>

          {/* Step dots */}
          <div className="mt-8 flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < simpleStepIndex
                    ? "w-4 bg-teal-soft/50"
                    : i === simpleStepIndex
                      ? "w-6 bg-teal-soft"
                      : "w-3 bg-slate-blue/50"
                }`}
              />
            ))}
          </div>
        </div>

        <PresenceCue active={true} />
        <EscapeHatch />
      </div>
    );
  }

  // ─── COMPLETE ─────────────────────────────────────────────────

  if (screen === "complete") {
    const techniqueNames: Record<GroundingType, string> = {
      sensory: "5-4-3-2-1 Grounding",
      body: "Body Grounding",
      object: "Object Grounding",
    };

    return (
      <div key="complete" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique={techniqueNames[groundingType]}
          onDone={() => router.push("/")}
          learnLink="/learn#grounding"
        />
      </div>
    );
  }

  return null;
}
