"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ModuleCard from "@/components/ModuleCard";
import MyPersonSection from "@/components/MyPerson";
import {
  BreathingIcon,
  GroundingIcon,
  BodyScanIcon,
  SomaticIcon,
  AffirmationsIcon,
  JournalIcon,
  LearnIcon,
  WaveIcon,
} from "@/components/Icons";

// ─── Body state options ─────────────────────────────────────────────

const bodyStates = [
  {
    id: "panicking",
    label: "Racing or panicking",
    sub: "Heart pounding, can't breathe, spiraling",
    route: "/sos?state=panicking",
    color: "border-candle/30 bg-candle/8 hover:border-candle/50",
    textColor: "text-candle",
  },
  {
    id: "anxious",
    label: "Tense or anxious",
    sub: "On edge, restless, can't settle",
    route: "/sos?state=anxious",
    color: "border-teal/25 bg-teal/8 hover:border-teal/40",
    textColor: "text-teal-soft",
  },
  {
    id: "shutdown",
    label: "Shut down or numb",
    sub: "Frozen, disconnected, can't feel much",
    route: "/sos?state=shutdown",
    color: "border-slate-blue/40 bg-slate-blue/15 hover:border-slate-blue/60",
    textColor: "text-cream-dim",
  },
];

// ─── Practice modules ───────────────────────────────────────────────

const modules = [
  {
    href: "/breathing",
    title: "Breathing",
    description: "Slow your breath, calm your nervous system.",
    icon: <BreathingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/grounding",
    title: "Grounding",
    description: "Come back to your senses, right here.",
    icon: <GroundingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/somatic",
    title: "Somatic",
    description: "Release what your body is holding.",
    icon: <SomaticIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/body-scan",
    title: "Body Scan",
    description: "Progressive relaxation, head to toe.",
    icon: <BodyScanIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/affirmations",
    title: "Affirmations",
    description: "Words to hold you when things feel heavy.",
    icon: <AffirmationsIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/sleep",
    title: "Sleep",
    description: "A calming sequence for restless nights.",
    icon: <LearnIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
];

const secondaryLinks = [
  { href: "/journal", title: "Journal", icon: <JournalIcon className="h-4 w-4" /> },
  { href: "/learn", title: "Learn", icon: <LearnIcon className="h-4 w-4" /> },
];

// ─── Component ──────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"check-in" | "feed">("check-in");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("regulate-install-dismissed");
      setInstallDismissed(dismissed === "true");
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    try { localStorage.setItem("regulate-install-dismissed", "true"); } catch { /* */ }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (installPrompt as any).prompt();
    dismissInstall();
  }, [installPrompt, dismissInstall]);

  // ─── CHECK-IN VIEW (default — the triage) ────────────────────────

  if (view === "check-in") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pb-24">
        <main className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <WaveIcon className="mx-auto mb-4 h-8 w-8 text-teal-soft/60" />
            <h1 className="text-xl font-light tracking-tight text-cream">
              How is your body right now?
            </h1>
          </div>

          <div className="flex flex-col gap-3">
            {bodyStates.map((state) => (
              <button
                key={state.id}
                onClick={() => router.push(state.route)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-all active:scale-[0.98] ${state.color}`}
              >
                <span className={`block text-base font-medium ${state.textColor}`}>{state.label}</span>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{state.sub}</span>
              </button>
            ))}

            <button
              onClick={() => setView("feed")}
              className="w-full rounded-2xl border border-teal/15 bg-teal/5 px-5 py-4 text-left transition-all active:scale-[0.98] hover:border-teal/30"
            >
              <span className="block text-base font-medium text-teal-soft">I&apos;m okay right now</span>
              <span className="mt-0.5 block text-xs text-cream-dim/50">Just here to practice or explore</span>
            </button>
          </div>

          {/* Crisis line */}
          <div className="mt-10 flex justify-center">
            <a href="tel:988" className="text-[11px] text-cream-dim/25 underline underline-offset-2 hover:text-cream-dim/50">
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </main>
      </div>
    );
  }

  // ─── FEED VIEW (practice tools) ──────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <main className="w-full max-w-md">
        {/* Header */}
        <header className="mb-6 text-center">
          <WaveIcon className="mx-auto mb-3 h-7 w-7 text-teal-soft/60" />
          <h1 className="text-xl font-light tracking-tight text-cream">Regulate</h1>
          <p className="mt-1.5 text-xs text-cream-dim/50">
            Tools for your nervous system.
          </p>
        </header>

        {/* Quick check-in link at top */}
        <button
          onClick={() => setView("check-in")}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-candle/20 bg-candle/5 px-4 py-3.5 text-sm text-candle transition-all hover:border-candle/35 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12H7L9 6L12 18L15 9L17 12H22" />
          </svg>
          I need support right now
        </button>

        {/* Tools */}
        <div className="flex flex-col gap-2">
          {modules.map((mod) => (
            <ModuleCard key={mod.href} {...mod} />
          ))}
        </div>

        {/* Secondary links */}
        <div className="mt-3 flex gap-2">
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/40 py-3 text-xs text-cream-dim/50 transition-colors hover:border-teal/20 hover:text-cream-dim"
            >
              {link.icon}
              {link.title}
            </Link>
          ))}
        </div>

        {/* My person */}
        <div className="mt-5">
          <MyPersonSection />
        </div>

        {/* Trust statement */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-cream-dim/30">
          Regulate supports your nervous system between therapy sessions. It is not a replacement for professional mental health care. If you are in crisis, please contact the{" "}
          <a href="tel:988" className="text-cream-dim/50 underline underline-offset-2">988 Lifeline</a>.
        </p>

        {/* Install banner */}
        {installPrompt && !installDismissed && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-teal/15 bg-deep/40 px-4 py-3">
            <p className="text-xs text-cream-dim/50">Add to home screen</p>
            <div className="flex items-center gap-2">
              <button onClick={handleInstall} className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs text-teal-soft hover:bg-teal/30">Install</button>
              <button onClick={dismissInstall} className="text-xs text-cream-dim/30 hover:text-cream-dim">Dismiss</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-6 flex justify-center gap-4 text-[11px] text-cream-dim/25">
          <Link href="/caregiver" className="hover:text-cream-dim/50">Helping someone?</Link>
          <Link href="/safety-plan" className="hover:text-cream-dim/50">Safety Plan</Link>
          <Link href="/crisis" className="hover:text-cream-dim/50">Crisis Resources</Link>
        </footer>
      </main>
    </div>
  );
}
