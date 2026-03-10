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

/**
 * Post-session aftercare flow shown after completing any module.
 * Asks how the user feels, responds appropriately, and logs to journal.
 */
function getAlternativeTechniques(technique: string): { label: string; href: string }[] {
  const t = technique.toLowerCase();
  if (t.includes("breathing"))
    return [
      { label: "Grounding", href: "/grounding" },
      { label: "Somatic", href: "/somatic" },
    ];
  if (t.includes("grounding"))
    return [
      { label: "Breathing", href: "/breathing" },
      { label: "Body scan", href: "/body-scan" },
    ];
  if (t.includes("body"))
    return [
      { label: "Somatic", href: "/somatic" },
      { label: "Breathing", href: "/breathing" },
    ];
  return [
    { label: "Breathing", href: "/breathing" },
    { label: "Grounding", href: "/grounding" },
  ];
}

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
      setShowSafetyCheck(true);
    }
  }

  // Step 1: Ask how they feel — body-based cards for accessibility in distress
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
          Skip — I can&apos;t tell right now
        </button>
      </div>
    );
  }

  // Safety check screen — shown before the "heavier" result screen
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
          {learnLink && (
            <Link
              href={learnLink}
              className="mt-4 text-xs text-teal-soft/70 underline underline-offset-2 transition-colors hover:text-teal-soft"
            >
              Learn why this works
            </Link>
          )}
        </>
      )}

      {feeling === "same" && (
        <>
          <h2 className="text-xl font-light text-cream">{completionHeading}</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Sometimes regulation is subtle. The fact that you tried is what matters. Your nervous system is learning even when it doesn&apos;t feel like it.
          </p>
          {learnLink && (
            <Link
              href={learnLink}
              className="mt-4 text-xs text-teal-soft/70 underline underline-offset-2 transition-colors hover:text-teal-soft"
            >
              Learn why this works
            </Link>
          )}
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

      {feeling === "harder" && (
        <>
          <h2 className="text-xl font-light text-cream">Thank you for being honest.</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Sometimes exercises bring things to the surface. That&apos;s not failure — it means your body is processing. Be gentle with yourself right now.
          </p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-cream-dim/70">Sometimes a different approach helps</p>
            <div className="flex gap-2">
              {getAlternativeTechniques(technique).map((alt) => (
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
        </>
      )}

      <div className="mt-10 flex flex-col items-center gap-3">
        {feeling === "harder" && (
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
