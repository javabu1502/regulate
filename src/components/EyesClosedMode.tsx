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
      aria-label="Dim the screen and be guided by voice"
      className={`rounded-full px-2 py-1 text-[10px] text-cream-dim/30 transition-colors hover:text-cream-dim/50 ${className}`}
    >
      Eyes closed
    </button>
  );
}
