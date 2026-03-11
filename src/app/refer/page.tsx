"use client";

import Link from "next/link";
import { WaveIcon } from "@/components/Icons";

export default function ReferPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-12">
      <main className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center text-center">
          <WaveIcon className="mb-4 h-10 w-10 text-teal-soft/70" />
          <h1 className="text-2xl font-semibold tracking-tight text-cream">
            Your therapist recommended Regulate
          </h1>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-relaxed text-cream-dim">
            Somatic tools for panic, anxiety, and nervous system regulation. Built on polyvagal theory. Free for every crisis.
          </p>
        </div>

        {/* Explanation */}
        <div className="mb-8 rounded-2xl border border-teal/15 bg-deep/60 p-6">
          <h2 className="text-base font-medium text-cream">
            Why somatic tools?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            When panic hits, your thinking brain goes offline. Regulate works with your body - bilateral tapping, breathing, grounding, and somatic techniques that work when thinking can&apos;t.
          </p>
        </div>

        {/* What's included */}
        <div className="mb-8 rounded-2xl border border-slate-blue/20 bg-deep/40 p-6">
          <h2 className="mb-4 text-base font-medium text-cream">
            What&apos;s included
          </h2>
          <ul className="flex flex-col gap-3">
            {[
              "SOS crisis flow",
              "11 somatic exercises",
              "Guided breathing",
              "Body scan",
              "5-4-3-2-1 grounding",
              "Safety plan",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-cream-dim">
                <svg className="h-4 w-4 shrink-0 text-teal-soft/60" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-cream-dim/50">
            All free, forever.
          </p>
        </div>

        {/* Pricing note */}
        <div className="mb-8 rounded-2xl border border-candle/10 bg-candle/5 px-6 py-4">
          <p className="text-sm text-cream-dim">
            <span className="font-medium text-candle-soft">$3 one-time</span> for personalized insights. Everything else is free.
          </p>
        </div>

        {/* Privacy */}
        <div className="mb-10 rounded-2xl border border-slate-blue/20 bg-deep/40 px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-teal-soft/50" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L4 5V9.5C4 13.6 6.5 17.2 10 18C13.5 17.2 16 13.6 16 9.5V5L10 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm leading-relaxed text-cream-dim">
              No accounts. No cloud. No tracking. Your data stays on your device.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/onboarding?ref=therapist"
            className="flex w-full max-w-[300px] items-center justify-center rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
          >
            Get started
          </Link>
          <Link
            href="/"
            className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/70"
          >
            Already using Regulate? Go to home
          </Link>
        </div>

        {/* Crisis line */}
        <div className="mt-12 flex justify-center">
          <a href="tel:988" className="text-[11px] text-cream-dim/25 underline underline-offset-2 hover:text-cream-dim/50">
            988 Suicide &amp; Crisis Lifeline
          </a>
        </div>
      </main>
    </div>
  );
}
