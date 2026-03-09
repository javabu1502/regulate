"use client";

import { useState, useEffect, useCallback } from "react";
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

function getGreeting(hour: number): string {
  if (hour < 5) return "It's late. Be gentle with yourself.";
  if (hour < 12) return "Good morning. How is your body feeling?";
  if (hour < 17) return "Take a moment. You deserve a pause.";
  if (hour < 21) return "Winding down. You made it through today.";
  return "The day is ending. Let your body rest.";
}

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [greeting, setGreeting] = useState("Nervous system support for hard moments.");

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));

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

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-14">
      <main className="w-full max-w-md">
        {/* Header — clean and quiet */}
        <header className="mb-10 text-center">
          <WaveIcon className="mx-auto mb-4 h-8 w-8 text-teal-soft/70" />
          <h1 className="text-2xl font-light tracking-tight text-cream">
            Regulate
          </h1>
          <p className="mt-2 text-sm text-cream-dim/60">
            {greeting}
          </p>
        </header>

        {/* Tools — the main event */}
        <div className="flex flex-col gap-2.5">
          {modules.map((mod) => (
            <ModuleCard key={mod.href} {...mod} />
          ))}
        </div>

        {/* Secondary links */}
        <div className="mt-4 flex gap-2">
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
        <div className="mt-6">
          <MyPersonSection />
        </div>

        {/* Trust statement */}
        <p className="mt-8 text-center text-[11px] leading-relaxed text-cream-dim/30">
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
