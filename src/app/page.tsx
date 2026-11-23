"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MyPersonSection from "@/components/MyPerson";
import {
  BreathingIcon,
  HeadphonesIcon,
  SettingsIcon,
  WaveIcon,
} from "@/components/Icons";
import { getInstallPrompt, clearInstallPrompt } from "@/components/RegisterSW";


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
  const [checkBack, setCheckBack] = useState<{
    ts: number;
    tool: string;
    state: string;
  } | null>(null);
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
        // Nothing in quick access. Use what they said brought them here
        // rather than always defaulting to breathing: "Burnout / Shutdown"
        // and "Panic attacks" want very different first sessions.
        const byReason: Record<string, { label: string; href: string }> = {
          "Panic attacks": { label: "the panic SOS", href: "/sos" },
          "General anxiety": { label: "extended exhale breathing", href: "/breathing?pattern=extended-exhale" },
          "Stress & overwhelm": { label: "a body scan", href: "/body-scan" },
          "Burnout / Shutdown": { label: "gentle movement", href: "/somatic?exercise=gentle-swaying" },
          "Supporting someone else": { label: "the helper walkthrough", href: "/caregiver" },
        };
        let picked: { label: string; href: string } | null = null;
        try {
          const raw = localStorage.getItem("onboarding_data");
          if (raw) {
            const { reasons } = JSON.parse(raw) as { reasons?: string[] };
            for (const r of reasons || []) {
              if (byReason[r]) {
                picked = byReason[r];
                break;
              }
            }
          }
        } catch { /* fall through to breathing */ }

        setFirstSessionNudge(
          picked ?? { label: "a breathing exercise", href: "/breathing" },
        );
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
              No, I need help
            </button>
            <button
              onClick={() => {
                dismissFirstOpen();
                router.push("/onboarding");
              }}
              className="rounded-2xl border border-teal/20 bg-teal/5 px-6 py-4 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/10"
            >
              I&apos;m okay, show me around
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
                exercises, grounding techniques, and movement practices, all
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
        {/* Header. Settings lives here now rather than in the bottom nav,
            where it was taking a permanent slot to do nothing most days. */}
        <header className="relative mb-6 text-center">
          <Link
            href="/settings"
            aria-label="Settings"
            className="absolute -right-1 top-0 rounded-lg p-2 text-cream-dim/25 transition-colors hover:text-cream-dim/60"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
          <WaveIcon className="mx-auto mb-3 h-7 w-7 text-teal-soft/60" />
          <h1 className="text-xl font-light tracking-tight text-cream">
            Regulate
          </h1>
          <p className="mt-1.5 text-xs text-cream-dim/60">
            You&apos;re here. That&apos;s a good start.
          </p>
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

        {/* ── The three places to go ──
            There were five cards here, all the same size, all with an icon,
            a sentence and a duration. Everything looked equally important,
            which is the same as nothing looking important. Emergency Toolkit
            and Crisis Resources are both one tap away in the bottom bar and
            the footer, so they come off the shelf; what is left is the three
            things you would actually open. */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/exercises"
            className="flex items-center gap-4 rounded-2xl border border-teal/10 bg-deep/40 px-5 py-4 transition-all hover:border-teal/25"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/50">
              <BreathingIcon className="h-5 w-5 text-teal-soft" />
            </div>
            <div>
              <span className="block text-[15px] font-medium text-cream">Exercises</span>
              <span className="block text-xs text-cream-dim/50">Things your body already knows how to do</span>
            </div>
          </Link>
          <Link
            href="/meditations"
            className="flex items-center gap-4 rounded-2xl border border-teal/10 bg-deep/40 px-5 py-4 transition-all hover:border-teal/25"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/50">
              <HeadphonesIcon className="h-5 w-5 text-teal-soft" />
            </div>
            <div>
              <span className="block text-[15px] font-medium text-cream">Guided Meditations</span>
              <span className="block text-xs text-cream-dim/50">Put headphones on and let someone else talk</span>
            </div>
          </Link>
          <Link
            href="/games"
            className="flex items-center gap-4 rounded-2xl border border-teal/10 bg-deep/40 px-5 py-4 transition-all hover:border-teal/25"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/50">
              <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="14" cy="16" r="3.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </div>
            <div>
              <span className="block text-[15px] font-medium text-cream">Mindful Games</span>
              <span className="block text-xs text-cream-dim/50">Gentle distractions for restless hands</span>
            </div>
          </Link>
        </div>

        {/* The two that matter on particular days, kept quiet */}
        <div className="mt-5 flex items-center justify-center gap-5 text-xs text-cream-dim/35">
          <Link href="/caregiver" className="transition-colors hover:text-cream-dim/70">
            Helping someone else
          </Link>
          <span aria-hidden="true" className="text-cream-dim/15">·</span>
          <Link href="/crisis" className="transition-colors hover:text-cream-dim/70">
            Crisis resources
          </Link>
        </div>

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
            Regulate is a companion for your nervous system, not a replacement
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
