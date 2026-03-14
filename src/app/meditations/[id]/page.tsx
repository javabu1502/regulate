"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMeditationById } from "@/lib/meditations";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";

const ambientOptions: { key: AmbientSound | "off"; label: string }[] = [
  { key: "rain", label: "Rain" },
  { key: "ocean", label: "Ocean" },
  { key: "forest", label: "Forest" },
  { key: "off", label: "Quiet" },
];

export default function MeditationPlayerPage() {
  const params = useParams();
  const id = params.id as string;
  const meditation = getMeditationById(id);

  const [ambientSound, setAmbientSound] = useState<AmbientSound | "off">("off");
  const [isComplete, setIsComplete] = useState(false);

  // Placeholder state for future audio player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const hasAudio = meditation?.audioSrc !== undefined;

  // Cleanup ambient audio on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const handleAmbientChange = useCallback(
    (sound: AmbientSound | "off") => {
      if (sound === ambientSound) return;
      setAmbientSound(sound);
      if (sound === "off") {
        ambientAudio.stop();
      } else {
        ambientAudio.start(sound);
      }
    },
    [ambientSound],
  );

  const handlePlayPause = useCallback(() => {
    if (!hasAudio) return;
    setIsPlaying((p) => !p);
    // Future: actual audio playback
  }, [hasAudio]);

  // Format seconds to m:ss
  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!meditation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-cream-dim/60">Meditation not found.</p>
        <Link
          href="/meditations"
          className="mt-4 text-xs text-teal-soft/60 hover:text-teal-soft"
        >
          Back to meditations
        </Link>
      </div>
    );
  }

  // ─── Completion screen (future) ──────────────────────────────────
  if (isComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-midnight px-5">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
            <svg
              className="h-6 w-6 text-teal-soft"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-light text-cream">Well done</h2>
          <p className="mt-2 text-xs text-cream-dim/50">
            Take a moment before you move on.
          </p>
          <Link
            href="/meditations"
            className="mt-8 inline-block rounded-xl bg-teal/10 px-6 py-3 text-sm text-teal-soft transition-colors hover:bg-teal/20"
          >
            Back to meditations
          </Link>
        </div>
      </div>
    );
  }

  // ─── Player screen ──────────────────────────────────────────────

  const progress = meditation.durationSec > 0 ? currentTime / meditation.durationSec : 0;

  return (
    <div className="flex min-h-screen flex-col bg-midnight px-5 pb-12 pt-10">
      {/* Back button */}
      <Link
        href="/meditations"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Meditations
      </Link>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center">
          {/* Category */}
          <p className="mb-2 text-[10px] uppercase tracking-widest text-cream-dim/30">
            {meditation.category}
          </p>

          {/* Title */}
          <h1 className="text-xl font-light tracking-tight text-cream">
            {meditation.title}
          </h1>

          {/* Description */}
          <p className="mt-2 text-xs text-cream-dim/50">
            {meditation.description}
          </p>

          {/* Duration */}
          <p className="mt-1 text-[11px] text-cream-dim/30">
            {meditation.duration}
          </p>

          {/* Play button */}
          <div className="mt-10">
            <button
              onClick={handlePlayPause}
              disabled={!hasAudio}
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition-all ${
                hasAudio
                  ? "border-teal/30 bg-teal/15 text-teal-soft hover:border-teal/50 hover:bg-teal/25"
                  : "border-cream-dim/10 bg-cream-dim/5 text-cream-dim/20 cursor-not-allowed"
              }`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                // Pause icon
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                // Play icon (slightly offset right for optical centering)
                <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              )}
            </button>
          </div>

          {/* Coming soon message */}
          {!hasAudio && (
            <p className="mt-4 text-xs text-cream-dim/30">
              This meditation is being recorded. Check back soon.
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-6">
            <div className="mx-auto h-1 w-full max-w-[240px] overflow-hidden rounded-full bg-cream-dim/10">
              <div
                className="h-full rounded-full bg-teal/40 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-cream-dim/25">
              {formatTime(currentTime)} / {formatTime(meditation.durationSec)}
            </p>
          </div>

          {/* Ambient sound selector */}
          <div className="mt-10">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-cream-dim/25">
              Ambient Sound
            </p>
            <div className="flex items-center justify-center gap-1.5">
              {ambientOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleAmbientChange(opt.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                    ambientSound === opt.key
                      ? "bg-teal/15 text-teal-soft"
                      : "text-cream-dim/30 hover:text-cream-dim/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
