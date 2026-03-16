"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SafetyCheck from "@/components/SafetyCheck";
import ShareCard from "@/components/ShareCard";
import { isPremium } from "@/lib/premium";

type Feeling = "better" | "same" | "harder" | "skipped";

interface AftercareFlowProps {
  technique: string;
  onDone: () => void;
  onRestart?: () => void;
  exerciseType?: string;
  completionHeading?: string;
  completionSubtext?: string;
  learnLink?: string;
  category?: string;
  exerciseId?: string;
  exerciseHref?: string;
}

/**
 * Infer the category from the technique name for sharing purposes.
 */
function inferCategory(technique: string): string {
  const t = technique.toLowerCase();
  if (t.includes("breathing") || t.includes("sigh") || t.includes("coherence") || t.includes("4-7-8") || t.includes("box")) return "Breathing";
  if (t.includes("grounding") || t.includes("5-4-3-2-1") || t.includes("sensory")) return "Grounding";
  if (t.includes("body scan")) return "Body Scan";
  if (t.includes("sleep")) return "Sleep";
  if (t.includes("affirmation")) return "Affirmations";
  return "Somatic";
}

// ─── Complementary technique mapping ──────────────────────────────────

const COMPLEMENTARY_MAP: Record<string, { label: string; href: string }[]> = {
  Breathing: [
    { label: "Grounding", href: "/grounding" },
    { label: "Body Scan", href: "/body-scan" },
  ],
  Grounding: [
    { label: "Body Scan", href: "/body-scan" },
    { label: "Breathing", href: "/breathing" },
  ],
  Somatic: [
    { label: "Breathing", href: "/breathing" },
    { label: "Grounding", href: "/grounding" },
  ],
  "Body Scan": [
    { label: "Somatic", href: "/somatic" },
    { label: "Breathing", href: "/breathing" },
  ],
  Sleep: [
    { label: "Body Scan", href: "/body-scan" },
    { label: "Breathing", href: "/breathing" },
  ],
  Affirmations: [
    { label: "Breathing", href: "/breathing" },
    { label: "Journal", href: "/journal" },
  ],
};

function getComplementary(category: string): { label: string; href: string }[] {
  return COMPLEMENTARY_MAP[category] ?? [
    { label: "Breathing", href: "/breathing" },
    { label: "Grounding", href: "/grounding" },
  ];
}

// ─── Learn page anchor mapping ────────────────────────────────────────

const LEARN_LINKS: Record<string, string> = {
  Breathing: "/learn#breathing",
  Grounding: "/learn#grounding",
  "Body Scan": "/learn#body-scan",
  Somatic: "/learn#bilateral",
  Sleep: "/learn#breathing",
  Affirmations: "/learn#techniques",
};

function getLearnLink(category: string, explicitLink?: string): string {
  return explicitLink ?? LEARN_LINKS[category] ?? "/learn#techniques";
}

// ─── Gentle alternatives for "harder" path ────────────────────────────

const GENTLE_ALTERNATIVES: Record<string, { label: string; href: string }> = {
  Breathing: { label: "Body Scan", href: "/body-scan" },
  Grounding: { label: "Body Scan", href: "/body-scan" },
  Somatic: { label: "Breathing", href: "/breathing" },
  "Body Scan": { label: "Breathing", href: "/breathing" },
  Sleep: { label: "Body Scan", href: "/body-scan" },
  Affirmations: { label: "Body Scan", href: "/body-scan" },
};

// ─── Repeated "harder" detection ──────────────────────────────────────

/**
 * Count aftercare "harder" responses within the last 7 days from journal.
 * Includes the current response (already written to localStorage by handleFeeling).
 */
function getRecentHarderCount(): number {
  try {
    const raw = localStorage.getItem("regulate-journal");
    if (!raw) return 0;
    const entries = JSON.parse(raw) as { type?: string; aftercareResponse?: string; date?: string }[];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => {
      if (e.type !== "aftercare" || e.aftercareResponse !== "harder") return false;
      const ts = e.date ? new Date(e.date).getTime() : 0;
      return ts >= sevenDaysAgo;
    }).length;
  } catch {
    return 0;
  }
}

// ─── Micro-journal component (free for all users) ────────────────────

