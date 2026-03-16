"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MyPersonSection from "@/components/MyPerson";
import {
  BreathingIcon,
  WaveIcon,
} from "@/components/Icons";
import PremiumGate from "@/components/PremiumGate";
import { isPremium } from "@/lib/premium";
import { getInstallPrompt, clearInstallPrompt } from "@/components/RegisterSW";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";

// ─── Daily Suggestion ───────────────────────────────────────────────

const DAILY_SUGGESTIONS: Record<number, { label: string; href: string }> = {
  0: { label: "Body scan", href: "/body-scan" },
  1: { label: "Start with a Physiological Sigh", href: "/breathing?pattern=sigh" },
  2: { label: "Try 5-4-3-2-1 Grounding", href: "/grounding" },
  3: { label: "Gentle body shake", href: "/somatic?exercise=body-shaking" },
  4: { label: "Start with a Physiological Sigh", href: "/breathing?pattern=sigh" },
  5: { label: "Try 5-4-3-2-1 Grounding", href: "/grounding" },
  6: { label: "Gentle body shake", href: "/somatic?exercise=body-shaking" },
};

function DailySuggestion() {
  const [suggestion, setSuggestion] = useState<{
    label: string;
    href: string;
    isRepeat: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("regulate-last-helped");
      if (raw) {
        const data = JSON.parse(raw);
        const daysSince = (Date.now() - data.ts) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7 && data.name && data.href) {
          setSuggestion({
            label: data.name,
            href: data.href,
            isRepeat: true,
          });
          return;
        }
      }
    } catch {}

    const day = new Date().getDay();
    const pick = DAILY_SUGGESTIONS[day];
    setSuggestion({ label: pick.label, href: pick.href, isRepeat: false });
  }, []);

  if (!suggestion) return null;

  return (
    <Link
      href={suggestion.href}
      className="mb-4 block rounded-2xl border border-teal/20 bg-teal/5 px-5 py-4 transition-all hover:border-teal/30"
    >
      <p className="mb-1 text-[10px] uppercase tracking-widest text-teal-soft/50">
        Suggested for you
      </p>
      <p className="text-sm font-medium text-cream">
        {suggestion.isRepeat
          ? `Last time, ${suggestion.label} helped. Try it again?`
          : suggestion.label}
      </p>
    </Link>
  );
}

// ─── Session Stats ──────────────────────────────────────────────────

