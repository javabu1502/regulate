"use client";

import Link from "next/link";
import { WaveIcon } from "@/components/Icons";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-12">
      <div className="w-full max-w-md">
        {/* Back */}
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-1 text-xs text-cream-dim/60 transition-colors hover:text-cream-dim"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Settings
        </Link>

        {/* Logo + name */}
        <div className="flex flex-col items-center text-center">
          <WaveIcon className="mb-4 h-12 w-12 text-teal-soft" />
          <h1 className="text-2xl font-semibold tracking-tight text-cream">
            Regulate
          </h1>
          <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-cream-dim">
            When panic hits, your thinking brain goes offline. Regulate works with your body - because that's what actually helps.
          </p>
        </div>

        {/* What it is */}
        <div className="mt-10 space-y-6">
          <div>
            <h2 className="text-sm font-medium text-cream">What is Regulate?</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/70">
              Regulate is a collection of somatic and nervous system regulation tools - breathing exercises, grounding techniques, body-based practices, and more. Everything is designed to be usable during a panic attack, when reading instructions feels impossible.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-cream">How it works</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/70">
              Your nervous system has different modes - sometimes it's activated (fight/flight), sometimes it shuts down (freeze). Different tools help with different states. Regulate asks how your body feels and recommends the right approach.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-cream">Privacy</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/70">
              Your data never leaves your device. No accounts, no cloud, no tracking. Everything is stored locally in your browser.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-cream">Not a replacement for care</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim/70">
              Regulate supports your nervous system between therapy sessions. It is not a replacement for professional mental health care. If you are in crisis, please contact the{" "}
              <a href="tel:988" className="text-cream-dim underline underline-offset-2">
                988 Suicide & Crisis Lifeline
              </a>.
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/learn"
            className="text-xs text-teal-soft/70 transition-colors hover:text-teal-soft"
          >
            Understanding your nervous system &rarr;
          </Link>
          <Link
            href="/clinicians"
            className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
          >
            For clinicians
          </Link>
        </div>
      </div>
    </div>
  );
}
