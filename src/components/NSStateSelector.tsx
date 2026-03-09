"use client";

import { useState, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────

export type NSState =
  | "hyperactivated"
  | "activated"
  | "window"
  | "hypoactivated";

interface StateOption {
  id: NSState;
  dotColor: string;
  name: string;
  description: string;
  color: string;
  glowColor: string;
  selectedBorder: string;
  selectedBg: string;
}

const states: StateOption[] = [
  {
    id: "hyperactivated",
    dotColor: "bg-red-400",
    name: "Hyperactivated",
    description: "Fight or flight. Racing heart, panic, can't sit still.",
    color: "text-red-400",
    glowColor: "shadow-red-500/20",
    selectedBorder: "border-red-400/50",
    selectedBg: "bg-red-500/10",
  },
  {
    id: "activated",
    dotColor: "bg-amber-400",
    name: "Activated",
    description: "On edge. Anxious, tense, worried.",
    color: "text-amber-400",
    glowColor: "shadow-amber-500/20",
    selectedBorder: "border-amber-400/50",
    selectedBg: "bg-amber-500/10",
  },
  {
    id: "window",
    dotColor: "bg-teal-soft",
    name: "Window of Tolerance",
    description: "Present. Able to engage, think, feel.",
    color: "text-teal-soft",
    glowColor: "shadow-teal/20",
    selectedBorder: "border-teal/50",
    selectedBg: "bg-teal/10",
  },
  {
    id: "hypoactivated",
    dotColor: "bg-blue-400",
    name: "Hypoactivated",
    description: "Freeze or shutdown. Numb, foggy, disconnected, exhausted.",
    color: "text-blue-400",
    glowColor: "shadow-blue-500/20",
    selectedBorder: "border-blue-400/50",
    selectedBg: "bg-blue-500/10",
  },
];

const STORAGE_KEY = "current_ns_state";

// ─── Component ──────────────────────────────────────────────────────

interface NSStateSelectorProps {
  /** Called when a state is selected */
  onSelect?: (state: NSState) => void;
  /** If true, hides the heading text */
  compact?: boolean;
  /** Override the heading */
  heading?: string;
}

export default function NSStateSelector({
  onSelect,
  compact = false,
  heading = "Where is your nervous system?",
}: NSStateSelectorProps) {
  const [selected, setSelected] = useState<NSState | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as NSState | null;
      if (saved) setSelected(saved);
    } catch { /* */ }
  }, []);

  function handleSelect(state: NSState) {
    setSelected(state);
    localStorage.setItem(STORAGE_KEY, state);
    onSelect?.(state);
  }

  return (
    <div className="w-full">
      {!compact && (
        <p className="mb-4 text-center text-sm text-cream-dim">{heading}</p>
      )}
      <div className="flex flex-col gap-2.5">
        {states.map((s) => {
          const isSelected = selected === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                isSelected
                  ? `${s.selectedBorder} ${s.selectedBg} shadow-lg ${s.glowColor} animate-pulse-soft`
                  : "border-slate-blue/30 bg-deep/50 hover:border-slate-blue/50 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-3.5 w-3.5 shrink-0 rounded-full ${s.dotColor}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${isSelected ? s.color : "text-cream"}`}>
                    {s.name}
                  </p>
                  <p className="mt-0.5 text-xs text-cream-dim/60">
                    {s.description}
                  </p>
                </div>
                {isSelected && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={`shrink-0 ${s.color}`}>
                    <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Read the current NS state from localStorage */
export function getCurrentNSState(): NSState | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY) as NSState | null;
  } catch {
    return null;
  }
}
