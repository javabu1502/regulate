"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isPremium } from "@/lib/premium";
import { getTopTechniques, type TopTechnique } from "@/lib/recommendations";
import { JournalIcon, WaveIcon } from "@/components/Icons";
import PremiumGate from "@/components/PremiumGate";

// ─── Daily practice rotation (7-day cycle) ─────────────────────────

const dailyPractices = [
  {
    id: "breathing",
    name: "Physiological Sigh",
    desc: "Two quick inhales through your nose, then a long slow exhale. Feels good fast.",
    time: "~1 min",
    href: "/breathing",
  },
  {
    id: "body-scan",
    name: "Quick Body Scan",
    desc: "Just notice what's going on in your body. No fixing, just noticing.",
    time: "5 min",
    href: "/body-scan",
  },
  {
    id: "orienting",
    name: "Orienting",
    desc: "Slowly look around the room. It sounds simple, but it really works.",
    time: "2 min",
    href: "/somatic?exercise=orienting",
  },
  {
    id: "pendulation",
    name: "Pendulation",
    desc: "Notice where you feel tense, then find somewhere that feels okay. Go back and forth.",
    time: "3 min",
    href: "/somatic?exercise=pendulation",
  },
  {
    id: "havening",
    name: "Self-Havening",
    desc: "Soft strokes on your arms and face. Surprisingly calming.",
    time: "3 min",
    href: "/somatic?exercise=havening",
  },
  {
    id: "extended",
    name: "Coherence Breathing",
    desc: "5 seconds in, 5 seconds out. A steady rhythm your whole body can settle into.",
    time: "~1 min",
    href: "/breathing",
  },
  {
    id: "grounding",
    name: "5-4-3-2-1 Grounding",
    desc: "Name what you can see, hear, touch. Gets you out of your head fast.",
    time: "3 min",
    href: "/grounding",
  },
];

const ALL_SOMATIC_TOOLS = [
  "breathing", "extended", "tapping", "grounding", "gentle-movement",
  "body-scan", "somatic", "affirmations", "sleep", "orienting",
  "havening", "pendulation", "humming", "body-shaking",
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekDays(): { label: string; date: string; practiced: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const days: { label: string; date: string; practiced: boolean }[] = [];

  // Get SOS history timestamps
  let practiceDates = new Set<string>();
  try {
    const history = JSON.parse(localStorage.getItem("regulate-sos-history") || "[]") as { ts?: string }[];
    const journal = JSON.parse(localStorage.getItem("regulate-journal") || "[]") as { timestamp?: number; date?: string }[];

    for (const h of history) {
      if (h.ts) practiceDates.add(new Date(h.ts).toDateString());
    }
    for (const j of journal) {
      if (j.timestamp) practiceDates.add(new Date(j.timestamp).toDateString());
      if (j.date) practiceDates.add(new Date(j.date).toDateString());
    }
  } catch {}

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Start from Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + mondayOffset + i);
    days.push({
      label: dayLabels[d.getDay()],
      date: d.toDateString(),
      practiced: practiceDates.has(d.toDateString()),
    });
  }

  return days;
}

