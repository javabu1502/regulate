"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NSStateSelector, { type NSState, getCurrentNSState } from "@/components/NSStateSelector";
import { JournalIcon } from "@/components/Icons";
import { getPrompts } from "@/lib/journal-prompts";

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

type Screen = "list" | "log" | "saved" | "detail";
type Tab = "entries" | "insights";

export default function JournalPage() {
  const [screen, setScreen] = useState<Screen>("list");
  const [tab, setTab] = useState<Tab>("entries");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // Log form state
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState("");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [nsState, setNsState] = useState<NSState | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setNsState(getCurrentNSState());
  }, []);

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
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
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

          {/* Log button */}
          <button
            onClick={() => { resetForm(); setScreen("log"); }}
            className="mb-6 w-full rounded-2xl bg-candle/15 py-4 text-base font-medium text-candle transition-all duration-300 hover:bg-candle/25 active:scale-[0.98]"
          >
            I just had a panic attack
          </button>

          {/* Tabs (show Insights tab when 10+ entries) */}
          {entries.length >= 10 && (
            <div className="mb-5 flex justify-center gap-2">
              <button
                onClick={() => setTab("entries")}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "entries" ? "bg-teal/20 text-teal-soft" : "text-cream-dim hover:text-cream"}`}
              >
                Entries
              </button>
              <button
                onClick={() => setTab("insights")}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "insights" ? "bg-candle/15 text-candle" : "text-cream-dim hover:text-cream"}`}
              >
                Insights
              </button>
            </div>
          )}

          {/* ENTRIES TAB */}
          {tab === "entries" && (
            <>
              {/* Stats */}
              {entries.length > 0 && (
                <div className="mb-6 grid grid-cols-3 gap-2">
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

              {/* Share with therapist */}
              <button
                onClick={shareInsights}
                className="mt-2 w-full rounded-2xl border border-teal/15 bg-deep/60 py-4 text-sm text-cream-dim transition-colors hover:text-cream"
              >
                {copied ? "Copied to clipboard" : "Share summary with your therapist"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── LOG SCREEN ───────────────────────────────────────────────

  if (screen === "log") {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
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
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
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
