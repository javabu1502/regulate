"use client";

import { useEffect, useState } from "react";
import { voiceGuidance } from "@/lib/voice-guidance";

/**
 * Shared in-session voice toggle.
 * Reads the stored preference after mount so the static prerender stays stable,
 * then flips both the stored flag and the voiceGuidance singleton.
 */
export default function VoiceToggle({
  onChange,
  className = "",
}: {
  onChange?: (on: boolean) => void;
  className?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(voiceGuidance.isEnabled());
  }, []);

  return (
    <button
      onClick={() => {
        const next = voiceGuidance.toggle();
        setOn(next);
        onChange?.(next);
      }}
      aria-pressed={on}
      aria-label={on ? "Turn off voice guidance" : "Turn on voice guidance"}
      className={`rounded-full px-2 py-1 text-[10px] transition-colors ${
        on ? "bg-teal/20 text-teal-soft" : "text-cream-dim/30 hover:text-cream-dim/50"
      } ${className}`}
    >
      Voice
    </button>
  );
}
