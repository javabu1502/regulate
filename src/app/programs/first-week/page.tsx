"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────

interface ProgramProgress {
  currentDay: number;
  completedDays: number[];
  startDate: string;
}

interface DayInfo {
  day: number;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

// ─── Program data ─────────────────────────────────────────────────────

const STORAGE_KEY = "regulate-program-first-week";

const days: DayInfo[] = [
  {
    day: 1,
    title: "Breathing Basics",
    description:
      "Your breath is the fastest way to signal safety to your nervous system. The physiological sigh — a double inhale through the nose followed by a long exhale — activates your vagus nerve and shifts you out of fight-or-flight. Today, you will try it for yourself.",
    href: "/breathing",
    linkLabel: "Open breathing exercises",
  },
  {
    day: 2,
    title: "Grounding Your Senses",
    description:
      "When anxiety takes over, your brain loses track of where you actually are. The 5-4-3-2-1 technique uses your senses to anchor you in the present moment — not the story your mind is telling, but what is real and here right now.",
    href: "/grounding",
    linkLabel: "Open grounding exercise",
  },
  {
    day: 3,
    title: "Your Body Knows",
    description:
      "Stress and emotions live in the body before they reach conscious thought. A body scan helps you notice where you are holding tension — your jaw, shoulders, chest — so you can gently release what you have been carrying without even realizing it.",
    href: "/body-scan",
    linkLabel: "Open body scan",
  },
  {
    day: 4,
    title: "Bilateral Tapping",
    description:
      "Alternating left-right stimulation — like the butterfly hug — calms the amygdala, your brain's alarm system. This is the same principle behind EMDR therapy. Crossing your arms over your chest and tapping gently tells your nervous system that you are safe enough to settle.",
    href: "/somatic",
    linkLabel: "Open somatic exercises — choose Bilateral Tapping",
  },
  {
    day: 5,
    title: "Self-Havening",
    description:
      "Gentle, repetitive touch on your face, arms, and palms produces delta waves in the brain — the same waves present in deep sleep. Havening was developed to help process distressing memories, but it is also a beautiful way to soothe yourself in any difficult moment.",
    href: "/somatic",
    linkLabel: "Open somatic exercises — choose Havening",
  },
  {
    day: 6,
    title: "Orienting & Safety",
    description:
      "When your nervous system is stuck in threat-detection mode, it scans internally — racing thoughts, worst-case scenarios. Orienting redirects that scanning outward. Slowly turning your head and noticing your surroundings tells your brainstem: I have looked around, and I am safe here.",
    href: "/somatic",
    linkLabel: "Open somatic exercises — choose Orienting",
  },
  {
    day: 7,
    title: "Your Regulation Toolkit",
    description:
      "You have spent six days meeting different parts of your nervous system's language. Today is about noticing which tools felt most natural to you. There is no right answer — your body already knows what helps. Trust what you felt this week.",
    href: "",
    linkLabel: "",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function loadProgress(): ProgramProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgress(p: ProgramProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Check if user has done a session today (from SOS history or journal)
function hasSessionToday(): boolean {
  try {
    const today = todayString();
    const history = JSON.parse(
      localStorage.getItem("regulate-sos-history") || "[]",
    );
    const hasHistoryToday = history.some(
      (h: { timestamp?: number; date?: string }) => {
        if (h.date) return h.date.startsWith(today);
        if (h.timestamp)
          return new Date(h.timestamp).toISOString().startsWith(today);
        return false;
      },
    );
    if (hasHistoryToday) return true;

    const journal = JSON.parse(
      localStorage.getItem("regulate-journal") || "[]",
    );
    const hasJournalToday = journal.some(
      (e: { timestamp?: number; date?: string }) => {
        if (e.date) return e.date.startsWith(today);
        if (e.timestamp)
          return new Date(e.timestamp).toISOString().startsWith(today);
        return false;
      },
    );
    return hasJournalToday;
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────

export default function FirstWeekPage() {
  const [progress, setProgress] = useState<ProgramProgress | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sessionToday, setSessionToday] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const existing = loadProgress();
    if (existing) {
      setProgress(existing);
    } else {
      // Auto-start the program
      const initial: ProgramProgress = {
        currentDay: 1,
        completedDays: [],
        startDate: todayString(),
      };
      saveProgress(initial);
      setProgress(initial);
    }
    setSessionToday(hasSessionToday());
    setLoaded(true);
  }, []);

  const markComplete = useCallback(
    (day: number) => {
      if (!progress) return;
      const completed = progress.completedDays.includes(day)
        ? progress.completedDays
        : [...progress.completedDays, day].sort((a, b) => a - b);

      const nextDay = Math.min(
        Math.max(progress.currentDay, day + 1),
        7,
      );

      const updated: ProgramProgress = {
        ...progress,
        completedDays: completed,
        currentDay: completed.length === 7 ? 7 : nextDay,
      };
      saveProgress(updated);
      setProgress(updated);

      if (completed.length === 7) {
        setShowCelebration(true);
      }
    },
    [progress],
  );

  if (!loaded || !progress) {
    return <div className="min-h-screen bg-midnight" />;
  }

  const completedAll = progress.completedDays.length === 7;

  // Day 7 toolkit: all previous techniques for review
  const toolkitTechniques = [
    { name: "Physiological Sigh", href: "/breathing", day: 1 },
    { name: "5-4-3-2-1 Grounding", href: "/grounding", day: 2 },
    { name: "Body Scan", href: "/body-scan", day: 3 },
    { name: "Bilateral Tapping", href: "/somatic", day: 4 },
    { name: "Havening", href: "/somatic", day: 5 },
    { name: "Orienting", href: "/somatic", day: 6 },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link
          href="/programs"
          className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-y-px"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Programs
        </Link>

        <header className="mb-8 mt-6 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
            7-day program
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-cream">
            Your First Week with Regulate
          </h1>
          <p className="mt-2 text-sm text-cream-dim/50">
            One practice a day. No deadlines, no streaks — just getting to know
            what helps your body.
          </p>
        </header>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-cream-dim/40">
            <span>{progress.completedDays.length} of 7 complete</span>
            {completedAll && (
              <span className="text-teal-soft/70">All done</span>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <div
                key={d}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  progress.completedDays.includes(d)
                    ? "bg-teal/60"
                    : "bg-slate-blue/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Day cards */}
        <div className="flex flex-col gap-3">
          {days.map((dayInfo) => {
            const isCompleted = progress.completedDays.includes(dayInfo.day);
            const isCurrent = dayInfo.day === progress.currentDay && !completedAll;
            const isDay7 = dayInfo.day === 7;

            return (
              <div
                key={dayInfo.day}
                className={`rounded-2xl border p-5 transition-colors ${
                  isCurrent
                    ? "border-teal/25 bg-teal/5"
                    : isCompleted
                      ? "border-teal/10 bg-deep/40"
                      : "border-slate-blue/10 bg-deep/30"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-widest ${
                          isCurrent
                            ? "text-teal-soft/70"
                            : "text-cream-dim/30"
                        }`}
                      >
                        Day {dayInfo.day}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] text-teal-soft/70">
                          Today
                        </span>
                      )}
                    </div>
                    <h2
                      className={`mt-1 text-base font-medium ${
                        isCompleted ? "text-cream/70" : "text-cream"
                      }`}
                    >
                      {dayInfo.title}
                    </h2>
                  </div>
                  {isCompleted && (
                    <div className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="text-teal-soft"
                      >
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2.5 text-xs leading-relaxed text-cream-dim/50">
                  {dayInfo.description}
                </p>

                {/* Day 7 special: toolkit review */}
                {isDay7 && (
                  <div className="mt-4">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-cream-dim/30">
                      Your toolkit
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {toolkitTechniques.map((t) => (
                        <div
                          key={t.name}
                          className="flex items-center justify-between rounded-xl border border-slate-blue/10 bg-deep/40 px-4 py-3"
                        >
                          <div className="flex items-center gap-2.5">
                            {progress.completedDays.includes(t.day) ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                className="text-teal-soft/60"
                              >
                                <path
                                  d="M2.5 6L5 8.5L9.5 3.5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <div className="h-3 w-3 rounded-full border border-slate-blue/20" />
                            )}
                            <span className="text-sm text-cream">
                              {t.name}
                            </span>
                          </div>
                          <Link
                            href={t.href}
                            className="text-xs text-teal-soft/60 transition-colors hover:text-teal-soft"
                          >
                            Practice
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!isDay7 && (
                    <Link
                      href={dayInfo.href}
                      className="rounded-xl bg-teal/15 px-4 py-2.5 text-xs font-medium text-teal-soft transition-colors hover:bg-teal/25"
                    >
                      {dayInfo.linkLabel}
                    </Link>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={() => markComplete(dayInfo.day)}
                      className={`rounded-xl border px-4 py-2.5 text-xs transition-colors ${
                        sessionToday || isDay7
                          ? "border-teal/20 text-teal-soft/70 hover:bg-teal/10"
                          : "border-slate-blue/20 text-cream-dim/50 hover:text-cream-dim"
                      }`}
                    >
                      Mark complete
                    </button>
                  )}
                  {isCompleted && !isDay7 && (
                    <Link
                      href={dayInfo.href}
                      className="rounded-xl border border-slate-blue/15 px-4 py-2.5 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
                    >
                      Practice again
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Celebration modal */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-teal/20 bg-deep p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/15">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-teal-soft"
                >
                  <path
                    d="M5 12L10 17L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-cream">
                You did it.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim/60">
                Seven days. Six techniques. Your nervous system has been
                listening the whole time — and now you have a set of tools you
                can reach for whenever you need them.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim/50">
                There is no finish line here. Come back to any practice whenever
                it feels right. Your body will guide you.
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="mt-6 w-full rounded-xl bg-teal/15 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
              >
                Thank you
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
