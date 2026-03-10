"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WaveIcon } from "@/components/Icons";

// ─── Data ───────────────────────────────────────────────────────────

const reasonOptions = [
  "Panic attacks",
  "General anxiety",
  "Stress & overwhelm",
  "Burnout / Shutdown",
  "Supporting someone else",
  "Just exploring",
];

const helpedOptions = [
  "Deep breathing",
  "Grounding / being present",
  "Moving my body",
  "Affirmations",
  "Journaling",
  "Nothing has worked yet",
  "I'm not sure",
];

const triggerOptions = [
  "Crowded or public places",
  "Work or school stress",
  "Health worries",
  "Relationship stress",
  "Being alone",
  "Uncertainty / the future",
  "I don't know yet",
];

// Maps onboarding "what helped" answers to recommended modules
const helpToModule: Record<string, { href: string; title: string }> = {
  "Deep breathing": { href: "/breathing", title: "Guided Breathing" },
  "Grounding / being present": { href: "/grounding", title: "5-4-3-2-1 Grounding" },
  "Moving my body": { href: "/somatic", title: "Somatic Movement" },
  "Affirmations": { href: "/affirmations", title: "Affirmations" },
  "Journaling": { href: "/journal", title: "Journal" },
};

const defaultModules = [
  { href: "/breathing", title: "Guided Breathing" },
  { href: "/grounding", title: "5-4-3-2-1 Grounding" },
  { href: "/body-scan", title: "Body Scan" },
];

const ONBOARDING_KEY = "onboarding_complete";
const QUICK_ACCESS_KEY = "quick_access";
const ONBOARDING_DATA_KEY = "onboarding_data";

