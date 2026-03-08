"use client";

import { useState } from "react";
import BreathOrb from "@/components/BreathOrb";
import ModuleCard from "@/components/ModuleCard";
import SOSFlow from "@/components/SOSFlow";

const modules = [
  {
    href: "/breathing",
    title: "Guided Breathing",
    description: "Slow your breath, calm your nervous system.",
    icon: "🌬",
    accentColor: "teal" as const,
  },
  {
    href: "/grounding",
    title: "5-4-3-2-1 Grounding",
    description: "Come back to your senses, right here, right now.",
    icon: "🖐",
    accentColor: "teal" as const,
  },
  {
    href: "/body-scan",
    title: "Body Scan",
    description: "Progressive muscle relaxation, head to toe.",
    icon: "🫀",
    accentColor: "candle" as const,
  },
  {
    href: "/somatic",
    title: "Somatic Movement",
    description: "Swaying, bilateral tapping, and gentle shaking.",
    icon: "🌊",
    accentColor: "teal" as const,
  },
  {
    href: "/affirmations",
    title: "Affirmations",
    description: "Words to hold you when things feel overwhelming.",
    icon: "💛",
    accentColor: "candle" as const,
  },
  {
    href: "/journal",
    title: "Panic Tracker",
    description: "Log episodes, notice patterns, track your healing.",
    icon: "📓",
    accentColor: "candle" as const,
  },
  {
    href: "/learn",
    title: "Learn",
    description: "Understand your nervous system and why these tools work.",
    icon: "🧠",
    accentColor: "teal" as const,
  },
];

export default function Home() {
  const [showSOS, setShowSOS] = useState(false);

  return (
    <>
      {showSOS && <SOSFlow onClose={() => setShowSOS(false)} />}

      <div className="relative flex min-h-screen flex-col items-center px-5 pb-16 pt-12">
        <BreathOrb />

        <main className="relative z-10 w-full max-w-md">
          {/* Header */}
          <header className="mb-6 text-center">
            <div className="animate-float mb-4 inline-block text-4xl">🕯</div>
            <h1 className="text-2xl font-semibold tracking-tight text-cream">
              Regulate
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              You&apos;re safe here. Pick a tool that feels right.
            </p>
          </header>

          {/* SOS Button */}
          <button
            onClick={() => setShowSOS(true)}
            className="animate-pulse-soft mb-6 w-full rounded-2xl border border-candle/25 bg-candle/12 py-5 text-center text-base font-medium text-candle transition-all duration-300 hover:bg-candle/20 hover:shadow-lg hover:shadow-candle/10 active:scale-[0.98]"
          >
            I need help right now
          </button>

          {/* Module grid */}
          <div className="flex flex-col gap-3">
            {modules.map((mod) => (
              <ModuleCard key={mod.href} {...mod} />
            ))}
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center">
            <p className="animate-pulse-soft text-xs text-cream-dim/60">
              Breathe. You are here.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
