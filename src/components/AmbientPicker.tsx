"use client";

import { useState } from "react";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";

// ─── Ambient sound picker ───────────────────────────────────────────
// Every option used to sit in the row at once. With five sounds plus the
// voice and eyes-closed controls that came to seven items across the bottom
// of a session, which collided with the "I need help" link and left the
// busiest part of the screen at the moment someone is least able to read it.
//
// Collapsed it shows one word: whatever is playing. Open it shows the rest.

const LABELS: Record<string, string> = {
  off: "Quiet",
  rain: "Rain",
  ocean: "Ocean",
  forest: "Forest",
  "white-noise": "Noise",
};

export default function AmbientPicker({
  value,
  onChange,
  options = ["off", "rain", "ocean", "forest", "white-noise"],
  className = "",
}: {
  value: AmbientSound | "off";
  onChange: (next: AmbientSound | "off") => void;
  options?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function pick(s: string) {
    if (s === "off") {
      ambientAudio.stop();
      onChange("off");
    } else {
      ambientAudio.start(s as AmbientSound);
      onChange(s as AmbientSound);
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Ambient sound: ${LABELS[value] ?? "Quiet"}. Change it.`}
        className={`rounded-full px-2.5 py-2 text-[10px] transition-colors ${
          value === "off"
            ? "text-cream-dim/40 hover:text-cream-dim/60"
            : "bg-teal/20 text-teal-soft"
        } ${className}`}
      >
        {value === "off" ? "Sound" : LABELS[value]}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {options.map((s) => (
        <button
          key={s}
          onClick={() => pick(s)}
          aria-pressed={value === s}
          className={`rounded-full px-2.5 py-2 text-[10px] transition-colors ${
            value === s ? "bg-teal/20 text-teal-soft" : "text-cream-dim/50 hover:text-cream-dim/70"
          }`}
        >
          {LABELS[s] ?? s}
        </button>
      ))}
    </div>
  );
}
