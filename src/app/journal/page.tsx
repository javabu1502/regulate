"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import NSStateSelector, { type NSState, getCurrentNSState } from "@/components/NSStateSelector";
import { JournalIcon } from "@/components/Icons";
import { getPrompts, getReflectionPrompt } from "@/lib/journal-prompts";
import PremiumGate from "@/components/PremiumGate";

// ─── Types ──────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  timestamp: number;
  intensity: number;
  duration: string;
  triggers: string[];
  techniques: string[];
  reflection: string;
  nsState?: NSState;
  technique?: string;
  aftercareResponse?: string;
  date?: string;
}

const durationOptions = ["Under 5 min", "5–15 min", "15–30 min", "30+ min"];

const triggerOptions = [
  "Crowded place",
  "Work stress",
  "Health fear",
  "Relationship",
  "Social situation",
  "Unknown",
  "Other",
];

const techniqueOptions = [
  "Breathing",
  "Grounding",
  "Body scan",
  "Bilateral tapping",
  "Swaying",
  "Affirmations",
  "Other",
];

const STORAGE_KEY = "regulate-journal";

function loadEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Helpers ────────────────────────────────────────────────────────

function intensityColor(n: number) {
  if (n <= 3) return "bg-teal/30 text-teal-soft";
  if (n <= 6) return "bg-candle/20 text-candle-soft";
  return "bg-candle/35 text-candle";
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Insights helpers ───────────────────────────────────────────────

function getTimeOfDay(ts: number): string {
  const h = new Date(ts).getHours();
  if (h < 6) return "Night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function computeInsights(entries: JournalEntry[]) {
  if (entries.length < 10) return null;

  // Time of day
  const todCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const tod = getTimeOfDay(e.timestamp);
    todCounts[tod] = (todCounts[tod] || 0) + 1;
  });
  const mostCommonTime = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Top triggers
  const triggerCounts: Record<string, number> = {};
  entries.forEach((e) => e.triggers.forEach((t) => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));
  const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Most helpful technique
  const techCounts: Record<string, number> = {};
  entries.forEach((e) => e.techniques.forEach((t) => { techCounts[t] = (techCounts[t] || 0) + 1; }));
  const topTechnique = Object.entries(techCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Intensity trend (last 10 vs previous 10)
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const recent10 = sorted.slice(0, 10);
  const prev10 = sorted.slice(10, 20);
  const recentAvg = recent10.reduce((s, e) => s + e.intensity, 0) / recent10.length;
  const prevAvg = prev10.length > 0 ? prev10.reduce((s, e) => s + e.intensity, 0) / prev10.length : recentAvg;
  const trend = recentAvg < prevAvg - 0.5 ? "down" : recentAvg > prevAvg + 0.5 ? "up" : "stable";

  // Sparkline data (last 20 entries, oldest first)
  const sparkData = sorted.slice(0, 20).reverse().map((e) => e.intensity);

  // This month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const thisMonthCount = entries.filter((e) => e.timestamp >= thisMonthStart).length;
  const lastMonthCount = entries.filter((e) => e.timestamp >= lastMonthStart && e.timestamp < thisMonthStart).length;

  // Days since last episode
  const lastEpisode = sorted[0]?.timestamp || Date.now();
  const daysSince = Math.floor((Date.now() - lastEpisode) / (1000 * 60 * 60 * 24));

  // Best week (fewest episodes in any 7-day window)
  let bestWeek = Infinity;
  if (entries.length > 0) {
    const timestamps = entries.map((e) => e.timestamp).sort((a, b) => a - b);
    const earliest = timestamps[0];
    const latest = timestamps[timestamps.length - 1];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    for (let start = earliest; start <= latest; start += 24 * 60 * 60 * 1000) {
      const count = timestamps.filter((t) => t >= start && t < start + weekMs).length;
      if (count < bestWeek) bestWeek = count;
    }
  }
  if (bestWeek === Infinity) bestWeek = 0;

  // Correlations
  const correlations: string[] = [];

  // Time-of-day correlation with intensity
  const todIntensity: Record<string, number[]> = {};
  entries.forEach((e) => {
    const tod = getTimeOfDay(e.timestamp);
    if (!todIntensity[tod]) todIntensity[tod] = [];
    todIntensity[tod].push(e.intensity);
  });
  const todAvgs = Object.entries(todIntensity).map(([tod, intensities]) => ({
    tod,
    avg: intensities.reduce((s, v) => s + v, 0) / intensities.length,
    count: intensities.length,
  })).filter(t => t.count >= 3);
  const worstTod = todAvgs.sort((a, b) => b.avg - a.avg)[0];
  if (worstTod && worstTod.avg > 5) {
    correlations.push(`Your ${worstTod.tod.toLowerCase()} episodes tend to be more intense (avg ${worstTod.avg.toFixed(1)}/10)`);
  }

  // Trigger + technique correlation
  const triggerTechSuccess: Record<string, Record<string, number>> = {};
  entries.forEach((e) => {
    if (e.aftercareResponse === "better") {
      e.triggers.forEach((tr) => {
        if (!triggerTechSuccess[tr]) triggerTechSuccess[tr] = {};
        e.techniques.forEach((tech) => {
          triggerTechSuccess[tr][tech] = (triggerTechSuccess[tr][tech] || 0) + 1;
        });
      });
    }
  });
  Object.entries(triggerTechSuccess).forEach(([trigger, techs]) => {
    const best = Object.entries(techs).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) {
      correlations.push(`When triggered by ${trigger.toLowerCase()}, ${best[0].toLowerCase()} tends to help most`);
    }
  });

  // Duration trend
  const recentDurations = sorted.slice(0, 10).map((e) => e.duration).filter(Boolean);
  const longCount = recentDurations.filter((d) => d === "30+ min" || d === "15–30 min").length;
  const shortCount = recentDurations.filter((d) => d === "Under 5 min" || d === "5–15 min").length;
  if (shortCount > longCount + 2) {
    correlations.push("Your episodes are getting shorter — that's real progress");
  }

  return {
    mostCommonTime,
    topTriggers,
    topTechnique,
    trend,
    recentAvg: recentAvg.toFixed(1),
    sparkData,
    thisMonthCount,
    lastMonthCount,
    daysSince,
    bestWeek,
    correlations,
  };
}

