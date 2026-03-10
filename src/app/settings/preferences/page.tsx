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

const allModules = [
  { href: "/breathing", title: "Guided Breathing" },
  { href: "/grounding", title: "5-4-3-2-1 Grounding" },
  { href: "/body-scan", title: "Body Scan" },
  { href: "/somatic", title: "Somatic Movement" },
  { href: "/affirmations", title: "Affirmations" },
  { href: "/journal", title: "Journal" },
  { href: "/learn", title: "Learn" },
];

interface OnboardingData {
  reasons: string[];
  helped: string[];
  triggers: string[];
}

interface QuickAccessModule {
  href: string;
  title: string;
}

type EditingSection = "reasons" | "helped" | "triggers" | "quickAccess" | null;

export default function PreferencesPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [quickAccess, setQuickAccess] = useState<QuickAccessModule[]>([]);
  const [editing, setEditing] = useState<EditingSection>(null);
  const [editValues, setEditValues] = useState<string[]>([]);
  const [editQuickAccess, setEditQuickAccess] = useState<QuickAccessModule[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_data");
      if (raw) setData(JSON.parse(raw));
    } catch { /* */ }
    try {
      const raw = localStorage.getItem("quick_access");
      if (raw) setQuickAccess(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  function startEdit(section: "reasons" | "helped" | "triggers") {
    setEditing(section);
    setEditValues(data?.[section] || []);
  }

  function startEditQuickAccess() {
    setEditing("quickAccess");
    setEditQuickAccess([...quickAccess]);
  }

  function toggle(item: string) {
    setEditValues((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function toggleQuickAccessModule(mod: QuickAccessModule) {
    setEditQuickAccess((prev) => {
      const exists = prev.some((m) => m.href === mod.href);
      if (exists) return prev.filter((m) => m.href !== mod.href);
      if (prev.length >= 3) return prev;
      return [...prev, mod];
    });
  }

  function saveEdit() {
    if (!editing) return;
    if (editing === "quickAccess") {
      setQuickAccess(editQuickAccess);
      localStorage.setItem("quick_access", JSON.stringify(editQuickAccess));
      setEditing(null);
      return;
    }
    if (!data) return;
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

  const hasData = data || quickAccess.length > 0;

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

        {!hasData ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-cream-dim/60">No onboarding data found.</p>
            <Link href="/onboarding" className="mt-3 inline-block text-sm text-teal-soft hover:underline">
              Start onboarding
            </Link>
          </div>
        ) : editing === "quickAccess" ? (
          <div>
            <h2 className="mb-2 text-base font-medium text-cream">Go-to tools</h2>
            <p className="mb-4 text-xs text-cream-dim/60">Pick up to 3 tools for quick access on the home screen.</p>
            <div className="flex flex-col gap-2">
              {allModules.map((mod) => {
                const selected = editQuickAccess.some((m) => m.href === mod.href);
                const atLimit = editQuickAccess.length >= 3 && !selected;
                return (
                  <button
                    key={mod.href}
                    onClick={() => toggleQuickAccessModule(mod)}
                    disabled={atLimit}
                    className={`flex w-full items-center justify-between rounded-xl border py-4 px-5 text-left text-sm transition-all ${
                      selected
                        ? "border-teal/40 bg-teal/15 text-teal-soft"
                        : atLimit
                        ? "border-slate-blue/15 bg-deep/20 text-cream-dim/30 cursor-not-allowed"
                        : "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-teal/20"
                    }`}
                  >
                    <span>{mod.title}</span>
                    {selected && (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="none">
                        <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
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
                      ? editing === "triggers"
                        ? "border-candle/40 bg-candle/10 text-candle-soft"
                        : "border-teal/40 bg-teal/15 text-teal-soft"
                      : editing === "triggers"
                      ? "border-slate-blue/30 bg-deep/40 text-cream-dim hover:border-candle/20"
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
            {/* Onboarding data sections */}
            {data && (["reasons", "helped", "triggers"] as const).map((section) => (
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
                      <span
                        key={item}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          section === "triggers"
                            ? "bg-candle/10 text-candle-soft"
                            : "bg-teal/10 text-teal-soft"
                        }`}
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-cream-dim/40">None selected</span>
                  )}
                </div>
              </div>
            ))}

            {/* Quick access tools */}
            <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-cream">Go-to tools</h3>
                <button
                  onClick={startEditQuickAccess}
                  className="text-xs text-teal-soft hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {quickAccess.length > 0 ? (
                  quickAccess.map((mod) => (
                    <span key={mod.href} className="rounded-full bg-teal/10 px-2.5 py-1 text-xs text-teal-soft">
                      {mod.title}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-cream-dim/40">None selected</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
