"use client";

import { useState, useEffect, type ReactNode } from "react";
import { isPremium, purchasePremium, PRICE } from "@/lib/premium";

interface PremiumGateProps {
  feature: string;
  children: ReactNode;
}

export default function PremiumGate({ feature, children }: PremiumGateProps) {
  const [premium, setPremiumState] = useState(false);
  const [checking, setChecking] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    setPremiumState(isPremium());
    setChecking(false);
  }, []);

  async function handleUnlock() {
    setPurchasing(true);
    try {
      const success = await purchasePremium();
      if (success) {
        setPremiumState(true);
      }
    } finally {
      setPurchasing(false);
    }
  }

  if (checking) return null;

  if (premium) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-2xl border border-slate-blue/20 bg-deep/40 p-5">
      <div className="flex items-start gap-3">
        {/* Lock icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-blue/15">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-cream-dim/50"
          >
            <rect
              x="3"
              y="7"
              width="10"
              height="7"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cream">Unlock with Regulate+</p>
          <p className="mt-1 text-xs leading-relaxed text-cream-dim/50">{feature}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          onClick={handleUnlock}
          disabled={purchasing}
          className="w-full rounded-xl bg-teal/15 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {purchasing ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" strokeLinecap="round" />
              </svg>
              Processing...
            </span>
          ) : (
            `Unlock - ${PRICE} one-time, yours forever`
          )}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-cream-dim/30">
          Every crisis tool stays free. Always.
        </p>
      </div>
    </div>
  );
}