export default function PracticePage() {
  const [premium, setPremium] = useState(false);
  const [weekDays, setWeekDays] = useState<ReturnType<typeof getWeekDays>>([]);
  const [topTechniques, setTopTechniques] = useState<TopTechnique[] | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [toolsExplored, setToolsExplored] = useState<{ count: number; total: number } | null>(null);
  const [programState, setProgramState] = useState<{
    status: "not-started" | "in-progress" | "completed";
    currentDay: number;
    completedCount: number;
    dayTitle: string;
  } | null>(null);

  useEffect(() => {
    setPremium(isPremium());

    // Week activity
    setWeekDays(getWeekDays());

    // Top techniques
    try {
      setTopTechniques(getTopTechniques());
    } catch {}

    // Total sessions
    try {
      const history = JSON.parse(localStorage.getItem("regulate-sos-history") || "[]");
      const journal = JSON.parse(localStorage.getItem("regulate-journal") || "[]");
      setTotalSessions(history.length + journal.length);
    } catch {}

    // Tools explored
    try {
      const history = JSON.parse(localStorage.getItem("regulate-sos-history") || "[]") as { tool: string }[];
      const journal = JSON.parse(localStorage.getItem("regulate-journal") || "[]") as { tool?: string; technique?: string }[];
      const usedIds = new Set<string>();
      for (const h of history) if (h.tool) usedIds.add(h.tool);
      for (const j of journal) {
        if (j.tool) usedIds.add(j.tool);
        if (j.technique) usedIds.add(j.technique);
      }
      const explored = ALL_SOMATIC_TOOLS.filter((t) => usedIds.has(t));
      if (history.length > 0 || journal.length > 0) {
        setToolsExplored({ count: explored.length, total: ALL_SOMATIC_TOOLS.length });
      }
    } catch {}

    // Program progress
    try {
      const raw = localStorage.getItem("regulate-program-first-week");
      if (raw) {
        const p = JSON.parse(raw) as { currentDay: number; completedDays: number[]; startDate: string };
        const dayTitles = ["Breathing Basics", "Grounding Your Senses", "Your Body Knows", "Bilateral Tapping", "Self-Havening", "Orienting & Safety", "Your Regulation Toolkit"];
        if (p.completedDays?.length === 7) {
          setProgramState({ status: "completed", currentDay: 7, completedCount: 7, dayTitle: dayTitles[6] });
        } else {
          setProgramState({ status: "in-progress", currentDay: p.currentDay || 1, completedCount: p.completedDays?.length || 0, dayTitle: dayTitles[(p.currentDay || 1) - 1] });
        }
      } else {
        setProgramState({ status: "not-started", currentDay: 1, completedCount: 0, dayTitle: "Breathing Basics" });
      }
    } catch {}
  }, []);

  const todaysPractice = dailyPractices[getDayOfYear() % dailyPractices.length];
  const practicedToday = weekDays.some((d) => d.date === new Date().toDateString() && d.practiced);
  const daysThisWeek = weekDays.filter((d) => d.practiced).length;

  // If not premium, show upsell
  if (!premium) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pb-24">
        <div className="w-full max-w-md">
          <PremiumGate feature="See what's working for you, get a daily suggestion, and keep a journal of your practice.">
            <div />
          </PremiumGate>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <WaveIcon className="mx-auto mb-3 h-7 w-7 text-teal-soft/60" />
          <h1 className="text-xl font-light tracking-tight text-cream">
            Your practice
          </h1>
        </header>

        {/* ── This week ── */}
        <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
            This week
          </p>
          <div className="mt-4 flex justify-between">
            {weekDays.map((day, i) => {
              const isToday = day.date === new Date().toDateString();
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] ${isToday ? "font-medium text-cream" : "text-cream-dim/40"}`}>
                    {day.label}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      day.practiced
                        ? "bg-teal/25 border border-teal/40"
                        : isToday
                          ? "border border-slate-blue/30 bg-slate-blue/10"
                          : "border border-slate-blue/15"
                    }`}
                  >
                    {day.practiced && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-teal-soft">
                        <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {daysThisWeek > 0 && (
            <p className="mt-3 text-center text-xs text-cream-dim/50">
              {daysThisWeek} {daysThisWeek === 1 ? "day" : "days"} this week
            </p>
          )}
        </div>

        {/* ── Suggested exercise ── */}
        <div className="mt-3 rounded-2xl border border-teal/15 bg-teal/5 p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
            {practicedToday ? "Another one to try" : "Try today"}
          </p>
          <p className="mt-2 text-sm font-medium text-cream">
            {todaysPractice.name}
          </p>
          <p className="mt-0.5 text-xs text-cream-dim/60">
            {todaysPractice.desc}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-cream-dim/40">
              {todaysPractice.time}
            </span>
            <Link
              href={todaysPractice.href}
              className="rounded-xl bg-teal/20 px-5 py-2 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30 active:scale-[0.97]"
            >
              Start
            </Link>
          </div>
        </div>

        {/* ── What helps your body ── */}
        {topTechniques && topTechniques.length > 0 && (
          <div className="mt-3 rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/50">
              What&apos;s been helping
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {topTechniques.map((t) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cream">{t.label}</span>
                    <span className="text-xs text-cream-dim/50">
                      {t.totalSessions} {t.totalSessions === 1 ? "session" : "sessions"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-blue/15">
                    <div
                      className="h-full rounded-full bg-teal/50 transition-all duration-500"
                      style={{ width: `${Math.max(Math.round(t.successRate * 100), 8)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-cream-dim/40">
                    Helped {Math.round(t.successRate * 100)}% of the time
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Program progress ── */}
        {programState && programState.status !== "completed" && (
          <Link
            href="/programs/first-week"
            className="mt-3 block rounded-2xl border border-teal/20 bg-teal/8 p-5 transition-colors hover:border-teal/30"
          >
            {programState.status === "not-started" ? (
              <>
                <p className="text-sm font-medium text-cream">Start your first week</p>
                <p className="mt-1 text-xs text-cream-dim/60">
                  7 days of guided practice - one technique a day.
                </p>
                <span className="mt-2 inline-block text-xs font-medium text-teal-soft">
                  Begin &rarr;
                </span>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-cream">
                  Day {programState.currentDay}: {programState.dayTitle}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <div
                        key={d}
                        className={`h-1 w-4 rounded-full ${d <= programState.completedCount ? "bg-teal/60" : "bg-slate-blue/20"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-teal-soft">
                    Continue &rarr;
                  </span>
                </div>
              </>
            )}
          </Link>
        )}

        {/* ── Tools explored ── */}
        {toolsExplored && toolsExplored.count < toolsExplored.total && (
          <div className="mt-3 rounded-2xl border border-teal/10 bg-deep/40 p-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-teal-soft/40">
              Tools explored
            </p>
            <p className="mt-2 text-sm text-cream">
              {toolsExplored.count} of {toolsExplored.total} exercises tried
            </p>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-blue/15">
              <div
                className="h-full rounded-full bg-teal/40 transition-all duration-500"
                style={{ width: `${(toolsExplored.count / toolsExplored.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Quick stats ── */}
        {totalSessions > 0 && (
          <div className="mt-3 rounded-2xl border border-teal/10 bg-deep/40 p-5">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-lg font-medium text-teal-soft">{totalSessions}</p>
                <p className="text-[10px] text-cream-dim/50">total sessions</p>
              </div>
              {toolsExplored && (
                <div className="text-center">
                  <p className="text-lg font-medium text-cream">{toolsExplored.count}</p>
                  <p className="text-[10px] text-cream-dim/50">tools tried</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Journal link ── */}
        <Link
          href="/journal"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-purple-400/15 bg-purple-400/5 p-5 transition-colors hover:border-purple-400/25"
        >
          <JournalIcon className="h-5 w-5 text-purple-300/60" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cream">Journal</p>
            <p className="text-xs text-cream-dim/50">Write about what you&apos;re noticing</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-cream-dim/30">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {/* ── Empty state ── */}
        {totalSessions === 0 && !topTechniques && (
          <div className="mt-6 rounded-2xl border border-slate-blue/15 bg-deep/40 p-6 text-center">
            <p className="text-sm text-cream-dim/60">
              Your insights will appear here as you practice.
            </p>
            <p className="mt-1 text-xs text-cream-dim/40">
              Try an exercise from the home page to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