function MicroJournal({ technique }: { technique: string }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    if (!text.trim()) return;
    try {
      const raw = localStorage.getItem("regulate-journal");
      const entries = raw ? JSON.parse(raw) : [];
      entries.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        date: new Date().toISOString(),
        type: "micro",
        technique,
        content: text.trim(),
        // Defaults so the journal page doesn't break on missing fields
        intensity: 0,
        duration: "",
        triggers: [],
        techniques: [technique],
        reflection: text.trim(),
      });
      localStorage.setItem("regulate-journal", JSON.stringify(entries));
      setSaved(true);
    } catch { /* */ }
  }

  if (saved) {
    return <p className="text-xs text-teal-soft/70">Saved.</p>;
  }

  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-2">
      <p className="text-xs text-cream-dim/60">Anything you want to remember about this?</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="One sentence about how that felt&#8230;"
        rows={2}
        className="w-full rounded-xl border border-teal/15 bg-midnight/60 px-4 py-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!text.trim()}
          className="rounded-xl bg-teal/20 px-5 py-2 text-xs font-medium text-teal-soft transition-colors hover:bg-teal/30 disabled:opacity-40 disabled:cursor-default"
        >
          Save
        </button>
        <button
          onClick={() => setSaved(true)}
          className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ─── Quick-journal component (premium) ───────────────────────────────

