"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BreathOrb from "@/components/BreathOrb";
import ModuleCard from "@/components/ModuleCard";
import SOSFlow from "@/components/SOSFlow";
import MyPersonSection from "@/components/MyPerson";
import NSStateSelector, { getCurrentNSState } from "@/components/NSStateSelector";
import { computeStreak } from "@/lib/streak";
import { getRecommendations } from "@/lib/recommendations";
import {
  BreathingIcon,
  GroundingIcon,
  BodyScanIcon,
  SomaticIcon,
  AffirmationsIcon,
  JournalIcon,
  LearnIcon,
  CandleIcon,
} from "@/components/Icons";

const modules = [
  {
    href: "/breathing",
    title: "Guided Breathing",
    description: "Slow your breath, calm your nervous system.",
    icon: <BreathingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/grounding",
    title: "5-4-3-2-1 Grounding",
    description: "Come back to your senses, right here, right now.",
    icon: <GroundingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/body-scan",
    title: "Body Scan",
    description: "Progressive relaxation, head to toe.",
    icon: <BodyScanIcon className="h-5 w-5 text-candle-soft" />,
    accentColor: "candle" as const,
  },
  {
    href: "/somatic",
    title: "Somatic Movement",
    description: "Gentle movement to release what your body is holding.",
    icon: <SomaticIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/affirmations",
    title: "Affirmations",
    description: "Words to hold you when things feel heavy.",
    icon: <AffirmationsIcon className="h-5 w-5 text-candle-soft" />,
    accentColor: "candle" as const,
  },
  {
    href: "/journal",
    title: "Journal",
    description: "Log episodes, notice patterns, track your healing.",
    icon: <JournalIcon className="h-5 w-5 text-candle-soft" />,
    accentColor: "candle" as const,
  },
  {
    href: "/learn",
    title: "Learn",
    description: "Understand your nervous system and why these tools work.",
    icon: <LearnIcon className="h-5 w-5 text-teal-soft" />,
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

interface QuickAccessItem {
  href: string;
  title: string;
  icon: string;
}

export default function Home() {
  const [showSOS, setShowSOS] = useState(false);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [streak, setStreak] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [recommendations, setRecommendations] = useState<{ href: string; title: string; reason: string }[]>([]);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quick_access");
      if (saved) setQuickAccess(JSON.parse(saved));
    } catch { /* */ }

    // Streak
    try {
      setStreak(computeStreak());
    } catch { /* */ }

    // Recommendations
    try {
      const nsState = getCurrentNSState();
      setRecommendations(getRecommendations(nsState));
    } catch { /* */ }

    // Install prompt dismissed state
    try {
      const dismissed = localStorage.getItem("regulate-install-dismissed");
      setInstallDismissed(dismissed === "true");
    } catch { /* */ }
  }, []);

  // Listen for beforeinstallprompt
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
    try {
      localStorage.setItem("regulate-install-dismissed", "true");
    } catch { /* */ }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (installPrompt as any).prompt();
    dismissInstall();
  }, [installPrompt, dismissInstall]);

  return (
    <>
      {showSOS && <SOSFlow onClose={() => setShowSOS(false)} />}

      <div className="relative flex min-h-screen flex-col items-center px-5 pb-16 pt-12">
        <BreathOrb />

        <main className="relative z-10 w-full max-w-md">
          {/* Header */}
          <header className="mb-6 text-center">
            <div className="animate-float mb-4 inline-flex h-10 w-10 items-center justify-center">
              <CandleIcon className="h-8 w-8 text-candle" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-cream">
              Regulate
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Nervous system support for hard moments.
            </p>
            {streak.current > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-candle/20 bg-candle/10 px-3 py-1">
                <CandleIcon className="h-3.5 w-3.5 text-candle" />
                <span className="text-xs font-medium text-candle">{streak.current} {streak.current === 1 ? "day" : "days"}</span>
              </div>
            )}
          </header>

          {/* SOS Button */}
          <button
            onClick={() => setShowSOS(true)}
            className="group relative mb-3 w-full overflow-hidden rounded-2xl border border-candle/25 bg-candle/12 py-5 text-center transition-all duration-300 hover:bg-candle/20 hover:shadow-lg hover:shadow-candle/10 active:scale-[0.98]"
            style={{ minHeight: "72px" }}
          >
            <div className="absolute inset-0 animate-[sos-pulse_4s_ease-in-out_infinite] bg-candle/5" />
            <span className="relative block text-base font-medium text-candle">I need support right now</span>
            <span className="relative mt-1 block text-xs text-candle/50">Tap here during a panic attack or moment of crisis</span>
          </button>

          <div className="mb-1 text-center">
            <Link
              href="/sleep"
              className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
            >
              Can&apos;t sleep?
            </Link>
          </div>

          {/* Call My Person */}
          <MyPersonSection />

          {/* Nervous System State */}
          <div className="mb-6">
            <NSStateSelector compact heading="How is your nervous system?" />
          </div>

          {/* Suggested for you */}
          {recommendations.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cream-dim/40">Suggested for you</p>
              <div className="flex flex-col gap-2">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <Link
                    key={i}
                    href={rec.href}
                    className="flex items-center justify-between rounded-2xl border border-teal/15 bg-deep/60 px-4 py-3 transition-all duration-300 hover:border-teal/30 hover:shadow-md hover:shadow-teal/5 active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-medium text-cream">{rec.title}</p>
                      <p className="mt-0.5 text-xs text-cream-dim/50">{rec.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Access */}
          {quickAccess.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cream-dim/40">Quick Access</p>
              <div className="grid grid-cols-3 gap-2">
                {quickAccess.map((mod) => (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-teal/15 bg-deep/60 p-4 text-center transition-all duration-300 hover:border-teal/30 hover:shadow-md hover:shadow-teal/5 active:scale-[0.97]"
                  >
                    <span className="text-xs leading-tight text-cream-dim">{mod.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Module grid */}
          <div className="flex flex-col gap-3">
            {modules.map((mod) => (
              <ModuleCard key={mod.href} {...mod} />
            ))}
          </div>

          {/* Trust statement */}
          <div className="mt-8 rounded-xl border border-cream-dim/8 bg-deep/40 px-4 py-3">
            <p className="text-center text-xs leading-relaxed text-cream-dim/40">
              Regulate supports your nervous system between therapy sessions. It is not a replacement for professional mental health care. If you are in crisis, please reach out to a person you trust or contact the{" "}
              <a href="tel:988" className="text-cream-dim/60 underline underline-offset-2">988 Suicide and Crisis Lifeline</a>.
            </p>
          </div>

          {/* Install banner */}
          {installPrompt && !installDismissed && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-teal/20 bg-deep/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-cream">Install Regulate</p>
                <p className="text-xs text-cream-dim/50">Add to your home screen for quick access.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-medium text-teal transition-colors hover:bg-teal/30"
                >
                  Install
                </button>
                <button
                  onClick={dismissInstall}
                  className="rounded-lg px-2 py-1.5 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/caregiver" className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
                Helping someone?
              </Link>
              <span className="text-cream-dim/20">&middot;</span>
              <Link href="/safety-plan" className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
                Safety Plan
              </Link>
              <span className="text-cream-dim/20">&middot;</span>
              <Link href="/crisis" className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
                Crisis Resources
              </Link>
              <span className="text-cream-dim/20">&middot;</span>
              <Link href="/history" className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
                History
              </Link>
              <span className="text-cream-dim/20">&middot;</span>
              <Link href="/settings" className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">
                Settings
              </Link>
            </div>
            <p className="text-xs text-cream-dim/30">
              Breathe. You are here.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
