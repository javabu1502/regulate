"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ProgramProgress {
  currentDay: number;
  completedDays: number[];
  startDate: string;
}

const FIRST_WEEK_KEY = "regulate-program-first-week";

const FIRST_WEEK_DAYS = [
  "Breathing Basics",
  "Grounding Your Senses",
  "Your Body Knows",
  "Bilateral Tapping",
  "Self-Havening",
  "Orienting & Safety",
  "Your Regulation Toolkit",
];

export default function ProgramsPage() {
  const [firstWeekProgress, setFirstWeekProgress] =
    useState<ProgramProgress | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FIRST_WEEK_KEY);
      if (raw) {
        setFirstWeekProgress(JSON.parse(raw));
      }
    } catch {}
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <div className="min-h-screen bg-midnight" />;
  }

  const completedAll =
    firstWeekProgress?.completedDays?.length === 7;
  const inProgress =
    firstWeekProgress && !completedAll;
  const currentDayTitle = inProgress
    ? FIRST_WEEK_DAYS[(firstWeekProgress.currentDay || 1) - 1]
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
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
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">
            Programs
          </h1>
          <p className="mt-2 text-sm text-cream-dim/50">
            Gentle, guided paths through the tools that help your nervous system
            find balance.
          </p>
        </header>

        {/* First Week Program Card */}
        <Link
          href="/programs/first-week"
          className="block w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 transition-colors hover:border-teal/30"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
                7-day program
              </p>
              <h2 className="mt-1.5 text-base font-medium text-cream">
                Your First Week with Regulate
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/50">
                One technique a day, no pressure. By the end of the week,
                you&apos;ll have a small toolkit of practices that your nervous
                system recognizes.
              </p>
            </div>
            <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-teal-soft"
              >
                <path
                  d="M3 10C3 10 6 6 10 6C14 6 17 10 17 10"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <path
                  d="M3 10C3 10 6 14 10 14C14 14 17 10 17 10"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Progress */}
          {completedAll ? (
            <div className="mt-4 flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="text-teal-soft"
              >
                <path
                  d="M3 7L6 10L11 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs text-teal-soft/70">Completed</span>
            </div>
          ) : inProgress ? (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cream-dim/50">
                  Day {firstWeekProgress.currentDay}: {currentDayTitle}
                </span>
                <span className="text-xs text-teal-soft/60">
                  {firstWeekProgress.completedDays.length}/7
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-blue/20">
                <div
                  className="h-full rounded-full bg-teal/50 transition-all"
                  style={{
                    width: `${(firstWeekProgress.completedDays.length / 7) * 100}%`,
                  }}
                />
              </div>
              <span className="mt-3 inline-block rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal-soft">
                Continue
              </span>
            </div>
          ) : (
            <span className="mt-4 inline-block rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal-soft">
              Start program
            </span>
          )}
        </Link>

        {/* More coming */}
        <div className="mt-6 rounded-2xl border border-slate-blue/10 bg-deep/30 p-5 text-center">
          <p className="text-xs text-cream-dim/30">
            More programs are on the way.
          </p>
        </div>
      </div>
    </div>
  );
}
