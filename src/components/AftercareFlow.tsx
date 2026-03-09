"use client";

import { useState } from "react";
import Link from "next/link";

type Feeling = "better" | "same" | "harder";

interface AftercareFlowProps {
  technique: string;
  onDone: () => void;
}

/**
 * Post-session aftercare flow shown after completing any module.
 * Asks how the user feels, responds appropriately, and logs to journal.
 */
export default function AftercareFlow({ technique, onDone }: AftercareFlowProps) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);

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
  }

  // Step 1: Ask how they feel
  if (!feeling) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-light text-cream">How do you feel?</h2>
        <p className="mt-2 text-sm text-cream-dim">No wrong answer.</p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-[260px]">
          <button
            onClick={() => handleFeeling("better")}
            className="w-full rounded-2xl bg-teal/20 py-4 text-sm font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
          >
            Better
          </button>
          <button
            onClick={() => handleFeeling("same")}
            className="w-full rounded-2xl border border-slate-blue/30 bg-deep/60 py-4 text-sm font-medium text-cream-dim transition-all hover:border-teal/20 active:scale-[0.98]"
          >
            About the same
          </button>
          <button
            onClick={() => handleFeeling("harder")}
            className="w-full rounded-2xl border border-candle/15 bg-candle/5 py-4 text-sm font-medium text-candle-soft transition-all hover:bg-candle/10 active:scale-[0.98]"
          >
            Harder than before
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Respond based on feeling
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      {feeling === "better" && (
        <>
          <h2 className="text-xl font-light text-cream">You showed up for yourself.</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Even a small shift matters. Notice what&apos;s different.
          </p>
        </>
      )}

      {feeling === "same" && (
        <>
          <h2 className="text-xl font-light text-cream">That&apos;s okay.</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Sometimes regulation is subtle. The fact that you tried is what matters. Your nervous system is learning even when it doesn&apos;t feel like it.
          </p>
        </>
      )}

      {feeling === "harder" && (
        <>
          <h2 className="text-xl font-light text-cream">Thank you for being honest.</h2>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
            Sometimes exercises bring things to the surface. That&apos;s not failure — it means your body is processing. Be gentle with yourself right now.
          </p>
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
      </div>
    </div>
  );
}
