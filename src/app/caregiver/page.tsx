"use client";

import { useState } from "react";
import Link from "next/link";
import { CaregiverIcon } from "@/components/Icons";
import BreathingOrb from "@/components/BreathingOrb";

// ─── Flow data ──────────────────────────────────────────────────────

interface Step {
  instruction: string;
  detail?: string;
}

const panicSteps: Step[] = [
  { instruction: "Stay calm.", detail: "Your calm energy is the most important thing right now. Take a breath yourself." },
  { instruction: "Say: \"I'm here with you.\"", detail: "Don't ask what's wrong. Don't try to fix it. Just be present." },
  { instruction: "Say: \"You're safe. This will pass.\"", detail: "Use a slow, quiet voice. Repeat if needed." },
  { instruction: "Offer to breathe together.", detail: "\"Can we breathe together? In... and out.\" Match their pace, then gradually slow down." },
  { instruction: "Don't crowd their space.", detail: "Stay close but give them room. Ask: \"Is it okay if I sit here?\"" },
  { instruction: "Wait with them.", detail: "Panic peaks in about 10 minutes. You don't need to do anything except be there." },
];

const ongoingSteps: Step[] = [
  { instruction: "Ask: \"What do you need right now?\"", detail: "Don't assume. They might want to talk, or they might want silence." },
  { instruction: "Listen without fixing.", detail: "You don't need to solve their anxiety. Just hearing them matters." },
  { instruction: "Offer gentle activities.", detail: "\"Want to go for a short walk?\" \"Can I make you tea?\" Small, concrete offers." },
  { instruction: "Validate their experience.", detail: "\"That sounds really hard. I'm glad you told me.\"" },
  { instruction: "Don't say \"just relax.\"", detail: "Instead try: \"Take your time. I'm not going anywhere.\"" },
  { instruction: "Check in later.", detail: "A simple \"How are you doing?\" tomorrow means more than you know." },
];

const afterSteps: Step[] = [
  { instruction: "Say: \"You made it through.\"", detail: "Acknowledge what just happened. They may feel embarrassed - reassure them." },
  { instruction: "Don't immediately debrief.", detail: "Give them space to recover. They'll talk about it when they're ready." },
  { instruction: "Offer water or comfort.", detail: "Physical needs first: water, a blanket, a quiet space." },
  { instruction: "Ask: \"What helped?\"", detail: "This helps them learn their own patterns. Listen to the answer." },
  { instruction: "Remind them of their strength.", detail: "\"You handled that. I'm proud of you.\"" },
];

type Flow = "select" | "panic" | "ongoing" | "after";

// ─── Breathing guide (visual only) ─────────────────────────────────

function VisualBreathGuide() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");

  // Simple auto-cycling animation
  useState(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const t = ((now - start) / 1000) % 10; // 10s cycle
      if (t < 5) {
        setPhase("inhale");
        setProgress(t / 5);
      } else {
        setPhase("exhale");
        setProgress(1 - (t - 5) / 5);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });

  return (
    <div className="flex flex-col items-center">
      <div className="scale-75">
        <BreathingOrb progress={progress} phase={phase} />
      </div>
      <p className="mt-4 text-lg font-light text-cream/80">
        {phase === "inhale" ? "Breathe in together..." : "Breathe out together..."}
      </p>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function CaregiverPage() {
  const [flow, setFlow] = useState<Flow>("select");
  const [stepIndex, setStepIndex] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);

  const flowSteps = flow === "panic" ? panicSteps : flow === "ongoing" ? ongoingSteps : afterSteps;
  const currentStep = flowSteps[stepIndex];

  function startFlow(f: Flow) {
    setFlow(f);
    setStepIndex(0);
    setShowBreathing(false);
  }

  function nextStep() {
    if (stepIndex + 1 < flowSteps.length) {
      setStepIndex(stepIndex + 1);
    } else {
      setFlow("select");
      setStepIndex(0);
    }
  }

  // ─── SELECT ───────────────────────────────────────────────────

  if (flow === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 flex justify-center"><CaregiverIcon className="h-8 w-8 text-teal-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Helping Someone</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Step-by-step guidance for being there.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => startFlow("panic")}
              className="w-full rounded-2xl border border-candle/20 bg-candle/8 p-5 text-left transition-all hover:border-candle/35 active:scale-[0.98]"
            >
              <h3 className="text-base font-medium text-candle">Panic attack in progress</h3>
              <p className="mt-1 text-sm text-cream-dim">They&apos;re panicking right now</p>
            </button>

            <button
              onClick={() => startFlow("ongoing")}
              className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-all hover:border-teal/35 active:scale-[0.98]"
            >
              <h3 className="text-base font-medium text-cream">Supporting ongoing anxiety</h3>
              <p className="mt-1 text-sm text-cream-dim">They&apos;re struggling but not in crisis</p>
            </button>

            <button
              onClick={() => startFlow("after")}
              className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-all hover:border-teal/35 active:scale-[0.98]"
            >
              <h3 className="text-base font-medium text-cream">After an episode</h3>
              <p className="mt-1 text-sm text-cream-dim">It&apos;s over - what to do now</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FLOW STEP ────────────────────────────────────────────────

  // Check if we've completed all steps
  if (stepIndex >= flowSteps.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <div className="h-12 w-12 rounded-full bg-teal/15" />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-cream">You showed up for them.</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            That matters more than you know.<br />Being there is everything.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <button onClick={() => setFlow("select")} className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft hover:bg-teal/25">
              Go again
            </button>
            <Link href="/" className="text-sm text-cream-dim/50 hover:text-cream-dim">Return home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      {/* Progress */}
      <div className="fixed left-0 right-0 top-0 z-20 h-1 bg-slate-blue/30">
        <div className="h-full bg-teal-soft/60 transition-all duration-500" style={{ width: `${((stepIndex + 1) / flowSteps.length) * 100}%` }} />
      </div>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        {showBreathing ? (
          <>
            <VisualBreathGuide />
            <button
              onClick={() => setShowBreathing(false)}
              className="mt-8 text-sm text-cream-dim/50 hover:text-cream-dim"
            >
              Back to guidance
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-cream-dim/40">
              Step {stepIndex + 1} of {flowSteps.length}
            </p>
            <h2 className="text-2xl font-light leading-relaxed text-cream">
              {currentStep.instruction}
            </h2>
            {currentStep.detail && (
              <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-cream-dim">
                {currentStep.detail}
              </p>
            )}

            {flow === "panic" && stepIndex === 3 && (
              <button
                onClick={() => setShowBreathing(true)}
                className="mt-6 rounded-xl border border-teal/20 bg-teal/10 px-5 py-3 text-sm text-teal-soft hover:bg-teal/20"
              >
                Show breathing guide
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom controls */}
      {!showBreathing && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4 px-5">
          <button
            onClick={() => setFlow("select")}
            className="rounded-xl border border-slate-blue/30 px-6 py-3 text-sm text-cream-dim hover:text-cream"
          >
            Exit
          </button>
          <button
            onClick={nextStep}
            className="flex-1 max-w-[200px] rounded-xl bg-teal/20 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30 active:scale-[0.98]"
          >
            {stepIndex + 1 >= flowSteps.length ? "Done" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
