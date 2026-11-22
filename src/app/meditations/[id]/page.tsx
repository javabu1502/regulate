"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// Recordings land at public/audio/meditations/<id>.mp3 (see MEDITATION_SCRIPTS.md).
// The player probes the file itself, so a meditation becomes playable the
// moment its recording exists — no code change needed.
type AudioState = "loading" | "ready" | "unavailable";

export default function MeditationPlayerPage() {
  const params = useParams();
  const id = params.id as string;
  const meditation = getMeditationById(id);
  const audioSrc = meditation?.audioSrc ?? `/audio/meditations/${id}.mp3`;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<AudioState>("loading");
  const [ambientSound, setAmbientSound] = useState<AmbientSound | "off">("off");
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(meditation?.durationSec ?? 0);
  // Where this meditation was left, so an interrupted one does not restart
  // from zero. Matters most for the sleep tracks.
  const [resumeFrom, setResumeFrom] = useState(0);

  const positionKey = `regulate-meditation-pos-${id}`;

  // Probe whether the recording exists. A media element left pointing at a
  // 404 can hang in "loading" without firing error, so we check with an
  // explicit fetch (which also warms the service worker's audio cache).
  useEffect(() => {
    if (!meditation) return;
    let cancelled = false;
    fetch(audioSrc, { headers: { Range: "bytes=0-1" } })
      .then((r) => {
        if (!cancelled) setAudioState(r.ok ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setAudioState("unavailable");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(positionKey) || 0);
      if (Number.isFinite(saved) && saved > 5) setResumeFrom(saved);
    } catch { /* */ }
  }, [positionKey]);

  // Create the audio element
  useEffect(() => {
    if (!meditation) return;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioSrc;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        // Pick up where this was left, unless it was nearly finished.
        try {
          const saved = Number(localStorage.getItem(positionKey) || 0);
          if (saved > 5 && saved < audio.duration - 10) {
            audio.currentTime = saved;
            setCurrentTime(saved);
          }
        } catch { /* */ }
      }
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      try {
        localStorage.setItem(positionKey, String(Math.floor(audio.currentTime)));
      } catch { /* */ }
    };
    const onEnded = () => {
      setIsPlaying(false);
      ambientAudio.stop();
      setIsComplete(true);
      // Finished, so there is nothing to resume.
      try {
        localStorage.removeItem(positionKey);
      } catch { /* */ }
    };
    const onError = () => setAudioState("unavailable");
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc, positionKey]);

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
    const audio = audioRef.current;
    if (!audio || audioState !== "ready") return;
    if (audio.paused) {
      audio.play().catch(() => setAudioState("unavailable"));
    } else {
      audio.pause();
    }
  }, [audioState]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || audioState !== "ready" || duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = fraction * duration;
      setCurrentTime(audio.currentTime);
    },
    [audioState, duration],
  );

  const handleSkipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioState !== "ready") return;
    audio.currentTime = Math.max(0, audio.currentTime - 15);
    setCurrentTime(audio.currentTime);
  }, [audioState]);

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

  // ─── Completion screen ───────────────────────────────────────────
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

  const hasAudio = audioState === "ready";
  const progress = duration > 0 ? currentTime / duration : 0;

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

          {/* Say so rather than silently jumping into the middle. */}
          {resumeFrom > 5 && !isPlaying && currentTime > 5 && audioState === "ready" && (
            <p className="mt-6 text-xs text-cream-dim/50">
              Picking up at {formatTime(currentTime)}
              <button
                onClick={() => {
                  const audio = audioRef.current;
                  if (audio) audio.currentTime = 0;
                  setCurrentTime(0);
                  setResumeFrom(0);
                  try { localStorage.removeItem(positionKey); } catch { /* */ }
                }}
                className="ml-2 underline underline-offset-2 transition-colors hover:text-cream-dim"
              >
                start over
              </button>
            </p>
          )}

          {/* Transport controls, only once there is something to play */}
          {audioState !== "unavailable" && (
          <div className="mt-10 flex items-center justify-center gap-6">
            {/* Skip back 15s */}
            <button
              onClick={handleSkipBack}
              disabled={!hasAudio}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                hasAudio
                  ? "text-cream-dim/50 hover:text-cream-dim"
                  : "text-cream-dim/15 cursor-not-allowed"
              }`}
              aria-label="Back 15 seconds"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <text x="12" y="15.5" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none">15</text>
              </svg>
            </button>

            {/* Play / pause */}
            <button
              onClick={handlePlayPause}
              disabled={!hasAudio}
              className={`flex h-16 w-16 items-center justify-center rounded-full border transition-all ${
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

            {/* Spacer to keep play button centered */}
            <div className="h-10 w-10" aria-hidden="true" />
          </div>
          )}

          {/* Nothing to play yet */}
          {audioState === "unavailable" && (
            <p className="mx-auto mt-8 max-w-[280px] text-xs leading-relaxed text-cream-dim/40">
              This one is not recorded yet. The breathing, grounding, somatic,
              and SOS tools are all ready if you need something now.
            </p>
          )}

          {/* Progress bar */}
          {audioState !== "unavailable" && (
          <div className="mt-6">
            <div
              onClick={handleSeek}
              className={`mx-auto w-full max-w-[240px] py-2 ${hasAudio ? "cursor-pointer" : ""}`}
              aria-hidden="true"
            >
              <div className="h-1 w-full overflow-hidden rounded-full bg-cream-dim/10">
                <div
                  className="h-full rounded-full bg-teal/40 transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-cream-dim/25">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          )}

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
