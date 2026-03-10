"use client";

import { useState } from "react";
import Link from "next/link";
import SafetyCheck from "@/components/SafetyCheck";
import ShareCard from "@/components/ShareCard";

type Feeling = "better" | "same" | "harder" | "skipped";

interface AftercareFlowProps {
  technique: string;
  onDone: () => void;
  completionHeading?: string;
  completionSubtext?: string;
  learnLink?: string;
  category?: string;
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

// ─── Quick-journal component ──────────────────────────────────────────

function QuickJournal({ technique }: { technique: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    if (!text.trim()) return;
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

/**
 * Post-session aftercare flow shown after completing any module.
 * Asks how the user feels, responds appropriately, and logs to journal.
 */
export default function AftercareFlow({
  technique,
  onDone,
  completionHeading = "Session complete",
  completionSubtext = "You showed up for yourself.",
  learnLink,
  category,
}: AftercareFlowProps) {
  const resolvedCategory = category || inferCategory(technique);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [repeatedHarder, setRepeatedHarder] = useState(false);

  const complementary = getComplementary(resolvedCategory);
  const resolvedLearnLink = getLearnLink(resolvedCategory, learnLink);
  const gentle = GENTLE_ALTERNATIVES[resolvedCategory] ?? { label: "Body Scan", href: "/body-scan" };

  function handleFeeling(f: Feeling) {
    setFeeling(f);

    // Auto-log to journal
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
  if (!feeling) {
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

  // Step 2: Respond based on feeling
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      {feeling === "better" && (
        <>
          <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            {completionSubtext}
          </p>

          {/* Quick journal */}
          <div className="mt-5">
            <QuickJournal technique={technique} />
          </div>

          {/* Complementary technique suggestion */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-cream-dim/60">
              {resolvedCategory} pairs well with {complementary[0].label.toLowerCase()} - try it next?
            </p>
            <Link
              href={complementary[0].href}
              className="rounded-full border border-teal/15 bg-deep/60 px-4 py-1.5 text-xs font-medium text-teal-soft transition-colors hover:border-teal/30 hover:bg-deep/80 active:scale-[0.97]"
            >
              {complementary[0].label}
            </Link>
          </div>

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
            Sometimes regulation is subtle. The fact that you tried is what matters. Your nervous system is learning even when it doesn&apos;t feel like it.
          </p>

          {/* Suggest a different category */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-cream-dim/60">
              Sometimes combining techniques helps - try {complementary[0].label.toLowerCase()} next?
            </p>
            <div className="flex gap-2">
              {complementary.map((alt) => (
                <Link
                  key={alt.href}
                  href={alt.href}
                  className="rounded-full border border-teal/15 bg-deep/60 px-4 py-1.5 text-xs font-medium text-teal-soft transition-colors hover:border-teal/30 hover:bg-deep/80 active:scale-[0.97]"
                >
                  {alt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Learn link */}
          <Link
            href={resolvedLearnLink}
            className="mt-4 text-xs text-teal-soft/70 underline underline-offset-2 transition-colors hover:text-teal-soft"
          >
            Why this works &rarr;
          </Link>
        </>
      )}

      {feeling === "skipped" && (
        <>
          <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            That&apos;s completely okay. You don&apos;t need to know how you feel right now. You still showed up, and that matters.
          </p>
        </>
      )}

      {feeling === "harder" && !repeatedHarder && (
        <>
          <h2 className="text-xl font-light text-cream">Thank you for being honest.</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Sometimes exercises bring things to the surface. That&apos;s not failure - it means your body is processing. Be gentle with yourself right now.
          </p>

          {/* Gentle alternative */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-cream-dim/60">Would a gentler exercise help?</p>
            <Link
              href={gentle.href}
              className="rounded-full border border-teal/15 bg-deep/60 px-4 py-1.5 text-xs font-medium text-teal-soft transition-colors hover:border-teal/30 hover:bg-deep/80 active:scale-[0.97]"
            >
              Try {gentle.label}
            </Link>
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
            This doesn&apos;t mean you&apos;re broken - it means your body might need different support right now.
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3">
        {feeling === "harder" && !repeatedHarder && (
          <Link
            href="/crisis"
            className="w-56 rounded-xl bg-candle/15 px-8 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
          >
            Crisis resources
          </Link>
        )}
        <button
          onClick={onDone}
          className="w-56 rounded-xl bg-teal/15 px-8 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25"
        >
          Return home
        </button>
        {(feeling === "better" || feeling === "same") && (
          <div className="mt-2">
            <ShareCard technique={technique} category={resolvedCategory} />
          </div>
        )}
      </div>
    </div>
  );
}
