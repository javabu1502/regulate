"use client";

import Link from "next/link";

// ─── The shell the three store-required pages share ─────────────────
// Apple needs a support URL and a privacy policy URL before a build can be
// submitted; Google needs the privacy policy. All three want to be readable
// in a browser by someone who has not installed anything, so they are plain
// pages rather than anything that depends on stored state.

/** One place to change it. It is published on the support page. */
export const SUPPORT_EMAIL = "jared@busker.consulting";

export const LAST_UPDATED = "23 November 2026";

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <div className="w-full max-w-md">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-1 text-xs text-cream-dim/60 transition-colors hover:text-cream-dim"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 4L7 10L13 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Settings
        </Link>

        <h1 className="text-xl font-light tracking-tight text-cream">{title}</h1>
        {intro && <p className="mt-2 text-sm leading-relaxed text-cream-dim/70">{intro}</p>}

        <div className="mt-8 space-y-7">{children}</div>

        <p className="mt-12 text-[11px] text-cream-dim/30">Last updated {LAST_UPDATED}.</p>
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-cream-dim/40">
        {heading}
      </h2>
      <div className="mt-2.5 space-y-2.5 text-sm leading-relaxed text-cream-dim/70">{children}</div>
    </section>
  );
}
