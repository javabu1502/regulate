"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const reasonOptions = [
  "Panic attacks",
  "General anxiety",
  "Stress & overwhelm",
  "Burnout / Shutdown",
  "Supporting someone else",
  "Just exploring",
];

const helpedOptions = [
  "Deep breathing",
  "Grounding / being present",
  "Moving my body",
  "Affirmations",
  "Journaling",
  "Nothing has worked yet",
  "I'm not sure",
];

const triggerOptions = [
  "Crowded or public places",
  "Work or school stress",
  "Health worries",
  "Relationship stress",
  "Being alone",
  "Uncertainty / the future",
  "I don't know yet",
];

interface OnboardingData {
  reasons: string[];
  helped: string[];
  triggers: string[];
}

export default function PreferencesPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [editing, setEditing] = useState<"reasons" | "helped" | "triggers" | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_data");
      if (raw) setData(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  function startEdit(section: "reasons" | "helped" | "triggers") {
    setEditing(section);
    setEditValues(data?.[section] || []);
  }

  function toggle(item: string) {
    setEditValues((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function saveEdit() {
    if (!editing || !data) return;
    const updated = { ...data, [editing]: editValues };
    setData(updated);
    localStorage.setItem("onboarding_data", JSON.stringify(updated));
    setEditing(null);
  }

  function getOptionsForSection(section: string): string[] {
    switch (section) {
      case "reasons": return reasonOptions;
      case "helped": return helpedOptions;
      case "triggers": return triggerOptions;
      default: return [];
    }
  }

  const sectionLabels: Record<string, string> = {
    reasons: "What you're navigating",
    helped: "What has helped",
    triggers: "What activates your nervous system",
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Settings
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">Your Preferences</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            Review and update what you shared during onboarding.
          </p>
        </header>

        {!data ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-cream-dim/60">No onboarding data found.</p>
            <Link href="/onboarding" className="mt-3 inline-block text-sm text-teal-soft hover:underline">
              Start onboarding
            </Link>
          </div>
        ) : editing ? (
          <div>
            <h2 className="mb-4 text-base font-medium text-cream">{sectionLabels[editing]}</h2>
            <div className="flex flex-col gap-2">
              {getOptionsForSection(editing).map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={`w-full rounded-xl border py-4 px-5 text-left text-sm transition-all ${
                    editValues.includes(opt)
                      ? "border-teal/40 bg-teal/15 text-teal-soft"
                      : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-teal/20"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-slate-blue/30 py-3 text-sm text-cream-dim hover:text-cream"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 rounded-xl bg-teal/20 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(["reasons", "helped", "triggers"] as const).map((section) => (
              <div key={section} className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-cream">{sectionLabels[section]}</h3>
                  <button
                    onClick={() => startEdit(section)}
                    className="text-xs text-teal-soft hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(data[section] || []).length > 0 ? (
                    data[section].map((item) => (
                      <span key={item} className="rounded-full bg-teal/10 px-2.5 py-1 text-xs text-teal-soft">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-cream-dim/40">None selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
