"use client";

import { useEffect, useState } from "react";
import { voiceGuidance } from "@/lib/voice-guidance";

const ASKED_KEY = "regulate-voice-offered";

/**
 * Asks once, on the first exercise someone opens, whether they want the
 * spoken guidance. Voice is off by default and the in-session toggles are
 * easy to miss, so without this most people never discover it.
 *
 * Shows only when voice has never been turned on and the question has never
 * been asked. Either answer is remembered, so it never appears again.
 */
export default function VoiceOffer({ onChange }: { onChange?: (on: boolean) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ASKED_KEY)) return;
      if (voiceGuidance.isEnabled()) return;
      setShow(true);
    } catch {
      /* storage unavailable: just don't ask */
    }
  }, []);

  function answer(on: boolean) {
    try {
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* ignore */
    }
    if (on) voiceGuidance.setEnabled(true);
    setShow(false);
    onChange?.(on);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-5 pb-6 safe-bottom">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-teal/25 bg-deep/95 p-5 backdrop-blur-sm">
        <p className="text-sm font-medium text-cream">Want a voice to guide you?</p>
        <p className="mt-1 text-xs leading-relaxed text-cream-dim/60">
          A recorded voice reads each step aloud so you can close your eyes. You
          can change this any time in settings.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => answer(true)}
            className="flex-1 rounded-xl bg-teal/20 py-2.5 text-sm text-teal-soft transition-colors hover:bg-teal/30"
          >
            Yes, use the voice
          </button>
          <button
            onClick={() => answer(false)}
            className="rounded-xl px-4 py-2.5 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
