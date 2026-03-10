"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isPremium, purchasePremium, restorePurchases, PREMIUM_FEATURES, FREE_FEATURES, PRICE } from "@/lib/premium";
import { getStorageUsage } from "@/lib/storage";

interface CustomCrisisLine {
  name: string;
  number: string;
  textNumber?: string;
}

const COMMON_LINES: { country: string; name: string; number: string }[] = [
  { country: "UK", name: "Samaritans", number: "116 123" },
  { country: "Australia", name: "Lifeline", number: "13 11 14" },
  { country: "Canada", name: "Talk Suicide Canada", number: "988" },
  { country: "EU", name: "EU-wide crisis line", number: "116 123" },
  { country: "India", name: "iCall", number: "9152987821" },
];

const CRISIS_KEY = "regulate-custom-crisis";

export default function SettingsPage() {
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [fontLarge, setFontLarge] = useState(false);
  const [crisisName, setCrisisName] = useState("");
  const [crisisNumber, setCrisisNumber] = useState("");
  const [crisisText, setCrisisText] = useState("");
  const [crisisSaved, setCrisisSaved] = useState(false);
  const [showCommonLines, setShowCommonLines] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState<Record<string, unknown> | null>(null);
  const [nightMode, setNightMode] = useState<"auto" | "on" | "off">("auto");
  const [storageKB, setStorageKB] = useState<number | null>(null);

  useEffect(() => {
    try {
      setPremiumActive(isPremium());
      const stored = localStorage.getItem("regulate-haptics-enabled");
      if (stored !== null) setHapticsOn(stored !== "0");
      const storedFont = localStorage.getItem("regulate-font-size");
      if (storedFont === "large") setFontLarge(true);
      const storedCrisis = localStorage.getItem(CRISIS_KEY);
      if (storedCrisis) {
        const parsed: CustomCrisisLine = JSON.parse(storedCrisis);
        setCrisisName(parsed.name || "");
        setCrisisNumber(parsed.number || "");
        setCrisisText(parsed.textNumber || "");
      }
      const storedNight = localStorage.getItem("regulate-night-mode");
      if (storedNight === "on" || storedNight === "off") setNightMode(storedNight);
      const usage = getStorageUsage();
      setStorageKB(Math.round(usage.used / 1024));
    } catch { /* */ }
  }, []);

  function saveCrisisLine() {
    if (!crisisName.trim() || !crisisNumber.trim()) return;
    const data: CustomCrisisLine = { name: crisisName.trim(), number: crisisNumber.trim() };
    if (crisisText.trim()) data.textNumber = crisisText.trim();
    localStorage.setItem(CRISIS_KEY, JSON.stringify(data));
    setCrisisSaved(true);
    setTimeout(() => setCrisisSaved(false), 2000);
  }

  function removeCrisisLine() {
    localStorage.removeItem(CRISIS_KEY);
    setCrisisName("");
    setCrisisNumber("");
    setCrisisText("");
  }

  function selectCommonLine(line: { name: string; number: string }) {
    setCrisisName(line.name);
    setCrisisNumber(line.number);
    setCrisisText("");
    setShowCommonLines(false);
  }

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

  function downloadData() {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("regulate-")) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    // Also include related keys that don't have the regulate- prefix
    const extraKeys = ["onboarding_complete", "quick_access", "onboarding_data", "my_person", "current_ns_state"];
    extraKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regulate-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text || !text.trim()) {
        setImportMessage("This backup file is empty");
        setTimeout(() => setImportMessage(null), 3000);
        return;
      }
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setImportMessage("This doesn't look like a Regulate backup file");
          setTimeout(() => setImportMessage(null), 3000);
          return;
        }
        const hasRegulateKeys = Object.keys(parsed).some((k) => k.startsWith("regulate-"));
        if (!hasRegulateKeys) {
          setImportMessage("This doesn't look like a Regulate backup file");
          setTimeout(() => setImportMessage(null), 3000);
          return;
        }
        setImportConfirm(parsed);
      } catch {
        setImportMessage("This doesn't look like a Regulate backup file");
        setTimeout(() => setImportMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  }

  function executeRestore(backup: Record<string, unknown>) {
    setImportLoading(true);
    try {
      for (const [key, value] of Object.entries(backup)) {
        if (Array.isArray(value)) {
          // Merge arrays, deduplicate by id or timestamp
          const existingRaw = localStorage.getItem(key);
          let existing: unknown[] = [];
          if (existingRaw) {
            try { existing = JSON.parse(existingRaw); } catch { existing = []; }
          }
          if (!Array.isArray(existing)) existing = [];

          const seen = new Set<string>();
          const merged: unknown[] = [];

          // Helper to get a dedup key from an item
          const getKey = (item: unknown): string | null => {
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              if (obj.id) return String(obj.id);
              if (obj.timestamp) return String(obj.timestamp);
            }
            return null;
          };

          // Add existing items first
          for (const item of existing) {
            const k = getKey(item);
            if (k) {
              if (!seen.has(k)) { seen.add(k); merged.push(item); }
            } else {
              merged.push(item);
            }
          }
          // Add backup items, skipping duplicates
          for (const item of value) {
            const k = getKey(item);
            if (k) {
              if (!seen.has(k)) { seen.add(k); merged.push(item); }
            } else {
              merged.push(item);
            }
          }

          localStorage.setItem(key, JSON.stringify(merged));
        } else if (typeof value === "object" && value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
        } else if (typeof value === "string") {
          localStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
      setImportMessage("Restored! Your data has been merged.");
      setTimeout(() => {
        setImportMessage(null);
        window.location.reload();
      }, 1500);
    } catch {
      setImportMessage("Something went wrong during restore");
      setTimeout(() => setImportMessage(null), 3000);
    } finally {
      setImportLoading(false);
      setImportConfirm(null);
    }
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
      "regulate-favorites-v2", "regulate-haptics-enabled", "regulate-font-size",
      "regulate-custom-crisis", "regulate-premium", "regulate-night-mode",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    setConfirmClear(null);
    router.push("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">Settings</h1>
        </header>

        <div className="flex flex-col gap-3">
          <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-cream-dim/30">Practice</p>

          {/* Haptic feedback */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-cream">Haptic feedback</h3>
                <p className="mt-1 text-xs text-cream-dim/60">
                  Vibration during exercises
                  {typeof navigator !== "undefined" && !("vibrate" in navigator) && (
                    <span className="block mt-1 text-candle-soft/60">Not supported on this device</span>
                  )}
                </p>
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

          {/* Font size */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-cream">Text size</h3>
                <p className="mt-1 text-xs text-cream-dim/60">Make text larger for readability</p>
              </div>
              <button
                onClick={() => {
                  const next = !fontLarge;
                  setFontLarge(next);
                  localStorage.setItem("regulate-font-size", next ? "large" : "normal");
                  document.documentElement.classList.toggle("large-text", next);
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${fontLarge ? "bg-teal" : "bg-slate-blue/40"}`}
                aria-label={fontLarge ? "Switch to normal text size" : "Switch to large text size"}
              >
                <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-cream transition-transform ${fontLarge ? "translate-x-5" : "translate-x-0"}`} />
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

          {/* Night mode */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <div>
              <h3 className="text-sm font-medium text-cream">Night mode</h3>
              <p className="mt-1 text-xs text-cream-dim/60">Warmer, dimmer colors for late sessions</p>
            </div>
            <div className="mt-3 flex rounded-xl border border-slate-blue/20 overflow-hidden">
              {([["auto", "Auto"], ["on", "Always on"], ["off", "Always off"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setNightMode(value);
                    localStorage.setItem("regulate-night-mode", value);
                    // Apply immediately
                    if (value === "on") {
                      document.documentElement.classList.add("night-mode");
                    } else if (value === "off") {
                      document.documentElement.classList.remove("night-mode");
                    } else {
                      const h = new Date().getHours();
                      document.documentElement.classList.toggle("night-mode", h >= 22 || h < 6);
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    nightMode === value
                      ? "bg-teal/20 text-teal-soft"
                      : "text-cream-dim/50 hover:text-cream-dim"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>


          <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-cream-dim/30">Regulate+</p>

          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            {premiumActive ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/15">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-teal-soft">
                      <path d="M5 8L7.5 10.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-cream">You have Regulate+</h3>
                    <p className="mt-0.5 text-xs text-cream-dim/50">All personal insight features are unlocked.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-cream">Regulate+</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/50">
                  All exercises and crisis tools are free forever. Regulate+ adds personal insights to help you understand your patterns.
                </p>

                <div className="mt-4 mb-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-teal-soft/40">Included with Regulate+</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {PREMIUM_FEATURES.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-teal-soft/60">
                          <path d="M3 6L5.25 8.25L9 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs text-cream-dim/70">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 mb-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-cream-dim/25">Always free</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {FREE_FEATURES.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-cream-dim/30">
                          <path d="M3 6L5.25 8.25L9 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs text-cream-dim/40">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setPurchaseLoading(true);
                    try {
                      const success = await purchasePremium();
                      if (success) setPremiumActive(true);
                    } finally {
                      setPurchaseLoading(false);
                    }
                  }}
                  disabled={purchaseLoading || restoreLoading}
                  className="mt-4 w-full rounded-xl bg-teal/15 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchaseLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" strokeLinecap="round" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Unlock — ${PRICE} one-time, yours forever`
                  )}
                </button>

                <button
                  onClick={async () => {
                    setRestoreLoading(true);
                    setRestoreMessage(null);
                    try {
                      const restored = await restorePurchases();
                      if (restored) {
                        setPremiumActive(true);
                      } else {
                        setRestoreMessage("No previous purchase found.");
                      }
                    } finally {
                      setRestoreLoading(false);
                    }
                  }}
                  disabled={purchaseLoading || restoreLoading}
                  className="mt-2 w-full rounded-xl border border-slate-blue/20 py-2.5 text-xs text-cream-dim/50 transition-colors hover:text-cream-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoreLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" strokeLinecap="round" />
                      </svg>
                      Restoring...
                    </span>
                  ) : (
                    "Restore purchases"
                  )}
                </button>

                {restoreMessage && (
                  <p className="mt-1.5 text-center text-[11px] text-cream-dim/40">{restoreMessage}</p>
                )}

                <p className="mt-2 text-center text-[11px] text-cream-dim/30">
                  Every crisis tool stays free. Always.
                </p>
              </>
            )}
          </div>

          <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-cream-dim/30">Privacy</p>

          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <h3 className="text-sm font-medium text-cream">Your data stays here</h3>
            <p className="mt-2 text-xs text-cream-dim/50">
              Your data never leaves this device. No accounts, no cloud, no tracking.
            </p>
            <p className="mt-2 text-xs text-cream-dim/50">
              Regulate stores everything in your browser&apos;s local storage. If you clear your browser data, your Regulate data will be cleared too.
            </p>
          </div>

          <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-cream-dim/30">Safety</p>

          {/* Custom crisis line */}
          <div className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <h3 className="text-sm font-medium text-cream">Crisis line</h3>
            <p className="mt-1 text-xs text-cream-dim/60">
              Not everyone is in the US. Add your local crisis line here.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                value={crisisName}
                onChange={(e) => setCrisisName(e.target.value)}
                placeholder="Name (e.g., Lifeline Australia)"
                className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <input
                type="tel"
                value={crisisNumber}
                onChange={(e) => setCrisisNumber(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <input
                type="tel"
                value={crisisText}
                onChange={(e) => setCrisisText(e.target.value)}
                placeholder="Text number (optional)"
                className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveCrisisLine}
                  disabled={!crisisName.trim() || !crisisNumber.trim()}
                  className="flex-1 rounded-xl bg-teal/20 py-2.5 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {crisisSaved ? "Saved" : "Save"}
                </button>
                {crisisName && (
                  <button
                    onClick={removeCrisisLine}
                    className="rounded-xl border border-slate-blue/20 px-4 py-2.5 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Common international lines */}
            <div className="mt-3">
              <button
                onClick={() => setShowCommonLines(!showCommonLines)}
                className="flex items-center gap-1 text-xs text-teal-soft/50 transition-colors hover:text-teal-soft"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`transition-transform ${showCommonLines ? "rotate-90" : ""}`}
                >
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Common international lines
              </button>
              {showCommonLines && (
                <div className="mt-2 flex flex-col gap-1">
                  {COMMON_LINES.map((line) => (
                    <button
                      key={`${line.country}-${line.number}`}
                      onClick={() => selectCommonLine(line)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-teal/10"
                    >
                      <span className="text-cream-dim">
                        <span className="text-cream-dim/40">{line.country}:</span>{" "}
                        {line.name}
                      </span>
                      <span className="font-medium text-teal-soft/60">{line.number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-cream-dim/30">Your data</p>

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

          {/* Download data */}
          <button
            onClick={downloadData}
            className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30"
          >
            <h3 className="text-sm font-medium text-cream">Download my data</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Export all app data as a JSON backup file</p>
          </button>

          {/* Restore from backup */}
          <input
            type="file"
            accept=".json,application/json"
            id="restore-file-input"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => document.getElementById("restore-file-input")?.click()}
            disabled={importLoading}
            className="w-full rounded-2xl border border-teal/15 bg-deep/60 p-5 text-left transition-colors hover:border-teal/30 disabled:opacity-50"
          >
            <h3 className="text-sm font-medium text-teal-soft">
              {importLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" strokeLinecap="round" />
                  </svg>
                  Restoring...
                </span>
              ) : (
                "Restore from backup"
              )}
            </h3>
            <p className="mt-1 text-xs text-cream-dim/60">Import data from a previously downloaded backup</p>
          </button>
          {importMessage && (
            <p className="text-center text-xs text-teal-soft/70">{importMessage}</p>
          )}

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

          {storageKB !== null && (
            <p className="mt-2 text-center text-[11px] text-cream-dim/30">
              Using {storageKB < 1 ? "<1" : storageKB} KB of local storage
            </p>
          )}
        </div>

        {/* App info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-cream-dim/30">Regulate v1.0.0</p>
          <p className="mt-1 text-xs text-cream-dim/20">Nervous System Support</p>
        </div>

        {/* Import confirm modal */}
        {importConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-teal/20 bg-deep p-6 text-center">
              <h3 className="text-base font-medium text-cream">Restore backup?</h3>
              <p className="mt-2 text-sm text-cream-dim">
                This will merge with your existing data. Continue?
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setImportConfirm(null)}
                  className="flex-1 rounded-xl border border-slate-blue/30 py-3 text-sm text-cream-dim hover:text-cream"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeRestore(importConfirm)}
                  className="flex-1 rounded-xl bg-teal/20 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        )}

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
