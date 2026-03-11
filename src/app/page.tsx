"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ModuleCard from "@/components/ModuleCard";
import MyPersonSection from "@/components/MyPerson";
import {
  BreathingIcon,
  GroundingIcon,
  BodyScanIcon,
  SomaticIcon,
  AffirmationsIcon,
  JournalIcon,
  LearnIcon,
  WaveIcon,
} from "@/components/Icons";
import {
  getTopTechniques,
  getPersonalizedRecommendations,
  type TopTechnique,
} from "@/lib/recommendations";
import PremiumGate from "@/components/PremiumGate";
import { isPremium } from "@/lib/premium";
import { getInstallPrompt, clearInstallPrompt } from "@/components/RegisterSW";

// ─── Body state options ─────────────────────────────────────────────

const bodyStates = [
  {
    id: "panicking",
    label: "Racing or panicking",
    sub: "Heart pounding, can't breathe, spiraling",
    route: "/sos?state=panicking",
    barColor: "bg-coral",
    bgColor: "bg-coral/6 hover:bg-coral/12",
    textColor: "text-coral-soft",
    icon: (
      <svg className="h-5 w-5 text-coral-soft" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="4" fill="currentColor" className="animate-pulse-soft" />
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1" opacity="0.3" className="animate-pulse-soft" />
      </svg>
    ),
  },
  {
    id: "anxious",
    label: "Tense or anxious",
    sub: "On edge, restless, can't settle",
    route: "/sos?state=anxious",
    barColor: "bg-candle",
    bgColor: "bg-candle/6 hover:bg-candle/12",
    textColor: "text-candle-soft",
    icon: (
      <svg className="h-5 w-5 text-candle-soft" viewBox="0 0 20 20" fill="none">
        <path d="M2 10L5 7L8 12L11 6L14 11L17 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "shutdown",
    label: "Shut down or numb",
    sub: "Frozen, disconnected, can't feel much",
    route: "/sos?state=shutdown",
    barColor: "bg-indigo",
    bgColor: "bg-indigo/6 hover:bg-indigo/12",
    textColor: "text-indigo-soft",
    icon: (
      <svg className="h-5 w-5 text-indigo-soft" viewBox="0 0 20 20" fill="none">
        <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "sleep",
    label: "Can't sleep",
    sub: "Restless, racing thoughts, wide awake",
    route: "/sleep",
    barColor: "bg-lavender",
    bgColor: "bg-lavender/6 hover:bg-lavender/12",
    textColor: "text-lavender",
    icon: (
      <svg className="h-5 w-5 text-lavender" viewBox="0 0 20 20" fill="none">
        <path d="M15 10A7 7 0 1 1 8 3a5.5 5.5 0 0 0 7 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "okay",
    label: "I'm okay right now",
    sub: "Just here to practice or explore",
    route: "",
    barColor: "bg-teal",
    bgColor: "bg-teal/6 hover:bg-teal/12",
    textColor: "text-teal-soft",
    icon: (
      <svg className="h-5 w-5 text-teal-soft" viewBox="0 0 20 20" fill="none">
        <path d="M3 10C3 10 6 6 10 6C14 6 17 10 17 10C17 10 14 14 10 14C6 14 3 10 3 10Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── Daily practice rotation (7-day cycle) ─────────────────────────

const dailyPractices = [
  {
    id: "breathing",
    name: "Physiological Sigh",
    desc: "Double inhale, long exhale - the fastest nervous system reset.",
    time: "~1 min",
    href: "/breathing",
  },
  {
    id: "body-scan",
    name: "Quick Body Scan",
    desc: "Move attention through your body - notice without fixing.",
    time: "5 min",
    href: "/body-scan",
  },
  {
    id: "orienting",
    name: "Orienting",
    desc: "Slowly look around to signal safety to your nervous system.",
    time: "2 min",
    href: "/somatic?exercise=orienting",
  },
  {
    id: "pendulation",
    name: "Pendulation",
    desc: "Shift attention between tension and comfort - build resilience.",
    time: "3 min",
    href: "/somatic?exercise=pendulation",
  },
  {
    id: "havening",
    name: "Self-Havening",
    desc: "Gentle arm and face strokes to produce deep calm.",
    time: "3 min",
    href: "/somatic?exercise=havening",
  },
  {
    id: "extended",
    name: "Coherence Breathing",
    desc: "5 seconds in, 5 seconds out - synchronize heart and breath.",
    time: "~1 min",
    href: "/breathing",
  },
  {
    id: "grounding",
    name: "5-4-3-2-1 Grounding",
    desc: "Use your senses to come back to the present moment.",
    time: "3 min",
    href: "/grounding",
  },
];

// All trackable somatic tools (for "Build your window" progress)
const ALL_SOMATIC_TOOLS = [
  "breathing",
  "extended",
  "tapping",
  "grounding",
  "gentle-movement",
  "body-scan",
  "somatic",
  "affirmations",
  "sleep",
  "orienting",
  "havening",
  "pendulation",
  "humming",
  "body-shaking",
];

// Icon map for quick-access toolbar
const quickAccessIconMap: Record<string, React.ReactNode> = {
  "/breathing": <BreathingIcon className="h-5 w-5 text-teal-soft" />,
  "/grounding": <GroundingIcon className="h-5 w-5 text-teal-soft" />,
  "/somatic": <SomaticIcon className="h-5 w-5 text-teal-soft" />,
  "/body-scan": <BodyScanIcon className="h-5 w-5 text-teal-soft" />,
  "/affirmations": <AffirmationsIcon className="h-5 w-5 text-teal-soft" />,
  "/journal": <JournalIcon className="h-5 w-5 text-teal-soft" />,
  "/sleep": <LearnIcon className="h-5 w-5 text-teal-soft" />,
};

// ─── Practice modules ───────────────────────────────────────────────

const modules = [
  {
    href: "/breathing",
    title: "Breathing",
    description: "Slow your breath, calm your nervous system.",
    icon: <BreathingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/grounding",
    title: "Grounding",
    description: "Come back to your senses, right here.",
    icon: <GroundingIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/somatic",
    title: "Somatic",
    description: "Release what your body is holding.",
    icon: <SomaticIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/body-scan",
    title: "Body Scan",
    description: "Progressive relaxation, head to toe.",
    icon: <BodyScanIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/affirmations",
    title: "Affirmations",
    description: "Words to hold you when things feel heavy.",
    icon: <AffirmationsIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
  {
    href: "/sleep",
    title: "Sleep",
    description: "A calming sequence for restless nights.",
    icon: <LearnIcon className="h-5 w-5 text-teal-soft" />,
    accentColor: "teal" as const,
  },
];

const secondaryLinks = [
  {
    href: "/journal",
    title: "Journal",
    icon: <JournalIcon className="h-4 w-4" />,
  },
  {
    href: "/programs/first-week",
    title: "Programs",
    icon: <WaveIcon className="h-4 w-4" />,
  },
  {
    href: "/learn",
    title: "Learn",
    icon: <LearnIcon className="h-4 w-4" />,
  },
];

// ─── Helper: day-of-year ────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── Component ──────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"check-in" | "feed">("check-in");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [discovery, setDiscovery] = useState<{
    id: string;
    name: string;
    desc: string;
    time: string;
    href: string;
  } | null>(null);
  const [topTechniques, setTopTechniques] = useState<TopTechnique[] | null>(
    null,
  );
  const [isNightTime, setIsNightTime] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<"7day" | "30day" | null>(
    null,
  );
  const [firstSessionNudge, setFirstSessionNudge] = useState<{
    label: string;
    href: string;
  } | null>(null);
  const [programState, setProgramState] = useState<{
    status: "not-started" | "in-progress" | "completed";
    currentDay: number;
    completedCount: number;
    dayTitle: string;
  } | null>(null);

  // New state for calm toolkit features
  const [quickAccess, setQuickAccess] = useState<
    { href: string; title: string }[] | null
  >(null);
  const [toolsExplored, setToolsExplored] = useState<{
    count: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setIsNightTime(h >= 22 || h < 6);
  }, []);

  // Program progress
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem("onboarding_complete");
      const raw = localStorage.getItem("regulate-program-first-week");
      if (raw) {
        const p = JSON.parse(raw) as {
          currentDay: number;
          completedDays: number[];
          startDate: string;
        };
        const dayTitles = [
          "Breathing Basics",
          "Grounding Your Senses",
          "Your Body Knows",
          "Bilateral Tapping",
          "Self-Havening",
          "Orienting & Safety",
          "Your Regulation Toolkit",
        ];
        if (p.completedDays?.length === 7) {
          setProgramState({
            status: "completed",
            currentDay: 7,
            completedCount: 7,
            dayTitle: dayTitles[6],
          });
        } else {
          setProgramState({
            status: "in-progress",
            currentDay: p.currentDay || 1,
            completedCount: p.completedDays?.length || 0,
            dayTitle: dayTitles[(p.currentDay || 1) - 1],
          });
        }
      } else if (onboarded) {
        setProgramState({
          status: "not-started",
          currentDay: 1,
          completedCount: 0,
          dayTitle: "Breathing Basics",
        });
      }
    } catch {}
  }, []);

  // Quick-access toolbar: load go-to tools from onboarding
  useEffect(() => {
    try {
      const raw = localStorage.getItem("quick_access");
      if (raw) {
        const tools = JSON.parse(raw) as { href: string; title: string }[];
        if (tools.length > 0) {
          setQuickAccess(tools.slice(0, 3));
        }
      }
    } catch {}
  }, []);

  // Build your window: count unique tools explored
  useEffect(() => {
    try {
      const history = JSON.parse(
        localStorage.getItem("regulate-sos-history") || "[]",
      ) as { tool: string }[];
      const journal = JSON.parse(
        localStorage.getItem("regulate-journal") || "[]",
      ) as { tool?: string; technique?: string }[];

      const usedIds = new Set<string>();
      for (const h of history) {
        if (h.tool) usedIds.add(h.tool);
      }
      for (const j of journal) {
        if (j.tool) usedIds.add(j.tool);
        if (j.technique) usedIds.add(j.technique);
      }

      // Only count tools that are in our known list
      const explored = ALL_SOMATIC_TOOLS.filter((t) => usedIds.has(t));
      if (history.length > 0 || journal.length > 0) {
        setToolsExplored({
          count: explored.length,
          total: ALL_SOMATIC_TOOLS.length,
        });
      }
    } catch {}
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

  // Track last visit and detect re-entry after absence
  useEffect(() => {
    try {
      const now = Date.now();
      const lastVisit = localStorage.getItem("regulate-last-visit");
      if (lastVisit) {
        const elapsed = now - Number(lastVisit);
        const dayMs = 24 * 60 * 60 * 1000;
        if (elapsed >= 30 * dayMs) {
          setWelcomeBack("30day");
        } else if (elapsed >= 7 * dayMs) {
          setWelcomeBack("7day");
        }
      }
      localStorage.setItem("regulate-last-visit", String(now));
    } catch {}
  }, []);

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

  const [dashData, setDashData] = useState<{
    calmDays: number;
    lastHelped: string | null;
    totalSessions: number;
    trend: "improving" | "stable" | "worsening" | null;
  } | null>(null);

  useEffect(() => {
    try {
      // Calm days (from journal)
      const journal = JSON.parse(
        localStorage.getItem("regulate-journal") || "[]",
      );
      const lastEpisode =
        journal.length > 0
          ? Math.max(
              ...journal.map(
                (e: { timestamp?: number; date?: string }) =>
                  e.timestamp ||
                  (e.date ? new Date(e.date).getTime() : 0),
              ),
            )
          : 0;
      const calmDays =
        lastEpisode > 0
          ? Math.floor((Date.now() - lastEpisode) / (1000 * 60 * 60 * 24))
          : -1;

      // Last helped tool
      const lastHelpedRaw = localStorage.getItem("regulate-last-helped");
      const lastHelped = lastHelpedRaw
        ? JSON.parse(lastHelpedRaw).label
        : null;

      // Total sessions from SOS history
      const history = JSON.parse(
        localStorage.getItem("regulate-sos-history") || "[]",
      );
      const totalSessions = history.length;

      // Trend from journal (recent 5 vs previous 5)
      let trend: "improving" | "stable" | "worsening" | null = null;
      if (journal.length >= 6) {
        const sorted = [...journal].sort(
          (a: { timestamp: number }, b: { timestamp: number }) =>
            b.timestamp - a.timestamp,
        );
        const recent = sorted.slice(0, 5);
        const prev = sorted.slice(5, 10);
        if (prev.length >= 3) {
          const recentAvg =
            recent.reduce(
              (s: number, e: { intensity: number }) => s + e.intensity,
              0,
            ) / recent.length;
          const prevAvg =
            prev.reduce(
              (s: number, e: { intensity: number }) => s + e.intensity,
              0,
            ) / prev.length;
          trend =
            recentAvg < prevAvg - 0.5
              ? "improving"
              : recentAvg > prevAvg + 0.5
                ? "worsening"
                : "stable";
        }
      }

      if (totalSessions > 0 || journal.length > 0) {
        setDashData({ calmDays, lastHelped, totalSessions, trend });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const techniques = getTopTechniques();
      setTopTechniques(techniques);
    } catch {
      /* */
    }
  }, []);

  // Reflection card state (for 10+ total sessions)
  const [showReflection, setShowReflection] = useState(false);

  useEffect(() => {
    try {
      const journal = JSON.parse(
        localStorage.getItem("regulate-journal") || "[]",
      );
      const history = JSON.parse(
        localStorage.getItem("regulate-sos-history") || "[]",
      );
      const totalSessions = journal.length + history.length;

      if (totalSessions >= 10) {
        const lastShown = localStorage.getItem(
          "regulate-reflection-last-shown",
        );
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (!lastShown || now - Number(lastShown) >= weekMs) {
          setShowReflection(true);
        }
      }
    } catch {}
  }, []);

  function dismissReflection() {
    setShowReflection(false);
    try {
      localStorage.setItem(
        "regulate-reflection-last-shown",
        String(Date.now()),
      );
    } catch {}
  }

  // Diagnostic quiz state
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [diagnosticFading, setDiagnosticFading] = useState(false);

  const [checkBack, setCheckBack] = useState<{
    ts: number;
    tool: string;
    state: string;
  } | null>(null);

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
    // Also cancel any scheduled push notification
    localStorage.removeItem("regulate-notification-scheduled");
  }

  useEffect(() => {
    try {
      const allExercises = [
        {
          id: "body-scan",
          name: "Body Scan",
          desc: "Move attention through your body - progressive release",
          time: "5 min",
          href: "/body-scan",
        },
        {
          id: "somatic",
          name: "Somatic Movement",
          desc: "Shaking, humming, vagus nerve work",
          time: "2-5 min",
          href: "/somatic",
        },
        {
          id: "affirmations",
          name: "Affirmations",
          desc: "Words chosen for how you're feeling",
          time: "2 min",
          href: "/affirmations",
        },
        {
          id: "grounding",
          name: "Grounding",
          desc: "Use your senses to come back to the present",
          time: "3 min",
          href: "/grounding",
        },
        {
          id: "breathing",
          name: "Guided Breathing",
          desc: "Patterns to calm your nervous system",
          time: "1-2 min",
          href: "/breathing",
        },
        {
          id: "sleep",
          name: "Sleep Sequence",
          desc: "Breathing + relaxation for restless nights",
          time: "3-5 min",
          href: "/sleep",
        },
      ];

      const history = JSON.parse(
        localStorage.getItem("regulate-sos-history") || "[]",
      );
      const dismissed = JSON.parse(
        localStorage.getItem("regulate-discovery-dismissed") || "[]",
      );
      const usedIds = new Set(
        history.map((h: { tool: string }) => h.tool),
      );

      const untried = allExercises.filter(
        (e) => !usedIds.has(e.id) && !dismissed.includes(e.id),
      );
      if (untried.length > 0) {
        setDiscovery(untried[Math.floor(Math.random() * untried.length)]);
      }
    } catch {}
  }, []);

  function dismissDiscovery() {
    if (!discovery) return;
    try {
      const dismissed = JSON.parse(
        localStorage.getItem("regulate-discovery-dismissed") || "[]",
      );
      dismissed.push(discovery.id);
      localStorage.setItem(
        "regulate-discovery-dismissed",
        JSON.stringify(dismissed),
      );
    } catch {}
    setDiscovery(null);
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

  // Daily suggested practice (rotates on a 7-day cycle)
  const todaysPractice =
    dailyPractices[getDayOfYear() % dailyPractices.length];

  // ─── CHECK-IN VIEW (default - the triage) ────────────────────────

  if (view === "check-in") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pb-24">
        <main className="w-full max-w-sm">
          {checkBack && (
            <div className="mb-6 rounded-2xl border border-teal/20 bg-teal/5 p-5 text-center">
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
          <div className="mb-10 text-center">
            <WaveIcon className="mx-auto mb-4 h-8 w-8 text-teal-soft/60" />
            <h1 className="text-xl font-light tracking-tight text-cream">
              {welcomeBack
                ? "Welcome back"
                : "How is your body right now?"}
            </h1>
            {welcomeBack && (
              <p className="mt-2 text-sm text-cream-dim/60">
                {welcomeBack === "30day"
                  ? "However long it\u2019s been, you\u2019re here now. That\u2019s what matters."
                  : "No pressure. Take your time."}
              </p>
            )}
          </div>

          {/* First-session nudge */}
          {firstSessionNudge && (
            <div className="mb-6 rounded-2xl border border-teal/25 bg-teal/5 p-5 text-center">
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

          <div className="flex flex-col gap-2.5">
            {bodyStates.map((state) => (
              <button
                key={state.id}
                onClick={() =>
                  state.id === "okay"
                    ? setView("feed")
                    : router.push(state.route)
                }
                className={`flex w-full items-center gap-4 overflow-hidden rounded-2xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal/50 ${state.bgColor}`}
              >
                {/* Left color bar */}
                <div
                  className={`w-1 self-stretch rounded-l-2xl ${state.barColor}`}
                />
                {/* Icon */}
                <div className="shrink-0 py-4">{state.icon}</div>
                {/* Text */}
                <div className="min-w-0 py-4 pr-5 text-left">
                  <span
                    className={`block text-base font-medium ${state.textColor}`}
                  >
                    {state.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-cream-dim/60">
                    {state.sub}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* "Just help me" escape hatch */}
          <button
            onClick={() => {
              try {
                const journal = JSON.parse(
                  localStorage.getItem("regulate-journal") || "[]",
                );
                const history = JSON.parse(
                  localStorage.getItem("regulate-sos-history") || "[]",
                );
                if (journal.length > 0 || history.length > 0) {
                  // Use recommendation engine to pick best technique
                  const recs = getPersonalizedRecommendations("anxious");
                  const sosToRoute: Record<string, string> = {
                    breathing: "/breathing",
                    extended: "/breathing",
                    tapping: "/somatic?start=tapping",
                    grounding: "/grounding",
                    "gentle-movement": "/somatic?start=gentle-movement",
                    "body-scan": "/body-scan",
                    somatic: "/somatic",
                    affirmations: "/affirmations",
                    sleep: "/sleep",
                  };
                  const route = sosToRoute[recs[0]] || "/breathing";
                  router.push(route);
                } else {
                  // No history - default to physiological sigh
                  router.push("/breathing");
                }
              } catch {
                router.push("/breathing");
              }
            }}
            className="mt-4 w-full rounded-2xl border border-teal/20 bg-teal/10 px-4 py-3 text-sm text-cream-dim transition-all hover:border-teal/30 hover:bg-teal/15 active:scale-[0.98]"
          >
            I don&apos;t know - just help me
          </button>

          {/* "Not sure what you're feeling?" diagnostic trigger */}
          {!showDiagnostic && (
            <button
              onClick={() => {
                setShowDiagnostic(true);
                setDiagnosticStep(0);
                setDiagnosticFading(false);
              }}
              className="mt-3 w-full text-center text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
            >
              Not sure what you&apos;re feeling?
            </button>
          )}

          {/* Inline diagnostic quiz */}
          {showDiagnostic && (
            <div className="relative mt-4 rounded-2xl border border-teal/15 bg-deep/60 p-5">
              {/* Close button */}
              <button
                onClick={() => setShowDiagnostic(false)}
                className="absolute right-3 top-3 text-cream-dim/30 transition-colors hover:text-cream-dim/60"
                aria-label="Close diagnostic"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4L12 12M12 4L4 12" />
                </svg>
              </button>

              {/* Questions (one at a time with fade) */}
              {diagnosticStep <= 2 && (
                <div
                  className={`transition-opacity duration-300 ${diagnosticFading ? "opacity-0" : "opacity-100"}`}
                >
                  <p className="pr-6 text-sm font-medium text-cream">
                    {diagnosticStep === 0 &&
                      "Is your heart racing or are you breathing fast?"}
                    {diagnosticStep === 1 &&
                      "Do you feel numb, frozen, or disconnected?"}
                    {diagnosticStep === 2 &&
                      "Is there a background hum of worry or tension?"}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => {
                        if (diagnosticStep === 0) {
                          router.push("/sos?state=panicking");
                        } else if (diagnosticStep === 1) {
                          router.push("/sos?state=shutdown");
                        } else {
                          router.push("/sos?state=anxious");
                        }
                      }}
                      className="flex-1 rounded-xl bg-teal/15 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/25"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        if (diagnosticStep < 2) {
                          setDiagnosticFading(true);
                          setTimeout(() => {
                            setDiagnosticStep((s) => s + 1);
                            setDiagnosticFading(false);
                          }, 300);
                        } else {
                          // All No - show window of tolerance message
                          setDiagnosticFading(true);
                          setTimeout(() => {
                            setDiagnosticStep(3);
                            setDiagnosticFading(false);
                          }, 300);
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-blue/30 py-2.5 text-sm text-cream-dim transition-colors hover:border-slate-blue/50"
                    >
                      No
                    </button>
                  </div>
                  {/* Progress dots */}
                  <div className="mt-3 flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1 w-1 rounded-full ${i === diagnosticStep ? "bg-teal-soft/60" : "bg-slate-blue/20"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All No result */}
              {diagnosticStep === 3 && (
                <div
                  className={`text-center transition-opacity duration-300 ${diagnosticFading ? "opacity-0" : "opacity-100"}`}
                >
                  <p className="text-sm font-medium text-cream">
                    You seem to be in your window of tolerance right now.
                  </p>
                  <p className="mt-1 text-xs text-cream-dim/60">
                    That&apos;s good.
                  </p>
                  <Link
                    href="/somatic"
                    className="mt-4 inline-block rounded-xl bg-teal/15 px-5 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/25"
                  >
                    Practice somatic tools
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Crisis line */}
          <div className="mt-10 flex justify-center">
            <a
              href="tel:988"
              className="text-[11px] text-cream-dim/60 underline underline-offset-2 hover:text-cream-dim/70"
            >
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </main>
      </div>
    );
  }

  // ─── FEED VIEW (practice tools) ──────────────────────────────────

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
            Tools for your nervous system.
          </p>
        </header>

        {/* ── Quick-access toolbar (if user set go-to tools) ── */}
        {quickAccess && quickAccess.length > 0 && (
          <div className="mb-5 flex justify-center gap-4">
            {quickAccess.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex w-20 flex-col items-center gap-1.5 rounded-2xl border border-teal/12 bg-teal/5 px-2 py-3 transition-all hover:border-teal/25 hover:bg-teal/10 active:scale-[0.96]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/10">
                  {quickAccessIconMap[tool.href] || (
                    <WaveIcon className="h-5 w-5 text-teal-soft" />
                  )}
                </div>
                <span className="text-[10px] leading-tight text-cream-dim/60">
                  {tool.title}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── "I need support right now" button ── */}
        <button
          onClick={() => setView("check-in")}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-candle/20 bg-candle/5 px-4 py-3.5 text-sm text-candle transition-all hover:border-candle/35 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12H7L9 6L12 18L15 9L17 12H22" />
          </svg>
          I need support right now
        </button>

        {/* ── Module cards grid ── */}
        <div className="flex flex-col gap-2">
          {modules.map((mod) => (
            <ModuleCard key={mod.href} {...mod} />
          ))}
        </div>

        {/* ── Secondary links ── */}
        <div className="mt-3 flex gap-2">
          {secondaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/40 py-3 text-xs text-cream-dim/60 transition-colors hover:border-teal/20 hover:text-cream-dim"
            >
              {link.icon}
              {link.title}
            </Link>
          ))}
        </div>

        {/* ── Learn link ── */}
        <Link
          href="/learn"
          className="mt-3 block text-center text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
        >
          Understanding your nervous system &rarr;
        </Link>

        {/* ── Premium: Your Practice (program, daily practice, stats, insights) ── */}
        {isPremium() && (
          <div className="mt-6">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-teal-soft/40">
              Your practice
            </p>

            {/* Program card */}
            {programState && programState.status === "not-started" && (
              <Link
                href="/programs/first-week"
                className="mb-3 block rounded-2xl border border-teal/20 bg-teal/8 p-4 transition-colors hover:border-teal/30"
              >
                <p className="text-sm font-medium text-cream">
                  Start your first week
                </p>
                <p className="mt-1 text-xs text-cream-dim/60">
                  7 days of guided practice - one technique a day.
                </p>
                <span className="mt-2 inline-block text-xs font-medium text-teal-soft">
                  Begin &rarr;
                </span>
              </Link>
            )}
            {programState && programState.status === "in-progress" && (
              <Link
                href="/programs/first-week"
                className="mb-3 block rounded-2xl border border-teal/20 bg-teal/5 p-4 transition-colors hover:border-teal/30"
              >
                <p className="text-sm font-medium text-cream">
                  Day {programState.currentDay}: {programState.dayTitle}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <div
                        key={d}
                        className={`h-1 w-4 rounded-full ${d <= programState.completedCount ? "bg-teal/60" : "bg-slate-blue/20"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-teal-soft">
                    Continue &rarr;
                  </span>
                </div>
              </Link>
            )}

            {/* Today's practice */}
            <div className="mb-3 rounded-2xl border border-teal/15 bg-teal/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-teal-soft/50">
                Today&apos;s practice
              </p>
              <p className="mt-1.5 text-sm font-medium text-cream">
                {todaysPractice.name}
              </p>
              <p className="mt-0.5 text-xs text-cream-dim/60">
                {todaysPractice.desc}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-cream-dim/40">
                  {todaysPractice.time}
                </span>
                <Link
                  href={todaysPractice.href}
                  className="rounded-xl bg-teal/20 px-5 py-2 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30 active:scale-[0.97]"
                >
                  Start
                </Link>
              </div>
            </div>

            {/* Dashboard stats */}
            {dashData && (
              <div className="mb-3 rounded-2xl border border-teal/15 bg-deep/60 p-4">
                <div className="grid grid-cols-3 gap-3">
                  {dashData.calmDays >= 0 && (
                    <div className="text-center">
                      <p className="text-lg font-medium text-teal-soft">
                        {dashData.calmDays}
                      </p>
                      <p className="text-[10px] text-cream-dim/60">calm days</p>
                    </div>
                  )}
                  {dashData.totalSessions > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-medium text-cream">
                        {dashData.totalSessions}
                      </p>
                      <p className="text-[10px] text-cream-dim/60">sessions</p>
                    </div>
                  )}
                  {dashData.trend && (
                    <div className="text-center">
                      <p
                        className={`text-lg font-medium ${dashData.trend === "improving" ? "text-teal-soft" : dashData.trend === "worsening" ? "text-candle" : "text-cream-dim"}`}
                      >
                        {dashData.trend === "improving"
                          ? "\u2193"
                          : dashData.trend === "worsening"
                            ? "\u2191"
                            : "\u2192"}
                      </p>
                      <p className="text-[10px] text-cream-dim/60">
                        {dashData.trend}
                      </p>
                    </div>
                  )}
                </div>
                {dashData.lastHelped && (
                  <p className="mt-3 text-center text-xs text-cream-dim/40">
                    Last time,{" "}
                    <span className="text-teal-soft/70">
                      {dashData.lastHelped}
                    </span>{" "}
                    helped
                  </p>
                )}
              </div>
            )}

            {/* What works for you */}
            {topTechniques && topTechniques.length > 0 && (
              <div className="mb-3 rounded-2xl border border-teal/15 bg-deep/60 p-4">
                <p className="text-[10px] uppercase tracking-widest text-teal-soft/50">
                  What works for you
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {topTechniques.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-cream">{t.label}</span>
                      <span className="text-xs text-teal-soft/70">
                        {Math.round(t.successRate * 100)}% helped
                        <span className="ml-1 text-cream-dim/30">
                          ({t.totalSessions}x)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Build your window */}
            {toolsExplored && (
              <div className="mb-3 rounded-2xl border border-teal/10 bg-deep/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-teal-soft/40">
                  Build your window
                </p>
                {toolsExplored.count >= toolsExplored.total ? (
                  <p className="mt-2 text-sm text-cream">
                    You&apos;ve explored every tool.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-cream">
                      {toolsExplored.count} of {toolsExplored.total} somatic tools explored
                    </p>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-blue/15">
                      <div
                        className="h-full rounded-full bg-teal/40 transition-all duration-500"
                        style={{
                          width: `${(toolsExplored.count / toolsExplored.total) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Reflection prompt */}
            {showReflection && (
              <div className="mb-3 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-cream">
                    A few minutes of reflection can deepen what you&apos;re learning.
                  </p>
                  <button
                    onClick={dismissReflection}
                    className="ml-3 shrink-0 p-1 text-cream-dim/30 hover:text-cream-dim/60"
                    aria-label="Dismiss"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href="/journal?reflect=1"
                    onClick={dismissReflection}
                    className="flex-1 rounded-xl bg-purple-400/15 py-2.5 text-center text-sm text-purple-200 transition-colors hover:bg-purple-400/25"
                  >
                    Open journal
                  </Link>
                  <button onClick={dismissReflection} className="text-xs text-cream-dim/30 hover:text-cream-dim/60">
                    Not now
                  </button>
                </div>
              </div>
            )}

            {/* Try something new */}
            {discovery && (
              <div className="mb-3 rounded-2xl border border-candle/15 bg-candle/5 p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-candle/50">
                      Try something new
                    </p>
                    <p className="mt-1 text-sm font-medium text-cream">
                      {discovery.name}
                    </p>
                    <p className="mt-0.5 text-xs text-cream-dim/60">
                      {discovery.desc}
                    </p>
                  </div>
                  <button
                    onClick={dismissDiscovery}
                    className="ml-3 shrink-0 p-1 text-cream-dim/30 hover:text-cream-dim/60"
                    aria-label="Dismiss"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <Link
                  href={discovery.href}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-candle/15 py-2.5 text-sm text-candle transition-colors hover:bg-candle/25"
                >
                  Try it - {discovery.time}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Premium upsell for free users */}
        {!isPremium() && (
          <div className="mt-6">
            <PremiumGate feature="Guided programs, daily practice suggestions, session history, insights, and more.">
              <div />
            </PremiumGate>
          </div>
        )}

        {/* My person */}
        <div className="mt-5">
          <MyPersonSection />
        </div>

        {/* Trust statement */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-cream-dim/30">
          Regulate supports your nervous system between therapy sessions. It
          is not a replacement for professional mental health care. If you
          are in crisis, please contact the{" "}
          <a
            href="tel:988"
            className="text-cream-dim/60 underline underline-offset-2"
          >
            988 Lifeline
          </a>
          .
        </p>

        {/* Install banner */}
        {installPrompt && !installDismissed && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-teal/15 bg-deep/60 px-4 py-3">
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

        {/* Footer */}
        <footer className="mt-6 flex justify-center gap-4 text-[11px] text-cream-dim/25">
          <Link href="/caregiver" className="hover:text-cream-dim/60">
            Helping someone?
          </Link>
          <Link href="/safety-plan" className="hover:text-cream-dim/60">
            Safety Plan
          </Link>
          <Link href="/crisis" className="hover:text-cream-dim/60">
            Crisis Resources
          </Link>
        </footer>
      </main>
    </div>
  );
}
