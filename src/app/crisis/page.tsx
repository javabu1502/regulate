"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CustomCrisisLine {
  name: string;
  number: string;
  textNumber?: string;
}

export default function CrisisPage() {
  const [customLine, setCustomLine] = useState<CustomCrisisLine | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("regulate-custom-crisis");
      if (stored) setCustomLine(JSON.parse(stored));
    } catch { /* */ }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-cream">Crisis Resources</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            If you or someone you know is in crisis, these services are available 24/7.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {/* Custom crisis line */}
          {customLine && (
            <div className="rounded-2xl border-2 border-candle/30 bg-candle/8 p-5 shadow-sm shadow-candle/5">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-candle/60">Your crisis line</p>
              <h3 className="text-sm font-medium text-cream">{customLine.name}</h3>
              <div className="mt-3 flex gap-2">
                <a
                  href={`tel:${customLine.number.replace(/\s/g, "")}`}
                  className="flex-1 rounded-xl bg-candle/15 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
                >
                  Call {customLine.number}
                </a>
                {customLine.textNumber && (
                  <a
                    href={`sms:${customLine.textNumber.replace(/\s/g, "")}`}
                    className="flex-1 rounded-xl border border-candle/20 py-3 text-center text-sm text-candle-soft transition-colors hover:bg-candle/10"
                  >
                    Text {customLine.textNumber}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-candle/15 bg-candle/5 p-5">
            <h3 className="text-sm font-medium text-cream">988 Suicide & Crisis Lifeline</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Free, confidential support for people in distress.</p>
            <div className="mt-3 flex gap-2">
              <a
                href="tel:988"
                className="flex-1 rounded-xl bg-candle/15 py-3 text-center text-sm font-medium text-candle transition-colors hover:bg-candle/25"
              >
                Call 988
              </a>
              <a
                href="sms:988"
                className="flex-1 rounded-xl border border-candle/20 py-3 text-center text-sm text-candle-soft transition-colors hover:bg-candle/10"
              >
                Text 988
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <h3 className="text-sm font-medium text-cream">Crisis Text Line</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Text-based crisis counseling, anytime.</p>
            <p className="mt-3 text-sm text-teal-soft">Text HOME to 741741</p>
          </div>

          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <h3 className="text-sm font-medium text-cream">International Association for Suicide Prevention</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Find a crisis center in your country.</p>
            <a
              href="https://www.iasp.info/resources/Crisis_Centres/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-teal-soft underline underline-offset-2"
            >
              Find your local crisis line
            </a>
          </div>

          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-5">
            <h3 className="text-sm font-medium text-cream">SAMHSA National Helpline</h3>
            <p className="mt-1 text-xs text-cream-dim/60">Free referral and information service for mental health and substance use.</p>
            <a
              href="tel:18006624357"
              className="mt-3 inline-block text-sm text-teal-soft"
            >
              1-800-662-4357
            </a>
          </div>
        </div>

        {/* Find a therapist */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Find a therapist</p>
          <div className="flex flex-col gap-3">
            <a
              href="https://www.psychologytoday.com/us/therapists"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-teal/15 bg-deep/60 p-5 transition-colors hover:border-teal/30"
            >
              <h3 className="text-sm font-medium text-cream">Psychology Today</h3>
              <p className="mt-1 text-xs text-cream-dim/60">Search therapists by specialty, insurance, and location.</p>
            </a>
            <a
              href="https://www.openpathcollective.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-teal/15 bg-deep/60 p-5 transition-colors hover:border-teal/30"
            >
              <h3 className="text-sm font-medium text-cream">Open Path Collective</h3>
              <p className="mt-1 text-xs text-cream-dim/60">Affordable therapy — sessions from $30 to $80.</p>
            </a>
            <a
              href="https://www.betterhelp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-teal/15 bg-deep/60 p-5 transition-colors hover:border-teal/30"
            >
              <h3 className="text-sm font-medium text-cream">BetterHelp</h3>
              <p className="mt-1 text-xs text-cream-dim/60">Online therapy from your phone. Financial aid available.</p>
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-teal/5 p-4 text-center">
          <p className="text-xs leading-relaxed text-cream-dim/50">
            You are not alone. Reaching out takes strength.
          </p>
        </div>
      </div>
    </div>
  );
}