// ─── Sparkline SVG ──────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 200;
  const h = 40;
  const maxVal = 10;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - (v / maxVal) * h}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="rgba(90,171,174,0.6)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(90,171,174,0.2)" />
          <stop offset="100%" stopColor="rgba(90,171,174,0)" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill="url(#sparkFill)"
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────

type Screen = "list" | "log" | "quick-log" | "saved" | "detail";
type Tab = "entries" | "insights" | "timeline" | "sessions";

// ─── SOS Session History types ──────────────────────────────────────

interface SOSSession {
  tool: string;
  label: string;
  ts: string;
  helped: boolean;
  partial?: boolean;
}

function loadSOSSessions(): SOSSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("regulate-sos-history") || "[]");
  } catch { return []; }
}

// ─── Timeline helpers ────────────────────────────────────────────────

function getEntryTimestamp(entry: JournalEntry): number {
  if (entry.timestamp) return entry.timestamp;
  if (entry.date) return new Date(entry.date).getTime();
  return 0;
}

function groupByDate(allEntries: JournalEntry[]): Record<string, JournalEntry[]> {
  const groups: Record<string, JournalEntry[]> = {};
  allEntries.forEach((e) => {
    const ts = getEntryTimestamp(e);
    if (ts === 0) return;
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(e);
  });
  return groups;
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-midnight" />}>
      <JournalPageInner />
    </Suspense>
  );
}