// ─── Component ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-midnight" />}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTherapistRef = searchParams.get("ref") === "therapist";
  const [step, setStep] = useState(1);
  const [reasons, setReasons] = useState<string[]>([]);
  const [helped, setHelped] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [quickAccess, setQuickAccess] = useState<{ href: string; title: string }[]>([]);
  const [fadingOut, setFadingOut] = useState(false);

  function toggle(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function next() {
    setFadingOut(true);
    setTimeout(() => {
      if (step === 3) {
        // Build recommendations based on "what helped"
        const recs = helped
          .map((h) => helpToModule[h])
          .filter(Boolean);
        const final = recs.length >= 2 ? recs.slice(0, 3) : defaultModules.slice(0, 3);
        setQuickAccess(final);
      }
      setStep((s) => s + 1);
      setFadingOut(false);
    }, 200);
  }

  function skip() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    localStorage.setItem(QUICK_ACCESS_KEY, JSON.stringify(defaultModules));
    router.replace("/");
  }

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    localStorage.setItem(QUICK_ACCESS_KEY, JSON.stringify(quickAccess));
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify({ reasons, helped, triggers }));
    router.replace("/");
  }

  function toggleQuickAccess(mod: { href: string; title: string }) {
    setQuickAccess((prev) => {
      const exists = prev.find((m) => m.href === mod.href);
      if (exists) return prev.filter((m) => m.href !== mod.href);
      if (prev.length >= 3) return prev;
      return [...prev, mod];
    });
  }

  const allModules = [
    { href: "/breathing", title: "Guided Breathing" },
    { href: "/grounding", title: "5-4-3-2-1 Grounding" },
    { href: "/body-scan", title: "Body Scan" },
    { href: "/somatic", title: "Somatic Movement" },
    { href: "/affirmations", title: "Affirmations" },
    { href: "/journal", title: "Journal" },
    { href: "/learn", title: "Learn" },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-12">
      {/* Skip link */}
      <div className="fixed right-5 top-5 z-10">
        <button onClick={skip} className="text-xs text-cream-dim/30 transition-colors hover:text-cream-dim">
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < step ? "w-4 bg-teal-soft/50" : i === step ? "w-6 bg-teal-soft" : "w-3 bg-slate-blue/40"
            }`}
          />
        ))}
      </div>

      <div className={`w-full max-w-md transition-opacity duration-200 ${fadingOut ? "opacity-0" : "opacity-100"}`}>
        {/* STEP 1 — Welcome */}
        {step === 1 && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="animate-float mb-6">
              <WaveIcon className="h-12 w-12 text-teal-soft" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-cream">
              {isTherapistRef
                ? "Welcome \u2014 your therapist sent you to the right place"
                : "Welcome to Regulate"}
            </h1>
            <p className="mx-auto mt-3 max-w-[300px] text-sm leading-relaxed text-cream-dim">
              {isTherapistRef
                ? "Regulate gives you somatic tools to use between sessions. Everything your therapist would guide you through \u2014 in your pocket."
                : "When panic hits, your thinking brain goes offline. Regulate works with your body \u2014 because that\u2019s what actually helps."}
            </p>
            {!isTherapistRef && (
            <p className="mx-auto mt-3 max-w-[300px] text-xs leading-relaxed text-cream-dim/70">
              Somatic tools grounded in polyvagal theory. Free for every crisis, forever.
            </p>
            )}
            <p className="mx-auto mt-3 max-w-[300px] text-xs text-cream-dim/50">
              Your data never leaves this device. No accounts, no cloud, no tracking.
            </p>
            <button
              onClick={next}
              className="mt-10 w-full max-w-[220px] rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              I&apos;m ready
            </button>
          </div>
        )}

        {/* STEP 2 — What brings you here */}
        {step === 2 && (
          <div>
            <h2 className="text-center text-xl font-light text-cream">What are you navigating right now?</h2>
            <p className="mt-2 text-center text-sm text-cream-dim">Select all that apply.</p>
            <div className="mt-8 flex flex-col gap-2">
              {reasonOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setReasons(toggle(reasons, r))}
                  className={`w-full rounded-xl border py-4 text-left px-5 text-sm transition-all ${
                    reasons.includes(r)
                      ? "border-teal/40 bg-teal/15 text-teal-soft"
                      : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-teal/20"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={next}
              className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 3 — What has helped */}
        {step === 3 && (
          <div>
            <h2 className="text-center text-xl font-light text-cream">Has anything helped, even a little?</h2>
            <p className="mt-2 text-center text-sm text-cream-dim">Select all that apply.</p>
            <div className="mt-8 flex flex-col gap-2">
              {helpedOptions.map((h) => (
                <button
                  key={h}
                  onClick={() => setHelped(toggle(helped, h))}
                  className={`w-full rounded-xl border py-4 text-left px-5 text-sm transition-all ${
                    helped.includes(h)
                      ? "border-teal/40 bg-teal/15 text-teal-soft"
                      : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-teal/20"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            <button
              onClick={next}
              className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 4 — Triggers */}
        {step === 4 && (
          <div>
            <h2 className="text-center text-xl font-light text-cream">What tends to activate your nervous system?</h2>
            <p className="mt-2 text-center text-sm text-cream-dim">Select all that apply.</p>
            <div className="mt-8 flex flex-col gap-2">
              {triggerOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setTriggers(toggle(triggers, t))}
                  className={`w-full rounded-xl border py-4 text-left px-5 text-sm transition-all ${
                    triggers.includes(t)
                      ? "border-candle/40 bg-candle/10 text-candle-soft"
                      : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-candle/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={next}
              className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 5 — Pick go-to tools */}
        {step === 5 && (
          <div>
            <h2 className="text-center text-xl font-light text-cream">Which tools do you want quick access to?</h2>
            <p className="mt-2 text-center text-sm text-cream-dim">
              We&apos;ll put these at the top for you. You can always change this later.
            </p>
            <div className="mt-8 flex flex-col gap-2">
              {allModules.map((mod) => {
                const selected = quickAccess.some((m) => m.href === mod.href);
                return (
                  <button
                    key={mod.href}
                    onClick={() => toggleQuickAccess(mod)}
                    className={`flex w-full items-center gap-3 rounded-xl border py-4 px-5 text-left text-sm transition-all ${
                      selected
                        ? "border-teal/40 bg-teal/15 text-teal-soft"
                        : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-teal/20"
                    }`}
                  >
                    <span>{mod.title}</span>
                    {selected && (
                      <svg className="ml-auto h-5 w-5" viewBox="0 0 20 20" fill="none">
                        <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={next}
              disabled={quickAccess.length === 0}
              className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98] disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 6 — Ready */}
        {step === 6 && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
              <div className="h-12 w-12 rounded-full bg-teal/15" />
            </div>
            <h2 className="text-2xl font-light tracking-tight text-cream">
              Regulate is yours now.
            </h2>
            <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              Come back anytime. Even at 3am.<br />
              You don&apos;t have to be in crisis to use it — regular practice builds resilience over time.
            </p>
            <button
              onClick={finish}
              className="mt-10 w-full max-w-[220px] rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Take me in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
