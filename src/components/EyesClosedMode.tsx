"use client";

import { useEffect, useState } from "react";
import { voiceGuidance } from "@/lib/voice-guidance";

/**
 * Lets someone put the screen away mid-session and be carried by the voice
 * and the haptic step cues instead.
 *
 * The pieces already existed separately: recorded voice for every step,
 * a haptic pulse on each transition, and a wake lock so the screen stays
 * alive. Nothing told anyone they could stop looking.
 *
 * Off unless asked for. Tapping anywhere brings the screen back, so there is
 * no way to get stuck in it.
 */
export default function EyesClosedMode({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);

  // Leaving the session should never leave the screen dark.
  useEffect(() => {
    return () => setOn(false);
  }, []);

  function enable() {
    // Without a voice this is just a black screen, so turn it on with it.
    if (!voiceGuidance.isEnabled()) {
      voiceGuidance.setEnabled(true);
    }
    setOn(true);
  }

  if (on) {
    return (
      <button
        onClick={() => setOn(false)}
        aria-label="Show the screen again"
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black pb-16 transition-opacity duration-700"
      >
        <span className="animate-fade-in text-[11px] text-cream-dim/20">
          Tap anywhere when you want the screen back
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={enable}
      aria-label="Turn the screen off and be guided by voice"
      className={`flex w-14 flex-col items-center gap-1 text-cream-dim/35 transition-colors hover:text-cream-dim/60 ${className}`}
    >
      {/* A closed eye, to sit with the other icons in the bar */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c3 4.5 6.7 6.5 10 6.5S19 16.5 22 12" />
        <path d="M4 16l-1.3 2M9 18.3L8.4 20.6M15 18.3l.6 2.3M20 16l1.3 2" />
      </svg>
      <span className="text-[9px] leading-none">Screen off</span>
    </button>
  );
}