function JournalPageInner() {
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>("list");
  const [tab, setTab] = useState<Tab>("entries");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [patternDismissed, setPatternDismissed] = useState(false);
  const [sosSessions, setSOSSessions] = useState<SOSSession[]>([]);

  // Log form state
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState("");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [nsState, setNsState] = useState<NSState | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);

  // Reflective prompt state
  const [reflectionPrompt, setReflectionPrompt] = useState<string | null>(null);
  const [reflectionDismissed, setReflectionDismissed] = useState(false);

  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded);
    setNsState(getCurrentNSState());
    setSOSSessions(loadSOSSessions());

    // Show reflection prompt if 10+ entries
    if (loaded.length >= 10) {
      const prompt = getReflectionPrompt();
      setReflectionPrompt(prompt);
    }

    // If arrived via ?reflect=1, show the prompt immediately
    if (searchParams.get("reflect") === "1" && loaded.length >= 10) {
      // Prompt is already set above
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReflect() {
    if (!reflectionPrompt) return;
    setReflectionDismissed(true);
    resetForm();
    setReflection(reflectionPrompt);
    setScreen("log");
  }

  // ─── Pattern detection ──────────────────────────────────────
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCrisisCount = entries.filter((e) => {
    if (e.timestamp < sevenDaysAgo) return false;
    const tech = (e.technique || "").toLowerCase();
    const techniques = e.techniques?.map((t) => t.toLowerCase()) || [];
    return (
      tech.includes("sos") ||
      tech.includes("panic") ||
      techniques.some((t) => t.includes("sos") || t.includes("panic"))
    );
  }).length;
  const showPatternAlert = recentCrisisCount >= 5 && !patternDismissed;

  function resetForm() {
    setIntensity(5);
    setDuration("");
    setTriggers([]);
    setTechniques([]);
    setReflection("");
    setNsState(getCurrentNSState());
  }

  function toggleArray(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function saveEntry() {
    const entry: JournalEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      intensity,
      duration,
      triggers,
      techniques,
      reflection,
      nsState: nsState ?? undefined,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    setScreen("saved");
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    setDetailEntry(null);
    setScreen("list");
  }

  // ─── Stats ────────────────────────────────────────────────────

  const avgIntensity = entries.length
    ? (entries.reduce((s, e) => s + e.intensity, 0) / entries.length).toFixed(1)
    : "—";

  const techniqueCounts: Record<string, number> = {};
  entries.forEach((e) => e.techniques.forEach((t) => { techniqueCounts[t] = (techniqueCounts[t] || 0) + 1; }));
  const topTechnique = Object.entries(techniqueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const insights = computeInsights(entries);

  // ─── Share with therapist ─────────────────────────────────────

  function shareInsights() {
    if (!insights) return;
    const text = [
      "Regulate — Panic Tracker Summary",
      "",
      `Total episodes logged: ${entries.length}`,
      `Average intensity: ${insights.recentAvg}/10 (trend: ${insights.trend})`,
      `Most common time: ${insights.mostCommonTime}`,
      `Top triggers: ${insights.topTriggers.map(([t, c]) => `${t} (${c})`).join(", ")}`,
      `Most helpful technique: ${insights.topTechnique}`,
      `This month: ${insights.thisMonthCount} episodes`,
      `Last month: ${insights.lastMonthCount} episodes`,
      `Days since last episode: ${insights.daysSince}`,
      `Best week: ${insights.bestWeek} episodes`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadTherapistSummary() {
    if (entries.length === 0) return;

    const dlSorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const earliest = new Date(dlSorted[0].timestamp);
    const latest = new Date(dlSorted[dlSorted.length - 1].timestamp);
    const dateRangeStr = `${earliest.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} \u2013 ${latest.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const dlTriggerCounts: Record<string, number> = {};
    entries.forEach((e) => e.triggers.forEach((t) => { dlTriggerCounts[t] = (dlTriggerCounts[t] || 0) + 1; }));
    const dlTopTriggers = Object.entries(dlTriggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const techStats: Record<string, { total: number; better: number }> = {};
    entries.forEach((e) => {
      e.techniques.forEach((t) => {
        if (!techStats[t]) techStats[t] = { total: 0, better: 0 };
        techStats[t].total++;
        if (e.aftercareResponse === "better") techStats[t].better++;
      });
      if (e.technique) {
        if (!techStats[e.technique]) techStats[e.technique] = { total: 0, better: 0 };
        techStats[e.technique].total++;
        if (e.aftercareResponse === "better") techStats[e.technique].better++;
      }
    });
    const dlTopTechniques = Object.entries(techStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        successRate: stats.total > 0 ? Math.round((stats.better / stats.total) * 100) : 0,
      }));

    const stateCounts: Record<string, number> = {};
    const stateLabels: Record<string, string> = {
      hyperactivated: "Panicking / hyperactivated",
      activated: "Anxious / activated",
      hypoactivated: "Shutdown / hypoactivated",
    };
    entries.forEach((e) => {
      if (e.nsState) {
        const label = stateLabels[e.nsState] || e.nsState;
        stateCounts[label] = (stateCounts[label] || 0) + 1;
      }
    });
    const stateDistribution = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

    const recentSorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const recent10 = recentSorted.slice(0, 10);
    const prev10 = recentSorted.slice(10, 20);
    const dlRecentAvg = recent10.reduce((s, e) => s + e.intensity, 0) / recent10.length;
    const dlPrevAvg = prev10.length > 0 ? prev10.reduce((s, e) => s + e.intensity, 0) / prev10.length : dlRecentAvg;
    const intensityTrend = dlRecentAvg < dlPrevAvg - 0.5 ? "Improving" : dlRecentAvg > dlPrevAvg + 0.5 ? "Worsening" : "Stable";

    const dayOfWeekCounts: Record<string, number> = {};
    const todCounts: Record<string, number> = {};
    entries.forEach((e) => {
      const d = new Date(e.timestamp);
      const isWeekday = d.getDay() >= 1 && d.getDay() <= 5;
      const dayType = isWeekday ? "Weekday" : "Weekend";
      dayOfWeekCounts[dayType] = (dayOfWeekCounts[dayType] || 0) + 1;
      const h = d.getHours();
      const tod = h < 6 ? "nights" : h < 12 ? "mornings" : h < 18 ? "afternoons" : "evenings";
      todCounts[tod] = (todCounts[tod] || 0) + 1;
    });
    const mostCommonDayType = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Weekday";
    const mostCommonTod = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "evenings";
    const frequencyPattern = `Most sessions on ${mostCommonDayType.toLowerCase()} ${mostCommonTod}`;

    const lines = [
      `Regulate \u2014 Practice Summary for ${dateRangeStr}`,
      "This summary contains patterns from your regulation practice. No personal journal entries are included.",
      "",
      "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
      "",
      `Date range: ${dateRangeStr}`,
      `Total sessions: ${entries.length}`,
      "",
      "\u2500\u2500 Most Common Triggers (Top 3) \u2500\u2500",
      ...(dlTopTriggers.length > 0
        ? dlTopTriggers.map(([t, c], i) => `  ${i + 1}. ${t} (${c} occurrences)`)
        : ["  No trigger data recorded"]),
      "",
      "\u2500\u2500 Most Effective Techniques (Top 3) \u2500\u2500",
      ...(dlTopTechniques.length > 0
        ? dlTopTechniques.map((t, i) => `  ${i + 1}. ${t.name} \u2014 used ${t.total} times, ${t.successRate}% felt better after`)
        : ["  No technique data recorded"]),
      "",
      "\u2500\u2500 Nervous System State Distribution \u2500\u2500",
      ...(stateDistribution.length > 0
        ? stateDistribution.map(([state, count]) => `  ${state}: ${count} sessions (${Math.round((count / entries.length) * 100)}%)`)
        : ["  No state data recorded"]),
      "",
      "\u2500\u2500 Average Intensity Trend \u2500\u2500",
      `  Recent average: ${dlRecentAvg.toFixed(1)}/10`,
      ...(prev10.length > 0 ? [`  Previous average: ${dlPrevAvg.toFixed(1)}/10`] : []),
      `  Trend: ${intensityTrend}`,
      "",
      "\u2500\u2500 Frequency Pattern \u2500\u2500",
      `  ${frequencyPattern}`,
      "",
      "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
      "",
      "Generated by Regulate \u2014 Nervous System Support",
    ];

    const dlText = lines.join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([dlText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regulate-summary-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Back button ──────────────────────────────────────────────

  function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
      <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {label}
      </button>
    );
  }

  // ─── LIST SCREEN ──────────────────────────────────────────────

  if (screen === "list") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>

          <header className="mb-6 mt-6 text-center">
            <div className="mb-3 flex justify-center"><JournalIcon className="h-8 w-8 text-candle-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Journal</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Track episodes. Notice patterns. Witness your healing.
            </p>
          </header>

          {/* Pattern detection alert */}
          {showPatternAlert && (
            <div className="mb-6 border border-candle/20 bg-candle/5 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-cream">We&apos;ve noticed something</p>
                  <p className="mt-1 text-xs text-cream-dim">
                    You&apos;ve had several difficult moments recently. Talking to a professional can make a real difference. You&apos;re not alone in this.
                  </p>
                  <Link href="/crisis" className="mt-2 inline-block text-xs text-teal-soft">
                    Find support
                  </Link>
                </div>
                <button
                  onClick={() => setPatternDismissed(true)}
                  className="ml-3 shrink-0 text-cream-dim/50 hover:text-cream-dim"
                  aria-label="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Reflective prompt card */}
          {reflectionPrompt && !reflectionDismissed && entries.length >= 10 && (
            <div className="mb-6 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-purple-300/60">Reflection</p>
                  <p className="mt-2 text-sm leading-relaxed text-cream">
                    &ldquo;{reflectionPrompt}&rdquo;
                  </p>
                </div>
                <button
                  onClick={() => setReflectionDismissed(true)}
                  className="ml-3 shrink-0 p-1 text-cream-dim/30 hover:text-cream-dim/60"
                  aria-label="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleReflect}
                  className="flex-1 rounded-xl bg-purple-400/15 py-2.5 text-sm text-purple-200 transition-colors hover:bg-purple-400/25"
                >
                  Reflect on this
                </button>
                <button
                  onClick={() => setReflectionDismissed(true)}
                  className="text-xs text-cream-dim/30 hover:text-cream-dim/50"
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          {/* Log button */}
          <button
            onClick={() => { resetForm(); setScreen("log"); }}
            className="mb-6 w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all duration-300 hover:bg-candle/25 active:scale-[0.98]"
          >
            I just had a panic attack
          </button>

          <button
            onClick={() => setScreen("quick-log")}
            className="mb-6 -mt-4 w-full rounded-2xl border border-slate-blue/25 bg-deep/50 py-3.5 text-sm text-cream-dim transition-all hover:border-teal/20 active:scale-[0.98]"
          >
            Quick log
          </button>

          {/* Tabs */}
          {(entries.length > 0 || sosSessions.length > 0) && (
            <div className="mb-5 flex justify-center gap-2">
              <button
                onClick={() => setTab("entries")}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "entries" ? "bg-teal/20 text-teal-soft" : "text-cream-dim hover:text-cream"}`}
              >
                Entries
              </button>
              <button
                onClick={() => setTab("sessions")}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "sessions" ? "bg-teal/20 text-teal-soft" : "text-cream-dim hover:text-cream"}`}
              >
                Sessions
              </button>
              <button
                onClick={() => setTab("timeline")}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "timeline" ? "bg-teal/20 text-teal-soft" : "text-cream-dim hover:text-cream"}`}
              >
                Timeline
              </button>
              {entries.length >= 10 && (
                <button
                  onClick={() => setTab("insights")}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "insights" ? "bg-candle/15 text-candle" : "text-cream-dim hover:text-cream"}`}
                >
                  Insights
                </button>
              )}
            </div>
          )}

          {/* ENTRIES TAB */}
          {tab === "entries" && (
            <>
              {/* Stats */}
              {entries.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                      <p className="text-lg font-medium text-cream">{entries.length}</p>
                      <p className="text-xs text-cream-dim/60">Logged</p>
                    </div>
                    <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                      <p className="text-lg font-medium text-cream">{avgIntensity}</p>
                      <p className="text-xs text-cream-dim/60">Avg intensity</p>
                    </div>
                    <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                      <p className="truncate text-sm font-medium text-cream">{topTechnique}</p>
                      <p className="text-xs text-cream-dim/60">Most helpful</p>
                    </div>
                  </div>
                  <PremiumGate feature="Export a summary of your patterns to share with your therapist or counselor.">
                    <button
                      onClick={downloadTherapistSummary}
                      className="w-full rounded-xl border border-teal/15 py-2.5 text-xs text-teal-soft transition-colors hover:border-teal/30 flex items-center justify-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <path d="M8 2v8M8 10L5 7M8 10l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Share with therapist
                    </button>
                  </PremiumGate>
                </div>
              )}

              {/* Entries list */}
              {entries.length === 0 ? (
                <div className="mt-8 text-center">
                  <p className="text-sm text-cream-dim/60">No entries yet.</p>
                  <p className="mt-1 text-xs text-cream-dim/40">Your history will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => { setDetailEntry(entry); setScreen("detail"); }}
                      className="w-full rounded-xl border border-teal/10 bg-deep/40 p-4 text-left transition-colors hover:border-teal/25"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${intensityColor(entry.intensity)}`}>
                            {entry.intensity}/10
                          </span>
                          <span className="text-xs text-cream-dim/50">{entry.duration}</span>
                        </div>
                        <span className="text-xs text-cream-dim/40">{formatDate(entry.timestamp)}</span>
                      </div>
                      {entry.triggers.length > 0 && (
                        <p className="mt-1.5 truncate text-xs text-cream-dim/60">
                          {entry.triggers.join(", ")}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SESSIONS TAB */}
          {tab === "sessions" && (
            <PremiumGate feature="Review your SOS session history to see what helped and track your progress over time.">
              {sosSessions.length === 0 ? (
                <div className="mt-8 text-center">
                  <p className="text-sm text-cream-dim/60">No SOS sessions yet.</p>
                  <p className="mt-1 text-xs text-cream-dim/40">When you use an SOS tool, it will show up here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...sosSessions].reverse().map((session, i) => {
                    const date = new Date(session.ts);
                    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                    return (
                      <div
                        key={`${session.ts}-${i}`}
                        className="w-full rounded-xl border border-teal/10 bg-deep/40 p-4 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 shrink-0 rounded-full ${session.helped ? "bg-teal-soft" : session.partial ? "bg-cream-dim/30" : "bg-candle"}`} />
                            <span className="text-sm font-medium text-cream">{session.label}</span>
                          </div>
                          <span className="text-xs text-cream-dim/40">{dateStr}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 pl-4">
                          <span className="text-xs text-cream-dim/50">{timeStr}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            session.helped ? "bg-teal/15 text-teal-soft" : session.partial ? "bg-slate-blue/20 text-cream-dim/50" : "bg-candle/10 text-candle-soft"
                          }`}>
                            {session.helped ? "Helped" : session.partial ? "Exited early" : "Didn\u2019t help"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PremiumGate>
          )}

          {/* TIMELINE TAB */}
          {tab === "timeline" && (() => {
            const sorted = [...entries].sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a));
            const grouped = groupByDate(sorted);
            const dateKeys = Object.keys(grouped).sort().reverse();

            const totalSessions = entries.length;
            const aftercareResponses = entries.filter((e) => e.aftercareResponse);
            const betterCount = aftercareResponses.filter((e) => e.aftercareResponse === "better").length;
            const betterPct = aftercareResponses.length > 0 ? Math.round((betterCount / aftercareResponses.length) * 100) : 0;

            const tlTechniqueCounts: Record<string, number> = {};
            entries.forEach((e) => {
              if (e.technique) tlTechniqueCounts[e.technique] = (tlTechniqueCounts[e.technique] || 0) + 1;
              if (e.techniques) e.techniques.forEach((t) => { tlTechniqueCounts[t] = (tlTechniqueCounts[t] || 0) + 1; });
            });
            const tlTopTechnique = Object.entries(tlTechniqueCounts).sort((a, b) => b[1] - a[1])[0];

            return (
              <>
                {/* Pattern summary */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                    <p className="text-lg font-medium text-cream">{totalSessions}</p>
                    <p className="text-xs text-cream-dim/60">Sessions</p>
                  </div>
                  <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                    <p className="text-lg font-medium text-cream">{betterPct}%</p>
                    <p className="text-xs text-cream-dim/60">Felt better</p>
                  </div>
                  <div className="rounded-xl border border-teal/15 bg-deep/60 p-3 text-center">
                    <p className="truncate text-sm font-medium text-cream">{tlTopTechnique ? tlTopTechnique[0] : "\u2014"}</p>
                    <p className="text-xs text-cream-dim/60">Most used</p>
                  </div>
                </div>

                {/* Grouped timeline */}
                <div className="flex flex-col gap-4">
                  {dateKeys.map((dateKey) => (
                    <div key={dateKey}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cream-dim/40">
                        {formatDate(new Date(dateKey).getTime() + 86400000)}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {grouped[dateKey].map((entry, i) => {
                          const ts = getEntryTimestamp(entry);
                          const technique = entry.technique || (entry.techniques ? entry.techniques.join(", ") : "Session");
                          const response = entry.aftercareResponse;
                          return (
                            <div
                              key={`${dateKey}-${i}`}
                              className="flex items-center gap-3 rounded-xl border border-teal/10 bg-deep/40 px-4 py-3"
                            >
                              <div className={`h-2 w-2 shrink-0 rounded-full ${
                                response === "better" ? "bg-teal-soft" :
                                response === "harder" ? "bg-candle" :
                                response === "same" ? "bg-slate-blue" :
                                "bg-cream-dim/30"
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-cream">{technique}</p>
                                {entry.intensity && (
                                  <p className="text-xs text-cream-dim/40">Intensity: {entry.intensity}/10</p>
                                )}
                              </div>
                              <span className="shrink-0 text-xs text-cream-dim/30">{formatTime(ts)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* INSIGHTS TAB */}
          {tab === "insights" && insights && (
            <div className="flex flex-col gap-3">
              {/* Calm streak */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15">
                    <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.5H17.5L13.5 11L15 17L10 13.5L5 17L6.5 11L2.5 7.5H7.5L10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-cream">{insights.daysSince} calm day{insights.daysSince !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-cream-dim/60">Since your last episode</p>
                  </div>
                </div>
              </div>

              {/* Intensity trend */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-cream">Intensity trend</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    insights.trend === "down" ? "bg-teal/20 text-teal-soft" :
                    insights.trend === "up" ? "bg-candle/20 text-candle" :
                    "bg-slate-blue/40 text-cream-dim"
                  }`}>
                    {insights.trend === "down" ? "Improving" : insights.trend === "up" ? "Increasing" : "Stable"}
                  </span>
                </div>
                <p className="mb-3 text-xs text-cream-dim/50">Average: {insights.recentAvg}/10</p>
                <Sparkline data={insights.sparkData} />
              </div>

              {/* Most common time */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-candle/10">
                    <svg className="h-5 w-5 text-candle-soft" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" /><path d="M10 5V10L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cream">Most common time</p>
                    <p className="text-xs text-cream-dim/60">{insights.mostCommonTime}</p>
                  </div>
                </div>
              </div>

              {/* Top triggers */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <h3 className="mb-3 text-sm font-medium text-cream">Top triggers</h3>
                <div className="space-y-2">
                  {insights.topTriggers.map(([trigger, count]) => (
                    <div key={trigger} className="flex items-center justify-between">
                      <span className="text-sm text-cream-dim">{trigger}</span>
                      <span className="rounded-full bg-candle/10 px-2 py-0.5 text-xs text-candle-soft">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most helpful */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15">
                    <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 20 20" fill="none"><path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" stroke="currentColor" strokeWidth="1.2" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cream">Most helpful technique</p>
                    <p className="text-xs text-cream-dim/60">{insights.topTechnique}</p>
                  </div>
                </div>
              </div>

              {/* Monthly comparison */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <h3 className="mb-3 text-sm font-medium text-cream">Monthly comparison</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-blue/30 p-3 text-center">
                    <p className="text-lg font-medium text-cream">{insights.thisMonthCount}</p>
                    <p className="text-xs text-cream-dim/50">This month</p>
                  </div>
                  <div className="rounded-xl bg-slate-blue/30 p-3 text-center">
                    <p className="text-lg font-medium text-cream">{insights.lastMonthCount}</p>
                    <p className="text-xs text-cream-dim/50">Last month</p>
                  </div>
                </div>
              </div>

              {/* Best week */}
              <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/15">
                    <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 20 20" fill="none"><path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cream">Best week</p>
                    <p className="text-xs text-cream-dim/60">{insights.bestWeek} episode{insights.bestWeek !== 1 ? "s" : ""} in your calmest week</p>
                  </div>
                </div>
              </div>

              {/* Correlations */}
              {insights.correlations && insights.correlations.length > 0 && (
                <PremiumGate feature="Personal pattern insights — correlations between your triggers, timing, and what helps most.">
                  <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                    <h3 className="mb-3 text-sm font-medium text-cream">Patterns we noticed</h3>
                    <div className="space-y-2.5">
                      {insights.correlations.map((c: string, i: number) => (
                        <p key={i} className="text-sm leading-relaxed text-cream-dim">
                          {c}
                        </p>
                      ))}
                    </div>
                  </div>
                </PremiumGate>
              )}

              {/* Share with therapist */}
              <PremiumGate feature="Export a summary of your patterns to share with your therapist or counselor.">
                <button
                  onClick={downloadTherapistSummary}
                  className="mt-2 w-full rounded-2xl border border-teal/15 bg-deep/60 py-4 text-sm text-teal-soft transition-colors hover:border-teal/30 flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M8 2v8M8 10L5 7M8 10l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download summary for therapist
                </button>
                <button
                  onClick={shareInsights}
                  className="w-full rounded-2xl border border-slate-blue/20 bg-deep/40 py-3 text-xs text-cream-dim/60 transition-colors hover:text-cream-dim"
                >
                  {copied ? "Copied to clipboard" : "Or copy summary to clipboard"}
                </button>
              </PremiumGate>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── QUICK-LOG SCREEN ────────────────────────────────────────

  if (screen === "quick-log") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={() => setScreen("list")} label="Journal" />

          <header className="mb-8 mt-6 text-center">
            <h1 className="text-lg font-medium text-cream">Quick check-in</h1>
            <p className="mt-1 text-sm text-cream-dim">Just the basics.</p>
          </header>

          {/* Intensity */}
          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
            <p className="mb-3 text-sm text-cream-dim">How intense was it?</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="h-2 flex-1 appearance-none rounded-full bg-slate-blue/50 outline-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0"
                style={{
                  background: `linear-gradient(to right, #2a6b6e ${(intensity - 1) * 11.1}%, #1a2a4a ${(intensity - 1) * 11.1}%)`,
                }}
              />
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${intensityColor(intensity)}`}>
                {intensity}
              </span>
            </div>
          </div>

          {/* How do you feel now */}
          <div className="mt-4 flex flex-col gap-2">
            {[
              { label: "Lighter", value: "better", cls: "border-teal/20 bg-teal/8 text-teal-soft hover:border-teal/35" },
              { label: "About the same", value: "same", cls: "border-slate-blue/25 bg-deep/50 text-cream-dim hover:border-candle/20" },
              { label: "Heavier", value: "harder", cls: "border-candle/15 bg-candle/5 text-candle-soft hover:border-candle/25" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  const entry: JournalEntry = {
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    timestamp: Date.now(),
                    intensity,
                    duration: "",
                    triggers: [],
                    techniques: [],
                    reflection: "",
                    aftercareResponse: opt.value,
                  };
                  const updated = [entry, ...entries];
                  setEntries(updated);
                  saveEntries(updated);
                  setScreen("saved");
                }}
                className={`w-full rounded-2xl border px-5 py-4 text-left text-base font-medium transition-all active:scale-[0.98] ${opt.cls}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOG SCREEN ───────────────────────────────────────────────

  if (screen === "log") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={() => setScreen("list")} label="Journal" />

          <header className="mb-6 mt-6 text-center">
            <h1 className="text-lg font-medium text-cream">Log this episode</h1>
            <p className="mt-1 text-sm text-cream-dim">You made it through. Let&apos;s capture what happened.</p>
          </header>

          <div className="flex flex-col gap-5">
            {/* Nervous system state */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">Nervous system state</p>
              <NSStateSelector compact onSelect={(s) => setNsState(s)} />
            </div>

            {/* Intensity */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">Intensity</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="h-2 flex-1 appearance-none rounded-full bg-slate-blue/50 outline-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0"
                  style={{
                    background: `linear-gradient(to right, #2a6b6e ${(intensity - 1) * 11.1}%, #1a2a4a ${(intensity - 1) * 11.1}%)`,
                  }}
                />
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${intensityColor(intensity)}`}>
                  {intensity}
                </span>
              </div>
            </div>

            {/* Duration */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">How long did it last?</p>
              <div className="grid grid-cols-2 gap-2">
                {durationOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-xl border py-3 text-sm transition-all ${
                      duration === d
                        ? "border-teal/50 bg-teal/15 text-teal-soft"
                        : "border-slate-blue/40 bg-slate-blue/20 text-cream-dim hover:border-teal/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Triggers */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">What triggered it?</p>
              <div className="flex flex-wrap gap-2">
                {triggerOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTriggers(toggleArray(triggers, t))}
                    className={`rounded-full px-3.5 py-2 text-sm transition-all ${
                      triggers.includes(t)
                        ? "bg-candle/20 text-candle-soft"
                        : "bg-slate-blue/30 text-cream-dim hover:bg-slate-blue/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Techniques */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">What helped?</p>
              <div className="flex flex-wrap gap-2">
                {techniqueOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTechniques(toggleArray(techniques, t))}
                    className={`rounded-full px-3.5 py-2 text-sm transition-all ${
                      techniques.includes(t)
                        ? "bg-teal/20 text-teal-soft"
                        : "bg-slate-blue/30 text-cream-dim hover:bg-slate-blue/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <p className="mb-3 text-sm text-cream-dim">Anything else? (optional)</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How are you feeling now..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <p className="mt-2 text-xs text-cream-dim/40">Private to you — stored only on this device</p>
            </div>

            {/* Journaling prompts */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <button onClick={() => setShowPrompts(!showPrompts)} className="flex w-full items-center justify-between">
                <span className="text-sm text-cream-dim">Journaling prompts</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform duration-200 ${showPrompts ? "rotate-180" : ""}`}
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cream-dim" />
                </svg>
              </button>
              {showPrompts && (
                <div className="mt-3 flex flex-col gap-2">
                  {getPrompts(triggers, techniques).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setReflection((prev) => prev ? prev + "\n\n" + prompt : prompt)}
                      className="rounded-xl border border-teal/10 bg-deep/40 p-3 text-left text-xs text-cream-dim/60 transition-colors hover:border-teal/25 hover:text-cream-dim"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={saveEntry}
              className="w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all duration-300 hover:bg-teal/30 active:scale-[0.98]"
            >
              Save entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SAVED CONFIRMATION ───────────────────────────────────────

  if (screen === "saved") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <div className="text-center">
          <div className="animate-pulse-soft mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <div className="h-12 w-12 rounded-full bg-teal/15" />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-cream">Logged.</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            You made it through.<br />That takes strength.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <button onClick={() => setScreen("list")} className="rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft hover:bg-teal/25">
              View journal
            </button>
            <Link href="/" className="text-sm text-cream-dim/50 transition-colors hover:text-cream-dim">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── DETAIL SCREEN ────────────────────────────────────────────

  if (screen === "detail" && detailEntry) {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <BackButton onClick={() => setScreen("list")} label="Journal" />

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-cream">{formatDate(detailEntry.timestamp)}</p>
                <p className="text-xs text-cream-dim/50">{formatTime(detailEntry.timestamp)}</p>
              </div>
              <span className={`rounded-lg px-3 py-1 text-sm font-medium ${intensityColor(detailEntry.intensity)}`}>
                {detailEntry.intensity}/10
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {detailEntry.nsState && (
                <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
                  <p className="mb-1 text-xs text-cream-dim/50">Nervous system state</p>
                  <p className="text-sm text-cream capitalize">{detailEntry.nsState === "window" ? "Window of Tolerance" : detailEntry.nsState}</p>
                </div>
              )}

              {detailEntry.duration && (
                <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
                  <p className="mb-1 text-xs text-cream-dim/50">Duration</p>
                  <p className="text-sm text-cream">{detailEntry.duration}</p>
                </div>
              )}

              {detailEntry.triggers.length > 0 && (
                <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
                  <p className="mb-2 text-xs text-cream-dim/50">Triggers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailEntry.triggers.map((t) => (
                      <span key={t} className="rounded-full bg-candle/15 px-2.5 py-1 text-xs text-candle-soft">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {detailEntry.techniques.length > 0 && (
                <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
                  <p className="mb-2 text-xs text-cream-dim/50">What helped</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailEntry.techniques.map((t) => (
                      <span key={t} className="rounded-full bg-teal/15 px-2.5 py-1 text-xs text-teal-soft">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {detailEntry.reflection && (
                <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
                  <p className="mb-1 text-xs text-cream-dim/50">Reflection</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-dim">{detailEntry.reflection}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => deleteEntry(detailEntry.id)}
              className="mt-6 w-full text-center text-xs text-cream-dim/30 transition-colors hover:text-cream-dim/60"
            >
              Delete this entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
