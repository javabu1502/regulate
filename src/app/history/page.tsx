"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SessionRecord {
  id?: string;
  timestamp?: number;
  date?: string;
  type?: string;
  technique?: string;
  techniques?: string[];
  aftercareResponse?: string;
  intensity?: number;
  reflection?: string;
  triggers?: string[];
  nsState?: string;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getTimestamp(entry: SessionRecord): number {
  if (entry.timestamp) return entry.timestamp;
  if (entry.date) return new Date(entry.date).getTime();
  return 0;
}

function groupByDate(entries: SessionRecord[]): Record<string, SessionRecord[]> {
  const groups: Record<string, SessionRecord[]> = {};
  entries.forEach((e) => {
    const ts = getTimestamp(e);
    if (ts === 0) return;
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(e);
  });
  return groups;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<SessionRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("regulate-journal");
      if (raw) {
        const data: SessionRecord[] = JSON.parse(raw);
        // Sort newest first
        data.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setEntries(data);
      }
    } catch { /* */ }
  }, []);

  const grouped = groupByDate(entries);
  const dateKeys = Object.keys(grouped).sort().reverse();

  // Pattern detection
  const totalSessions = entries.length;
  const aftercareResponses = entries.filter((e) => e.aftercareResponse);
  const betterCount = aftercareResponses.filter((e) => e.aftercareResponse === "better").length;
  const betterPct = aftercareResponses.length > 0 ? Math.round((betterCount / aftercareResponses.length) * 100) : 0;

  const techniqueCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.technique) techniqueCounts[e.technique] = (techniqueCounts[e.technique] || 0) + 1;
    if (e.techniques) e.techniques.forEach((t) => { techniqueCounts[t] = (techniqueCounts[t] || 0) + 1; });
  });
  const topTechnique = Object.entries(techniqueCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">History</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            Your practice over time.
          </p>
        </header>

        {totalSessions === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-cream-dim/60">No sessions yet.</p>
            <p className="mt-1 text-xs text-cream-dim/40">Complete a module to see your history here.</p>
          </div>
        ) : (
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
                <p className="truncate text-sm font-medium text-cream">{topTechnique ? topTechnique[0] : "—"}</p>
                <p className="text-xs text-cream-dim/60">Most used</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex flex-col gap-4">
              {dateKeys.map((dateKey) => (
                <div key={dateKey}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cream-dim/40">
                    {formatDate(new Date(dateKey).getTime() + 86400000)}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {grouped[dateKey].map((entry, i) => {
                      const ts = getTimestamp(entry);
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
        )}
      </div>
    </div>
  );
}
