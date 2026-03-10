"use client";

import Link from "next/link";

interface SafetyCheckProps {
  onSafe: () => void;
  onNeedSupport?: () => void;
}

export default function SafetyCheck({ onSafe, onNeedSupport }: SafetyCheckProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-xl font-light text-cream">Are you safe right now?</h2>
        <p className="mt-2 text-sm text-cream-dim">
          There&apos;s no wrong answer. Just check in with yourself.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onSafe}
            className="w-full rounded-2xl border border-teal/20 bg-teal/10 py-5 text-left px-5 transition-all hover:border-teal/35 active:scale-[0.98]"
          >
            <p className="text-base font-medium text-teal-soft">Yes, I&apos;m safe</p>
            <p className="mt-0.5 text-xs text-cream-dim/50">I&apos;m okay to continue on my own</p>
          </button>

          <button
            onClick={onNeedSupport || onSafe}
            className="w-full rounded-2xl border border-candle/20 bg-candle/8 py-5 text-left px-5 transition-all hover:border-candle/35 active:scale-[0.98]"
          >
            <p className="text-base font-medium text-candle">I&apos;m not sure</p>
            <p className="mt-0.5 text-xs text-cream-dim/50">I could use some support right now</p>
          </button>
        </div>

        {/* Crisis resources - always visible */}
        <div className="mt-8 rounded-2xl border border-slate-blue/20 bg-deep/40 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/40">
            If you need to talk to someone
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="tel:988"
              className="flex items-center justify-between rounded-xl border border-slate-blue/20 bg-deep/60 px-4 py-3 transition-colors hover:border-teal/20"
            >
              <div>
                <p className="text-sm font-medium text-cream">988 Lifeline</p>
                <p className="text-xs text-cream-dim/50">Call or text, 24/7</p>
              </div>
              <span className="text-xs text-teal-soft">Call</span>
            </a>
            <a
              href="sms:741741&body=HOME"
              className="flex items-center justify-between rounded-xl border border-slate-blue/20 bg-deep/60 px-4 py-3 transition-colors hover:border-teal/20"
            >
              <div>
                <p className="text-sm font-medium text-cream">Crisis Text Line</p>
                <p className="text-xs text-cream-dim/50">Text HOME to 741741</p>
              </div>
              <span className="text-xs text-teal-soft">Text</span>
            </a>
          </div>
        </div>

        {/* Find a therapist */}
        <div className="mt-4 rounded-2xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-2 text-xs text-cream-dim/50">
            Talking to a professional can make a real difference.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://www.psychologytoday.com/us/therapists"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-blue/20 bg-deep/60 px-4 py-3 transition-colors hover:border-teal/20"
            >
              <div>
                <p className="text-sm font-medium text-cream">Find a therapist</p>
                <p className="text-xs text-cream-dim/50">Psychology Today directory</p>
              </div>
              <span className="text-xs text-teal-soft">Open</span>
            </a>
            <a
              href="https://www.openpathcollective.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-blue/20 bg-deep/60 px-4 py-3 transition-colors hover:border-teal/20"
            >
              <div>
                <p className="text-sm font-medium text-cream">Affordable therapy</p>
                <p className="text-xs text-cream-dim/50">Open Path Collective - $30-$80/session</p>
              </div>
              <span className="text-xs text-teal-soft">Open</span>
            </a>
          </div>
        </div>

        <Link
          href="/crisis"
          className="mt-4 inline-block text-xs text-cream-dim/30 transition-colors hover:text-cream-dim"
        >
          More crisis resources
        </Link>
      </div>
    </div>
  );
}
