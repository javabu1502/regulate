"use client";

import { useState } from "react";

interface JournalEntry {
  id?: string;
  date?: string;
  timestamp?: number;
  type?: string;
  technique?: string;
  aftercareResponse?: string;
  triggers?: string[];
  techniques?: string[];
}

/**
 * Generate a plain-text therapist-friendly summary from journal data.
 */
function generateSummary(): string {
  let entries: JournalEntry[] = [];
  try {
    const raw = localStorage.getItem("regulate-journal");
    if (!raw) return "";
    entries = JSON.parse(raw);
  } catch {
    return "";
  }

  if (entries.length === 0) return "";

  // Determine date range
  const dates = entries
    .map((e) => {
      if (e.date) return new Date(e.date).getTime();
      if (e.timestamp) return e.timestamp;
      return 0;
    })
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  const earliest = dates.length > 0 ? new Date(dates[0]) : new Date();
  const latest = dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const dateRange = `${fmt(earliest)} - ${fmt(latest)}`;

  // Count aftercare entries
  const aftercareEntries = entries.filter((e) => e.type === "aftercare");
  const totalSessions = aftercareEntries.length;

  // Technique counts
  const techniqueCounts: Record<string, number> = {};
  for (const e of aftercareEntries) {
    if (e.technique) {
      techniqueCounts[e.technique] = (techniqueCounts[e.technique] || 0) + 1;
    }
  }
  const techniqueList = Object.entries(techniqueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count}x)`)
    .join(", ");

  // Aftercare response counts
  const better = aftercareEntries.filter((e) => e.aftercareResponse === "better").length;
  const same = aftercareEntries.filter((e) => e.aftercareResponse === "same").length;
  const harder = aftercareEntries.filter((e) => e.aftercareResponse === "harder").length;

  const betterPct = totalSessions > 0 ? Math.round((better / totalSessions) * 100) : 0;

  // Most effective technique
  const techniqueOutcomes: Record<string, { better: number; total: number }> = {};
  for (const e of aftercareEntries) {
    if (e.technique) {
      if (!techniqueOutcomes[e.technique]) {
        techniqueOutcomes[e.technique] = { better: 0, total: 0 };
      }
      techniqueOutcomes[e.technique].total++;
      if (e.aftercareResponse === "better") {
        techniqueOutcomes[e.technique].better++;
      }
    }
  }

  let mostEffective = "Not enough data";
  const effectiveEntries = Object.entries(techniqueOutcomes)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].better / b[1].total - a[1].better / a[1].total);

  if (effectiveEntries.length > 0) {
    const [name, stats] = effectiveEntries[0];
    mostEffective = `${name} (helped ${stats.better}/${stats.total} times)`;
  }

  // Common triggers (from full journal entries, not just aftercare)
  const triggerCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.triggers) {
      for (const t of e.triggers) {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      }
    }
  }
  const triggerList = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .join(", ");

  const lines = [
    `Regulate -- Session Summary for ${dateRange}`,
    "",
    `Sessions: ${totalSessions} total`,
    `Techniques used: ${techniqueList || "None recorded"}`,
    `Felt better: ${better} times (${betterPct}%)`,
    `Felt same: ${same} times`,
    `Felt harder: ${harder} times`,
    "",
    `Most effective: ${mostEffective}`,
    `Common triggers: ${triggerList || "None recorded"}`,
    "",
    "Generated from Regulate app (regulate-liart.vercel.app)",
  ];

  return lines.join("\n");
}

export default function TherapistSummary() {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "empty">("idle");

  async function handleShare() {
    const summary = generateSummary();

    if (!summary) {
      setStatus("empty");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    // Try native share
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: summary });
        setStatus("shared");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      } catch {
        // User cancelled or share failed -- fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(summary);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // Last resort: execCommand fallback
      const textarea = document.createElement("textarea");
      textarea.value = summary;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30"
    >
      <h3 className="text-sm font-medium text-cream">
        {status === "copied"
          ? "Copied to clipboard!"
          : status === "shared"
            ? "Shared!"
            : status === "empty"
              ? "No sessions recorded yet"
              : "Share summary with therapist"}
      </h3>
      <p className="mt-1 text-xs text-cream-dim/60">
        Generate a text summary of your practice - no personal data shared.
      </p>
    </button>
  );
}