function SessionStats() {
  const [stats, setStats] = useState<{ total: number; streak: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("regulate-sessions");
      if (!raw) return;
      const sessions = JSON.parse(raw) as { date: string }[];
      if (sessions.length === 0) return;

      // Unique dates sorted descending
      const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();

      // Calculate streak: consecutive days ending today or yesterday
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let streak = 0;
      if (dates[0] === today || dates[0] === yesterday) {
        let expected = dates[0];
        for (const d of dates) {
          if (d === expected) {
            streak++;
            const prev = new Date(expected + "T00:00:00");
            prev.setDate(prev.getDate() - 1);
            expected = prev.toISOString().slice(0, 10);
          } else if (d < expected) {
            break;
          }
        }
      }

      setStats({ total: sessions.length, streak });
    } catch { /* */ }
  }, []);

  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 mb-4 text-xs text-cream-dim/50">
      <span><span className="text-cream font-medium">{stats.total}</span> session{stats.total !== 1 ? "s" : ""}</span>
      {stats.streak > 0 && (
        <span><span className="text-cream font-medium">{stats.streak}</span> day streak</span>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [isNightTime, setIsNightTime] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(false);
  const [firstOpenReady, setFirstOpenReady] = useState(false);
  const [whatIsExpanded, setWhatIsExpanded] = useState(false);
  const [firstSessionNudge, setFirstSessionNudge] = useState<{
    label: string;
    href: string;
  } | null>(null);
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("off");

  const [checkBack, setCheckBack] = useState<{
    ts: number;
    tool: string;
    state: string;
  } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // First-open detection — runs before anything else
  useEffect(() => {
    try {
      const hasOnboarding = localStorage.getItem("onboarding_complete");
      const hasVisited = localStorage.getItem("regulate-last-visit");
      const sosHistory = localStorage.getItem("regulate-sos-history");
      const hasSosEntries =
        sosHistory && JSON.parse(sosHistory).length > 0;

      if (!hasOnboarding && !hasVisited && !hasSosEntries) {
        setIsFirstOpen(true);
      }
    } catch {}
    setFirstOpenReady(true);
  }, []);

  useEffect(() => {
    const h = new Date().getHours();
    setIsNightTime(h >= 22 || h < 6);
  }, []);

  // Stop ambient audio when leaving home page
  useEffect(() => {
    return () => { ambientAudio.stop(); };
  }, []);

  // First-session nudge: show once after onboarding
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem("onboarding_complete");
      const firstDone = localStorage.getItem("regulate-first-session-done");
      if (onboarded && !firstDone) {
        const quickRaw = localStorage.getItem("quick_access");
        if (quickRaw) {
          const tools = JSON.parse(quickRaw) as {
            href: string;
            title: string;
          }[];
          if (tools.length > 0) {
            setFirstSessionNudge({
              label: tools[0].title,
              href: tools[0].href,
            });
            return;
          }
        }
        // Fallback to breathing
        setFirstSessionNudge({
          label: "a breathing exercise",
          href: "/breathing",
        });
      }
    } catch {}
  }, []);

  // Track last visit (skip if first-open screen is showing)
  useEffect(() => {
    if (isFirstOpen) return;
    try {
      localStorage.setItem("regulate-last-visit", String(Date.now()));
    } catch {}
  }, [isFirstOpen]);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("regulate-install-dismissed");
      setInstallDismissed(dismissed === "true");
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    // Check if an install prompt is already captured by RegisterSW
    const existing = getInstallPrompt();
    if (existing) setInstallPrompt(existing);

    // Listen for future install-ready events from RegisterSW
    const handler = () => {
      const prompt = getInstallPrompt();
      if (prompt) setInstallPrompt(prompt);
    };
    window.addEventListener("regulate-install-ready", handler);
    return () => window.removeEventListener("regulate-install-ready", handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("regulate-check-back");
      if (raw) {
        const data = JSON.parse(raw);
        const hoursSince = (Date.now() - data.ts) / (1000 * 60 * 60);
        // Show if 1-48 hours have passed
        if (hoursSince >= 1 && hoursSince <= 48) {
          setCheckBack(data);
        } else if (hoursSince > 48) {
          localStorage.removeItem("regulate-check-back");
        }
      }
    } catch {}
  }, []);

  function dismissCheckBack() {
    setCheckBack(null);
    localStorage.removeItem("regulate-check-back");
    localStorage.removeItem("regulate-notification-scheduled");
  }

  function dismissFirstSession() {
    setFirstSessionNudge(null);
    try {
      localStorage.setItem("regulate-first-session-done", "1");
    } catch {}
  }

  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    try {
      localStorage.setItem("regulate-install-dismissed", "true");
    } catch {
      /* */
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = installPrompt as any;
    prompt.prompt();
    try {
      const result = await prompt.userChoice;
      if (result?.outcome === "accepted") {
        clearInstallPrompt();
      }
    } catch {
      // userChoice may not be available on all browsers
    }
    // Hide the banner regardless of outcome
    dismissInstall();
    setInstallPrompt(null);
  }, [installPrompt, dismissInstall]);

  function dismissFirstOpen() {
    setIsFirstOpen(false);
    try {
      localStorage.setItem("regulate-last-visit", String(Date.now()));
    } catch {}
  }

  // ─── FIRST-OPEN SCREEN ───────────────────────────────────────────

  // Don't render anything until we've checked localStorage
  if (!firstOpenReady) return null;

  if (isFirstOpen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <main className="w-full max-w-md text-center">
          <WaveIcon className="mx-auto mb-4 h-8 w-8 text-teal-soft/60" />
          <h1 className="text-2xl font-light tracking-tight text-cream">
            Regulate
          </h1>
          <p className="mt-3 text-sm text-cream/80">
            Are you okay right now?
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => {
                dismissFirstOpen();
                router.push("/sos");
              }}
              className="rounded-2xl border border-candle/20 bg-candle/5 px-6 py-4 text-sm font-medium text-candle-soft transition-colors hover:bg-candle/10"
            >
              No — I need help
            </button>
            <button
              onClick={() => {
                dismissFirstOpen();
                router.push("/onboarding");
              }}
              className="rounded-2xl border border-teal/20 bg-teal/5 px-6 py-4 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/10"
            >
              I&apos;m okay — show me around
            </button>
          </div>

          <div className="mt-8">
            <button
              onClick={() => setWhatIsExpanded(!whatIsExpanded)}
              className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
            >
              What is Regulate?
            </button>
            {whatIsExpanded && (
              <p className="mt-3 text-xs leading-relaxed text-cream-dim/50">
                Regulate is a set of tools for your nervous system. Breathing
                exercises, grounding techniques, and movement practices — all
                designed to help when you feel panicked, anxious, shut down, or
                can&apos;t sleep. Everything works offline. Your data stays on
                your device.
              </p>
            )}
          </div>

          <p className="mt-10 text-[11px] text-cream-dim/30">
            If you are in crisis, please contact the{" "}
            <a
              href="tel:988"
              className="text-cream-dim/60 underline underline-offset-2"
            >
              988 Suicide &amp; Crisis Lifeline
            </a>
          </p>
        </main>
      </div>
    );
  }

  // ─── FEED VIEW (always shown) ──────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <main className="w-full max-w-md">
        {/* Header */}
        <header className="mb-6 text-center">
          <WaveIcon className="mx-auto mb-3 h-7 w-7 text-teal-soft/60" />
          <h1 className="text-xl font-light tracking-tight text-cream">
            Regulate
          </h1>
          <p className="mt-1.5 text-xs text-cream-dim/60">
            You&apos;re here. That&apos;s a good start.
          </p>
          {/* Ambient sound toggle */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {(["rain", "ocean", "forest", "off"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (s === "off") { ambientAudio.stop(); setAmbientSound("off"); }
                  else { ambientAudio.start(s); setAmbientSound(s); }
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] transition-all ${
                  ambientSound === s
                    ? "bg-teal/20 text-teal-soft"
                    : "text-cream-dim/30 hover:text-cream-dim/50"
                }`}
              >
                {s === "off" ? "Quiet" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Panic shortcut — always visible */}
        <button
          onClick={() => router.push("/sos")}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-candle/20 bg-candle/5 px-5 py-3.5 text-sm font-medium text-candle-soft transition-colors hover:bg-candle/10 active:scale-[0.98]"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8M8 12v1" />
          </svg>
          Panicking or overwhelmed? Start here
        </button>

        {/* Check-back banner (after SOS use) */}
        {checkBack && (
          <div className="mb-4 rounded-2xl border border-teal/20 bg-teal/5 p-5 text-center">
            <p className="text-sm font-medium text-cream">
              How are you holding up?
            </p>
            <p className="mt-1 text-xs text-cream-dim/60">
              You had a tough moment earlier.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={dismissCheckBack}
                className="rounded-xl bg-teal/15 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/25"
              >
                I&apos;m doing better
              </button>
              <button
                onClick={() => {
                  dismissCheckBack();
                  router.push(
                    "/sos?state=" + (checkBack.state || "anxious"),
                  );
                }}
                className="rounded-xl border border-candle/15 bg-candle/5 py-3 text-sm text-candle-soft transition-colors hover:bg-candle/10"
              >
                Still shaky - I need support
              </button>
              <button
                onClick={dismissCheckBack}
                className="text-xs text-cream-dim/30 hover:text-cream-dim/60"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* First-session nudge */}
        {firstSessionNudge && (
          <div className="mb-4 rounded-2xl border border-teal/25 bg-teal/5 p-5 text-center">
            <p className="text-sm font-medium text-cream">
              Ready to try {firstSessionNudge.label}?
            </p>
            <p className="mt-1 text-xs text-cream-dim/60">
              No pressure - just seeing how it feels.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={firstSessionNudge.href}
                onClick={dismissFirstSession}
                className="rounded-xl bg-teal/15 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/25"
              >
                Let&apos;s go
              </Link>
              <button
                onClick={dismissFirstSession}
                className="text-xs text-cream-dim/30 hover:text-cream-dim/60"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Night-time sleep suggestion */}
        {isNightTime && (
          <Link
            href="/sleep"
            className="mb-4 block rounded-2xl border border-lavender/15 bg-lavender/5 px-5 py-4 text-center transition-all hover:border-lavender/25"
          >
            <p className="text-sm font-medium text-lavender">Can&apos;t sleep?</p>
            <p className="mt-0.5 text-xs text-cream-dim/50">Try the sleep sequence</p>
          </Link>
        )}

        {/* Body check-in */}
        {!showQuiz ? (
          <button
            onClick={() => setShowQuiz(true)}
            className="mb-4 w-full rounded-2xl border border-teal/15 bg-deep/40 px-5 py-3 text-center text-sm text-cream-dim/60 transition-all hover:border-teal/25 hover:text-cream-dim"
          >
            How does your body feel right now?
          </button>
        ) : (
          <div className="mb-4 rounded-2xl border border-teal/20 bg-deep/60 p-5">
            <p className="mb-4 text-center text-sm font-medium text-cream">How does your body feel right now?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setShowQuiz(false); router.push("/sos?state=panicking"); }} className="rounded-xl border border-candle/15 bg-candle/5 py-3 text-sm text-candle-soft transition-colors hover:bg-candle/10">
                Tight, racing, can&apos;t sit still
              </button>
              <button onClick={() => { setShowQuiz(false); router.push("/breathing"); }} className="rounded-xl border border-teal/15 bg-teal/5 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/10">
                Tense but managing
              </button>
              <button onClick={() => { setShowQuiz(false); router.push("/somatic"); }} className="rounded-xl border border-teal/15 bg-teal/5 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/10">
                Numb or disconnected
              </button>
              <button onClick={() => { setShowQuiz(false); router.push("/sleep"); }} className="rounded-xl border border-lavender/15 bg-lavender/5 py-3 text-sm text-lavender transition-colors hover:bg-lavender/10">
                Restless, can&apos;t sleep
              </button>
              <button onClick={() => setShowQuiz(false)} className="mt-1 text-xs text-cream-dim/30 hover:text-cream-dim/60">
                Fine — just exploring
              </button>
            </div>
          </div>
        )}

        {/* Daily suggested exercise */}
        <DailySuggestion />

        {/* Session stats */}
        <SessionStats />

        {/* ── Main hub cards ── */}
        <p className="mb-1 text-[10px] uppercase tracking-widest text-cream-dim/30">
          What do you need?
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/exercises"
            className="flex items-center gap-3 rounded-2xl border border-teal/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-teal/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <BreathingIcon className="h-5 w-5 text-teal-soft" />
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Exercises</span>
              <span className="block text-xs text-cream-dim/50">Things your body already knows how to do <span className="text-cream-dim/30">· 3-10 min</span></span>
            </div>
          </Link>
          <Link
            href="/meditations"
            className="flex items-center gap-3 rounded-2xl border border-teal/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-teal/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4" r="2" />
                <path d="M12 6v4" />
                <path d="M8 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                <path d="M6 18l2-4" />
                <path d="M18 18l-2-4" />
                <path d="M9 22l1-4" />
                <path d="M15 22l-1-4" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Guided Meditations</span>
              <span className="block text-xs text-cream-dim/50">A calm voice walks you through it <span className="text-cream-dim/30">· 5-15 min</span></span>
            </div>
          </Link>
          <Link
            href="/games"
            className="flex items-center gap-3 rounded-2xl border border-teal/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-teal/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="14" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Mindful Games</span>
              <span className="block text-xs text-cream-dim/50">Gentle distractions for restless hands <span className="text-cream-dim/30">· no time limit</span></span>
            </div>
          </Link>
          <Link
            href="/toolkit"
            className="flex items-center gap-3 rounded-2xl border border-candle/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-candle/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <svg className="h-5 w-5 text-candle/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <path d="M12 12v3" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Emergency Toolkit</span>
              <span className="block text-xs text-cream-dim/50">Your panic kit, safety plan &amp; contacts <span className="text-cream-dim/30">· set up in 2 min</span></span>
            </div>
          </Link>
          <Link
            href="/caregiver"
            className="flex items-center gap-3 rounded-2xl border border-teal/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-teal/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Helping Someone</span>
              <span className="block text-xs text-cream-dim/50">Walk someone through a tough moment</span>
            </div>
          </Link>
          <Link
            href="/crisis"
            className="flex items-center gap-3 rounded-2xl border border-teal/10 bg-deep/40 px-4 py-3.5 transition-all hover:border-teal/25"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
              <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-medium text-cream">Crisis Resources</span>
              <span className="block text-xs text-cream-dim/50">Talk to someone right now</span>
            </div>
          </Link>
        </div>

        {/* Premium upsell for free users */}
        {!isPremium() && (
          <div className="mt-8">
            <PremiumGate feature="Track what works for your body, get daily practice suggestions, and journal your progress.">
              <div />
            </PremiumGate>
          </div>
        )}

        {/* My person */}
        <div className="mt-8">
          <MyPersonSection />
        </div>

        {/* Install banner */}
        {installPrompt && !installDismissed && (
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-teal/15 bg-deep/60 px-4 py-3">
            <p className="text-sm text-cream-dim/60">
              Add Regulate to your home screen for instant access
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-teal/15 px-3 py-1.5 text-xs text-teal-soft hover:bg-teal/25"
              >
                Install
              </button>
              <button
                onClick={dismissInstall}
                className="text-cream-dim/30 hover:text-cream-dim"
                aria-label="Dismiss install banner"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Footer — trust statement and 988 */}
        <footer className="mt-8">
          <p className="text-center text-[11px] leading-relaxed text-cream-dim/30">
            Regulate is a companion for your nervous system — not a replacement
            for professional care. You&apos;re doing something good by being here. If
            you&apos;re in crisis, please reach out to the{" "}
            <a
              href="tel:988"
              className="text-cream-dim/60 underline underline-offset-2"
            >
              988 Lifeline
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
