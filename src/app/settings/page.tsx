"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const [hapticsOn, setHapticsOn] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("regulate-haptics-enabled");
      if (stored !== null) setHapticsOn(stored !== "0");
    } catch { /* */ }
  }, []);

  function redoOnboarding() {
    localStorage.removeItem("onboarding_complete");
    localStorage.removeItem("quick_access");
    localStorage.removeItem("onboarding_data");
    router.push("/onboarding");
  }

  function clearJournal() {
    localStorage.removeItem("regulate-journal");
    setConfirmClear(null);
  }

  function clearAllData() {
    const keys = [
      "onboarding_complete", "quick_access", "onboarding_data",
      "regulate-journal", "regulate-favorites", "regulate-safety-plan",
      "my_person", "regulate-headphones-dismissed",
      "regulate-health-log", "regulate-health-enabled",
      "regulate-voice-enabled", "regulate-learn-intro-seen",
      "current_ns_state", "regulate-install-dismissed",
      "regulate-custom-patterns", "regulate-personal-affirmations",
      "regulate-favorites-v2", "regulate-haptics-enabled",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    setConfirmClear(null);
    router.push("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">Settings</h1>
        </header>

        <div className="flex flex-col gap-3">
          {/* Haptic feedback */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-cream">Haptic feedback</h3>
                <p className="mt-1 text-xs text-cream-dim/60">Vibration during exercises</p>
              </div>
              <button
                onClick={() => {
                  const next = !hapticsOn;
                  setHapticsOn(next);
                  localStorage.setItem("regulate-haptics-enabled", next ? "1" : "0");
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${hapticsOn ? "bg-teal" : "bg-slate-blue/40"}`}
                aria-label={hapticsOn ? "Disable haptic feedback" : "Enable haptic feedback"}
              >
                <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-cream transition-transform ${hapticsOn ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* Voice Guidance */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-cream">Voice guidance</h3>
                <p className="mt-1 text-xs text-cream-dim/60">Spoken cues during exercises</p>
              </div>
              <span className="rounded-full bg-slate-blue/20 px-2.5 py-0.5 text-[10px] font-medium text-cream-dim/40">Coming soon</span>
            </div>
          </div>

          {/* Apple Health */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-cream">Apple Health</h3>
                <p className="mt-1 text-xs text-cream-dim/60">Log mindful minutes automatically</p>
              </div>
              <span className="rounded-full bg-slate-blue/20 px-2.5 py-0.5 text-[10px] font-medium text-cream-dim/40">Coming soon</span>
            </div>
          </div>

          <div className="my-1 border-t border-slate-blue/10" />

          {/* Redo onboarding */}
          <button
            onClick={redoOnboarding}
            className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30"
          >
            <h3 className="text-sm font-medium text-cream">Redo onboarding</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Re-pick your go-to tools and preferences</p>
          </button>

          {/* Review preferences */}
          <Link
            href="/settings/preferences"
            className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30 block"
          >
            <h3 className="text-sm font-medium text-cream">Review your preferences</h3>
            <p className="mt-1 text-xs text-cream-dim/60">View and update your saved preferences</p>
          </Link>

          {/* Clear journal */}
          <button
            onClick={() => setConfirmClear("journal")}
            className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30"
          >
            <h3 className="text-sm font-medium text-cream">Clear journal data</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Delete all journal entries</p>
          </button>

          {/* Clear all data */}
          <button
            onClick={() => setConfirmClear("all")}
            className="w-full rounded-2xl border border-candle/15 bg-deep/60 p-5 text-left transition-colors hover:border-candle/30"
          >
            <h3 className="text-sm font-medium text-candle-soft">Clear all app data</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Reset everything and start fresh</p>
          </button>
        </div>

        {/* App info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-cream-dim/30">Regulate v1.0.0</p>
          <p className="mt-1 text-xs text-cream-dim/20">Nervous System Support</p>
        </div>

        {/* Confirm modal */}
        {confirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-candle/20 bg-deep p-6 text-center">
              <h3 className="text-base font-medium text-cream">Are you sure?</h3>
              <p className="mt-2 text-sm text-cream-dim">
                {confirmClear === "journal"
                  ? "This will permanently delete all your journal entries."
                  : "This will delete all your data and restart the app."}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmClear(null)}
                  className="flex-1 rounded-xl border border-slate-blue/30 py-3 text-sm text-cream-dim hover:text-cream"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClear === "journal" ? clearJournal : clearAllData}
                  className="flex-1 rounded-xl bg-candle/20 py-3 text-sm font-medium text-candle hover:bg-candle/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
