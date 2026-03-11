"use client";

import { useState } from "react";
import Link from "next/link";
import { WaveIcon } from "@/components/Icons";

// ─── Accordion helper ───────────────────────────────────────────────

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-teal/12 bg-deep/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-teal/5"
      >
        <span className="pr-4 text-[15px] font-medium text-cream">
          {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-cream-dim/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-teal/8 px-6 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Technique references ───────────────────────────────────────────

const techniques = [
  {
    name: "Physiological Sigh",
    detail:
      "Double inhale through the nose followed by extended exhale. Demonstrated as the most efficient real-time stress reduction technique in a controlled study.",
    ref: "Balban et al., Cell Reports Medicine, 2023; Huberman Lab, Stanford",
  },
  {
    name: "Bilateral Stimulation (Butterfly Hug)",
    detail:
      "Alternating left-right tactile stimulation at approximately 1 Hz. Used within EMDR protocol and as a standalone self-regulation tool.",
    ref: "Shapiro (1989); Artigas et al. (2000); EMDR research base",
  },
  {
    name: "Vagal Maneuvers",
    detail:
      "Techniques engaging the oculocardiac reflex and Valsalva mechanism to stimulate vagal tone and shift autonomic balance toward parasympathetic dominance.",
    ref: "Porges (2011); vagal tone literature",
  },
  {
    name: "Havening Touch",
    detail:
      "Gentle self-applied touch generating delta waves, facilitating the depotentiation of encoded threat responses in the amygdala.",
    ref: "Ruden (2011); delta wave production research",
  },
  {
    name: "Pendulation",
    detail:
      "Guided oscillation between areas of activation and resource in the body, allowing titrated discharge of survival energy without overwhelm.",
    ref: "Levine, Somatic Experiencing framework",
  },
  {
    name: "Orienting",
    detail:
      "Slow, deliberate engagement of the visual field to activate the social engagement system and signal environmental safety via neuroception.",
    ref: "Levine; Porges, neuroception (2004)",
  },
  {
    name: "Extended Exhale Breathing",
    detail:
      "Exhale-dominant breathing patterns that leverage respiratory sinus arrhythmia to increase parasympathetic activation and reduce heart rate.",
    ref: "RSA literature; Bernardi et al. (2001)",
  },
  {
    name: "Coherence Breathing",
    detail:
      "Breathing at approximately 6 breaths per minute to optimize heart rate variability and promote autonomic balance.",
    ref: "Lehrer & Gevirtz (2014); HRV biofeedback research",
  },
];

// ─── Page ───────────────────────────────────────────────────────────

export default function CliniciansPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-20 pt-12">
      <div className="w-full max-w-2xl">
        {/* Back nav */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-y-px"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>

        {/* ─── Header ──────────────────────────────────────────── */}
        <header className="mb-14 mt-10 text-center">
          <div className="mb-4 flex justify-center">
            <WaveIcon className="h-10 w-10 text-teal-soft/70" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream">
            For Clinicians
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-dim">
            The clinical foundation behind Regulate
          </p>
        </header>

        {/* ─── 1. Why Somatic Tools in an App? ─────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            Why Somatic Tools in an App?
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
            <p>
              When the prefrontal cortex goes offline during panic, cognitive
              interventions fail. Regulate provides body-based interventions your
              clients can access between sessions - tools that work
              precisely because they don&apos;t require the thinking brain.
            </p>
            <div className="rounded-xl border border-teal/12 bg-teal/5 px-5 py-4">
              <p className="text-sm leading-relaxed text-cream-dim">
                An app cannot replace the therapeutic relationship. Regulate is
                designed to <span className="text-cream">extend</span>{" "}
                therapeutic work - giving clients a structured, somatic
                toolkit they can reach for between sessions when dysregulation
                arises.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 2. Theoretical Framework ────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            Theoretical Framework
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Polyvagal Theory
              </p>
              <p className="text-xs text-cream-dim/50">Stephen Porges</p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Regulate maps body states to the autonomic ladder -
                ventral vagal (safe/social), sympathetic (fight/flight), and
                dorsal vagal (shutdown/collapse). The app&apos;s state-check
                asks clients to identify their current position on this ladder
                before selecting an intervention.
              </p>
            </div>
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Somatic Experiencing
              </p>
              <p className="text-xs text-cream-dim/50">Peter Levine</p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                The principles of pendulation (oscillating between activation
                and resource), orienting (engaging neuroception of safety), and
                titration (approaching activation in small doses) are embedded
                throughout the exercise design.
              </p>
            </div>
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                EMDR Bilateral Stimulation
              </p>
              <p className="text-xs text-cream-dim/50">Francine Shapiro</p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                The butterfly hug and tapping exercises use alternating
                left-right stimulation at a validated rate of approximately 1
                Hz, consistent with the bilateral stimulation protocol in EMDR
                therapy.
              </p>
            </div>
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Window of Tolerance
              </p>
              <p className="text-xs text-cream-dim/50">Daniel Siegel</p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Exercises are designed to target specific arousal states -
                hyperarousal (sympathetic activation) and hypoarousal (dorsal
                vagal collapse) - with the goal of returning clients to
                their window of tolerance.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 3. Technique Library ────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            Technique Library &amp; Clinical References
          </h2>
          <div className="space-y-2">
            {techniques.map((t) => (
              <Accordion key={t.name} title={t.name}>
                <p className="text-sm leading-relaxed text-cream-dim">
                  {t.detail}
                </p>
                <p className="mt-3 text-xs text-cream-dim/50">
                  <span className="text-cream-dim/70">References:</span>{" "}
                  {t.ref}
                </p>
              </Accordion>
            ))}
          </div>
        </section>

        {/* ─── 4. State-Matched Interventions ──────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            State-Matched Interventions
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-cream-dim">
            Regulate doesn&apos;t offer generic calming. It asks &ldquo;How is
            your body right now?&rdquo; and matches interventions to autonomic
            state.
          </p>
          <div className="space-y-3">
            <div className="rounded-2xl border border-candle/15 bg-candle/5 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-candle">
                Panicking
              </p>
              <p className="text-xs text-cream-dim/50">
                Sympathetic hyperarousal
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Rapid parasympathetic activation - physiological sigh,
                extended exhale, bilateral stimulation. The goal is immediate
                downregulation.
              </p>
            </div>
            <div className="rounded-2xl border border-candle/10 bg-candle/3 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-candle-soft">
                Anxious
              </p>
              <p className="text-xs text-cream-dim/50">
                Mild sympathetic activation
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Sustained calming with interoceptive engagement -
                coherence breathing, body scan, grounding. Building awareness
                alongside regulation.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-blue/30 bg-slate-blue/10 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Shutdown
              </p>
              <p className="text-xs text-cream-dim/50">Dorsal vagal</p>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Gentle activation - orienting, pendulation, light
                movement. Critically,{" "}
                <span className="text-cream">not further calming</span>, which
                would deepen the dorsal state.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-teal/8 px-5 py-4">
            <p className="text-sm leading-relaxed text-cream">
              This distinction - that shutdown needs different
              intervention than panic - is what makes Regulate clinically
              sound.
            </p>
          </div>
        </section>

        {/* ─── 5. Free vs Premium ──────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            What&apos;s Free vs. Premium
          </h2>
          <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
            <ul className="space-y-4 text-sm leading-relaxed text-cream-dim">
              <li className="flex items-start gap-3">
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-teal-soft/60"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 10L9 14L15 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="text-cream">
                    Every crisis tool is free. Forever.
                  </span>{" "}
                  No paywall gates a client in distress.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-teal-soft/60"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 10L9 14L15 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="text-cream">$2.99 one-time</span> for
                  personalized insights. No subscriptions. No recurring charges.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="mt-1 h-4 w-4 shrink-0 text-teal-soft/60"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 10L9 14L15 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  You can recommend Regulate to every client regardless of
                  financial situation.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ─── 6. How to Recommend ─────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            How to Recommend
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Share the referral link
              </p>
              <p className="mt-2 text-sm text-cream-dim">
                Send your client to{" "}
                <Link
                  href="/refer"
                  className="text-teal-soft underline underline-offset-2 transition-colors hover:text-teal"
                >
                  regulate-liart.vercel.app/refer
                </Link>
              </p>
              <p className="mt-2 text-xs text-cream-dim/50">
                They&apos;ll see a &ldquo;Your therapist recommended
                Regulate&rdquo; onboarding path tailored for referrals.
              </p>
            </div>
            <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
              <p className="mb-1 text-[15px] font-medium text-cream">
                Therapist summary export
              </p>
              <p className="mt-2 text-sm text-cream-dim">
                Clients can download a pattern summary from the app to share in
                sessions - showing which exercises they used, how
                frequently, and their self-reported state before and after.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 7. Privacy & Safety ─────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-cream">
            Privacy &amp; Safety
          </h2>
          <div className="rounded-2xl border border-teal/12 bg-deep/50 px-6 py-5">
            <ul className="space-y-3 text-sm leading-relaxed text-cream-dim">
              <li className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-teal-soft/50"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M10 2L4 5V9.5C4 13.6 6.5 17.2 10 18C13.5 17.2 16 13.6 16 9.5V5L10 2Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="text-cream">No accounts, no cloud, no tracking.</span>{" "}
                  All data is stored locally on the client&apos;s device.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-teal-soft/50"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M10 2L4 5V9.5C4 13.6 6.5 17.2 10 18C13.5 17.2 16 13.6 16 9.5V5L10 2Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="text-cream">Crisis resources (988)</span> are
                  always accessible from any screen.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-teal-soft/50"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M10 2L4 5V9.5C4 13.6 6.5 17.2 10 18C13.5 17.2 16 13.6 16 9.5V5L10 2Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="text-cream">Safety check</span> shown after
                  difficult sessions to assess client state.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-teal/10 pt-8">
          <div className="text-center">
            <p className="text-sm text-cream-dim">
              Questions?{" "}
              <a
                href="mailto:hello@regulate.app"
                className="text-teal-soft underline underline-offset-2 transition-colors hover:text-teal"
              >
                hello@regulate.app
              </a>
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <Link
                href="/refer"
                className="text-cream-dim/60 transition-colors hover:text-cream-dim"
              >
                Therapist Referral Page
              </Link>
              <span className="text-cream-dim/20">|</span>
              <Link
                href="/"
                className="text-cream-dim/60 transition-colors hover:text-cream-dim"
              >
                Home
              </Link>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <a
              href="tel:988"
              className="text-[11px] text-cream-dim/25 underline underline-offset-2 hover:text-cream-dim/50"
            >
              988 Suicide &amp; Crisis Lifeline
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