function QuickJournal({ technique }: { technique: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    if (!text.trim() || !isPremium()) return;
    try {
      const raw = localStorage.getItem("regulate-journal");
      const entries = raw ? JSON.parse(raw) : [];
      entries.push({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "reflection",
        technique,
        content: text.trim(),
      });
      localStorage.setItem("regulate-journal", JSON.stringify(entries));
      setSaved(true);
    } catch { /* */ }
  }

  if (saved) {
    return (
      <p className="text-xs text-teal-soft/70">Moment saved.</p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim"
      >
        Save this moment
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you want to remember about this moment?"
        rows={3}
        autoFocus
        className="w-full rounded-xl border border-teal/15 bg-deep/60 px-4 py-3 text-sm text-cream placeholder:text-cream-dim/40 focus:border-teal/30 focus:outline-none resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-cream-dim/50 px-3 py-1.5 transition-colors hover:text-cream-dim"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!text.trim()}
          className="rounded-lg bg-teal/15 px-4 py-1.5 text-xs font-medium text-teal-soft transition-colors hover:bg-teal/25 disabled:opacity-40 disabled:cursor-default"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Toolkit prompt component ─────────────────────────────────────

function ToolkitPrompt({
  technique,
  exerciseId,
  exerciseHref,
  category,
  onDone,
}: {
  technique: string;
  exerciseId: string;
  exerciseHref: string;
  category: string;
  onDone: () => void;
}) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    try {
      const raw = localStorage.getItem("regulate-toolkit-exercises");
      const exercises = raw ? JSON.parse(raw) : [];
      exercises.push({
        id: exerciseId,
        label: technique,
        href: exerciseHref,
        category,
      });
      localStorage.setItem("regulate-toolkit-exercises", JSON.stringify(exercises));
    } catch { /* */ }
    setAdded(true);
    setTimeout(onDone, 1200);
  }

  if (added) {
    return (
      <div className="flex items-center justify-center py-4 animate-screen-enter">
        <p className="text-sm text-teal-soft/80">Added &#10003;</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-xl border border-candle/15 bg-candle/5 px-5 py-4 text-center animate-screen-enter">
      <p className="text-sm text-cream-dim">
        Add <span className="text-cream">{technique}</span> to your emergency toolkit?
      </p>
      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          onClick={handleAdd}
          className="rounded-lg bg-candle/20 px-5 py-2 text-xs font-medium text-candle transition-colors hover:bg-candle/30"
        >
          Add
        </button>
        <button
          onClick={onDone}
          className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

/**
 * Post-session aftercare flow shown after completing any module.
 * Asks how the user feels, responds appropriately, and logs to journal.
 */
export default function AftercareFlow({
  technique,
  onDone,
  onRestart,
  exerciseType,
  completionHeading = "Done",
  completionSubtext = "Nice work.",
  learnLink,
  category,
  exerciseId,
  exerciseHref,
}: AftercareFlowProps) {
  const resolvedCategory = category || exerciseType || inferCategory(technique);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [repeatedHarder, setRepeatedHarder] = useState(false);
  const [step, setStep] = useState<"feeling" | "response" | "toolkit-prompt" | "what-next">("feeling");
  const [alreadyInToolkit, setAlreadyInToolkit] = useState(true);

  // Check if exercise is already in toolkit
  useEffect(() => {
    if (!exerciseId) return;
    try {
      const raw = localStorage.getItem("regulate-toolkit-exercises");
      if (!raw) { setAlreadyInToolkit(false); return; }
      const exercises = JSON.parse(raw) as { id: string }[];
      setAlreadyInToolkit(exercises.some((e) => e.id === exerciseId));
    } catch {
      setAlreadyInToolkit(false);
    }
  }, [exerciseId]);

  const complementary = getComplementary(resolvedCategory);
  const resolvedLearnLink = getLearnLink(resolvedCategory, learnLink);
  const gentle = GENTLE_ALTERNATIVES[resolvedCategory] ?? { label: "Body Scan", href: "/body-scan" };

  function handleFeeling(f: Feeling) {
    setFeeling(f);
    setStep("response");

    // Auto-log to journal (premium only)
    if (isPremium()) {
      try {
        const raw = localStorage.getItem("regulate-journal");
        const entries = raw ? JSON.parse(raw) : [];
        entries.push({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: "aftercare",
          technique,
          aftercareResponse: f,
        });
        localStorage.setItem("regulate-journal", JSON.stringify(entries));
      } catch { /* */ }
    }

    // Track session for outcomes measurement
    try {
      const raw = localStorage.getItem("regulate-sessions");
      const sessions = raw ? JSON.parse(raw) : [];
      sessions.push({
        technique,
        feeling: f,
        ts: Date.now(),
        date: new Date().toISOString().slice(0, 10),
      });
      localStorage.setItem("regulate-sessions", JSON.stringify(sessions));
    } catch { /* */ }

    // Show safety check before the "heavier" result screen
    if (f === "harder") {
      // Check for repeated "harder" responses (3+ in 7 days)
      const count = getRecentHarderCount();
      if (count >= 3) {
        setRepeatedHarder(true);
      }
      setShowSafetyCheck(true);
    }
  }

  // Step 1: Ask how they feel - body-based cards for accessibility in distress
  if (step === "feeling") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-light text-cream">How does your body feel?</h2>
        <p className="mt-2 text-sm text-cream-dim">No wrong answer.</p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
          {/* Lighter */}
          <button
            onClick={() => handleFeeling("better")}
            className="flex w-full items-center gap-4 rounded-2xl bg-teal/15 px-5 py-5 text-left transition-all hover:bg-teal/25 active:scale-[0.98]"
            style={{ minHeight: 80 }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 28, height: 28, backgroundColor: "var(--color-teal-soft)" }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-sm font-medium text-teal-soft">
                Lighter
              </span>
              <span className="block text-[13px] leading-snug text-cream-dim">
                My body feels lighter
              </span>
              <span className="block mt-0.5 text-xs text-cream-dim/60">
                Breathing easier, less tension
              </span>
            </div>
          </button>

          {/* About the same */}
          <button
            onClick={() => handleFeeling("same")}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-blue/30 bg-deep/60 px-5 py-5 text-left transition-all hover:border-candle/20 active:scale-[0.98]"
            style={{ minHeight: 80 }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 28, height: 28, backgroundColor: "var(--color-candle)" }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-sm font-medium text-cream">
                About the same
              </span>
              <span className="block text-[13px] leading-snug text-cream-dim">
                Not much has changed
              </span>
              <span className="block mt-0.5 text-xs text-cream-dim/60">
                That&apos;s okay. Sometimes it takes time.
              </span>
            </div>
          </button>

          {/* Heavier */}
          <button
            onClick={() => handleFeeling("harder")}
            className="flex w-full items-center gap-4 rounded-2xl border border-candle/15 bg-candle/5 px-5 py-5 text-left transition-all hover:bg-candle/10 active:scale-[0.98]"
            style={{ minHeight: 80 }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 28, height: 28, backgroundColor: "#c27a6a" }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block text-sm font-medium text-candle-soft">
                Heavier
              </span>
              <span className="block text-[13px] leading-snug text-cream-dim">
                I feel heavier or more activated
              </span>
              <span className="block mt-0.5 text-xs text-cream-dim/60">
                Let&apos;s try something different
              </span>
            </div>
          </button>
        </div>

        {/* Skip option for shutdown / alexithymia */}
        <button
          onClick={() => handleFeeling("skipped")}
          className="mt-6 text-xs text-cream-dim/50 underline underline-offset-2 transition-colors hover:text-cream-dim/80"
        >
          Skip - I can&apos;t tell right now
        </button>
      </div>
    );
  }

  // Safety check screen - shown before the "heavier" result screen
  if (showSafetyCheck) {
    return <SafetyCheck onSafe={() => setShowSafetyCheck(false)} />;
  }

  // Step 2: Respond based on feeling (empathetic message + optional journal)
  if (step === "response") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        {feeling === "better" && (
          <>
            <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              {completionSubtext}
            </p>

            {/* Quick journal (premium only) */}
            {isPremium() && (
              <div className="mt-5">
                <QuickJournal technique={technique} />
              </div>
            )}

            {/* Micro-journal (free users only — premium already has QuickJournal) */}
            {!isPremium() && (
              <div className="mt-5">
                <MicroJournal technique={technique} />
              </div>
            )}

            {/* Learn link */}
            <Link
              href={resolvedLearnLink}
              className="mt-4 text-xs text-teal-soft/70 underline underline-offset-2 transition-colors hover:text-teal-soft"
            >
              Why this works &rarr;
            </Link>
          </>
        )}

        {feeling === "same" && (
          <>
            <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              That&apos;s normal. Sometimes it takes a bit for your body to catch up.
            </p>

            {/* Quick journal (premium only) */}
            {isPremium() && (
              <div className="mt-5">
                <QuickJournal technique={technique} />
              </div>
            )}

            {/* Micro-journal (free users only — premium already has QuickJournal) */}
            {!isPremium() && (
              <div className="mt-5">
                <MicroJournal technique={technique} />
              </div>
            )}
          </>
        )}

        {feeling === "skipped" && (
          <>
            <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              That&apos;s fine. You don&apos;t have to know how you feel right now.
            </p>

            {/* Micro-journal (all users) */}
            <div className="mt-5">
              <MicroJournal technique={technique} />
            </div>
          </>
        )}

        {feeling === "harder" && !repeatedHarder && (
          <>
            <h2 className="text-xl font-light text-cream">Thank you for being honest.</h2>
            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              That happens sometimes. It doesn&apos;t mean it didn&apos;t work — your body might just need something different right now.
            </p>

            {/* Micro-journal (all users) */}
            <div className="mt-5">
              <MicroJournal technique={technique} />
            </div>
          </>
        )}

        {feeling === "harder" && repeatedHarder && (
          <div className="w-full max-w-sm rounded-2xl bg-candle/10 border border-candle/20 p-6 text-left">
            <h2 className="text-lg font-light text-cream">
              Exercises aren&apos;t always the right fit for what you&apos;re going through right now.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream-dim">
              Talking to a therapist could help you understand what&apos;s happening in your nervous system.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <a
                href="https://www.psychologytoday.com/us/therapists"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-teal/15 px-5 py-3 text-center text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
              >
                Find a therapist
              </a>
              <Link
                href="/crisis"
                className="w-full rounded-xl bg-candle/15 px-5 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
              >
                Crisis resources
              </Link>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-cream-dim">
              There&apos;s nothing wrong with you. Sometimes you just need a real person to talk to.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              const shouldShowToolkit =
                feeling === "better" &&
                exerciseId &&
                exerciseHref &&
                !alreadyInToolkit;
              setStep(shouldShowToolkit ? "toolkit-prompt" : "what-next");
            }}
            className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 2.5: Optional toolkit prompt (only for "better" + not already saved)
  if (step === "toolkit-prompt" && exerciseId && exerciseHref) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <ToolkitPrompt
          technique={technique}
          exerciseId={exerciseId}
          exerciseHref={exerciseHref}
          category={resolvedCategory}
          onDone={() => setStep("what-next")}
        />
      </div>
    );
  }

  // Step 3: What next? — actionable options based on feeling
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      {feeling === "better" && (
        <>
          <h2 className="text-xl font-light text-cream">What&apos;s next?</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            You can come back to this one anytime.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={onDone}
              className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Done
            </button>
            <Link
              href={complementary[0]?.href ?? "/"}
              className="text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim"
            >
              Want to try another exercise?
            </Link>
          </div>

          <div className="mt-4">
            <ShareCard technique={technique} category={resolvedCategory} />
          </div>
        </>
      )}

      {feeling === "same" && (
        <>
          <h2 className="text-xl font-light text-cream">What&apos;s next?</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Might be worth trying something different, or giving this one another go.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-center text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Try something different
            </Link>
            {onRestart && (
              <button
                onClick={onRestart}
                className="w-56 rounded-xl border border-teal/15 bg-deep/60 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:border-teal/30 hover:bg-deep/80"
              >
                Try this one again
              </button>
            )}
            <button
              onClick={onDone}
              className="text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim"
            >
              I&apos;m done for now
            </button>
          </div>

          <div className="mt-4">
            <ShareCard technique={technique} category={resolvedCategory} />
          </div>
        </>
      )}

      {feeling === "harder" && (
        <>
          <h2 className="text-xl font-light text-cream">What&apos;s next?</h2>
          <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-cream-dim">
            Nothing wrong with that. Some exercises hit different depending on the day.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/sos"
              className="w-56 rounded-xl bg-candle/15 px-8 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
            >
              I need more support
            </Link>
            <Link
              href={gentle.href}
              className="w-56 rounded-xl border border-teal/15 bg-deep/60 px-8 py-3 text-center text-sm font-medium text-teal-soft transition-colors hover:border-teal/30 hover:bg-deep/80"
            >
              Try something gentler ({gentle.label})
            </Link>
            <button
              onClick={onDone}
              className="text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim"
            >
              I&apos;m done for now
            </button>
          </div>
        </>
      )}

      {feeling === "skipped" && (
        <>
          <h2 className="text-xl font-light text-cream">What&apos;s next?</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            No pressure. You can come back whenever you&apos;re ready.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={onDone}
              className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
            >
              Done
            </button>
            <Link
              href="/"
              className="text-xs text-cream-dim/60 underline underline-offset-2 transition-colors hover:text-cream-dim"
            >
              Browse exercises
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
