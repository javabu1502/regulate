"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWakeLock } from "@/hooks/useWakeLock";
import { BodyScanIcon } from "@/components/Icons";

import AftercareFlow from "@/components/AftercareFlow";
import SessionProgressBar from "@/components/SessionProgressBar";
import { voiceGuidance } from "@/lib/voice-guidance";
import { useAudioGuide } from "@/hooks/useAudioGuide";
import { haptics } from "@/lib/haptics";
import { ambientAudio, type AmbientSound } from "@/lib/ambient-audio";
import PresenceCue from "@/components/PresenceCue";
import EscapeHatch from "@/components/EscapeHatch";

// ─── Body regions ───────────────────────────────────────────────────

interface BodyRegion {
  id: string;
  name: string;
  instruction: string;
  yRange: [number, number]; // top %, bottom % on the SVG body
}

const fullRegions: BodyRegion[] = [
  { id: "head", name: "Head & Face", instruction: "Soften your forehead. Unclench your jaw. Let your eyes rest.", yRange: [0, 12] },
  { id: "neck", name: "Neck & Shoulders", instruction: "Let your shoulders drop away from your ears. Release the back of your neck.", yRange: [12, 22] },
  { id: "chest", name: "Chest & Heart", instruction: "Notice your heartbeat. Breathe into the space around it. Soften.", yRange: [22, 35] },
  { id: "belly", name: "Belly", instruction: "Let your belly be soft. No holding. Just breathing.", yRange: [35, 48] },
  { id: "arms", name: "Arms & Hands", instruction: "Unclench your fists. Let your fingers relax. Feel the warmth in your palms.", yRange: [22, 55] },
  { id: "hips", name: "Hips & Pelvis", instruction: "Release the muscles in your hips. Let your weight settle.", yRange: [48, 60] },
  { id: "legs", name: "Legs", instruction: "Soften your thighs. Let go of tension in your knees and calves.", yRange: [60, 82] },
  { id: "feet", name: "Feet & Ground", instruction: "Feel the ground beneath you. You are held. You are here.", yRange: [82, 100] },
];

const quickRegions: BodyRegion[] = [
  { id: "head", name: "Upper Body", instruction: "Soften your forehead, unclench your jaw. Let your shoulders drop. Breathe into your chest and let it soften.", yRange: [0, 35] },
  { id: "belly", name: "Core", instruction: "Let your belly be soft. Unclench your fists, relax your fingers. Feel the warmth in your palms.", yRange: [35, 55] },
  { id: "legs", name: "Lower Body", instruction: "Release the muscles in your hips. Soften your thighs and calves. Feel the ground beneath your feet.", yRange: [55, 100] },
];

type ScanMode = "quick" | "full";

const durationOptions = [3, 5, 10]; // minutes

// ─── Body SVG ───────────────────────────────────────────────────────

function BodyOutline({ activeRegion }: { activeRegion: string }) {
  const highlightY: Record<string, { y: number; height: number }> = {
    head: { y: 10, height: 40 },
    neck: { y: 45, height: 35 },
    chest: { y: 75, height: 50 },
    belly: { y: 120, height: 40 },
    arms: { y: 75, height: 100 },
    hips: { y: 155, height: 35 },
    legs: { y: 185, height: 90 },
    feet: { y: 270, height: 30 },
  };

  const hl = highlightY[activeRegion] || { y: 0, height: 0 };

  return (
    <svg viewBox="0 0 120 310" className="h-[280px] w-auto" fill="none">
      {/* Highlight glow */}
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="rgba(90,171,174,0.3)" />
          <stop offset="100%" stopColor="rgba(90,171,174,0)" />
        </radialGradient>
      </defs>
      <ellipse
        cx="60"
        cy={hl.y + hl.height / 2}
        rx="50"
        ry={hl.height / 1.5}
        fill="url(#glow)"
        className="transition-all duration-700"
      />

      {/* Head */}
      <ellipse cx="60" cy="28" rx="18" ry="22" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "head" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Neck */}
      <line x1="54" y1="50" x2="54" y2="62" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "neck" ? "text-teal-soft" : "text-slate-blue"}`} />
      <line x1="66" y1="50" x2="66" y2="62" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "neck" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Shoulders */}
      <path d="M54 62C54 62 40 65 28 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "neck" || activeRegion === "arms" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M66 62C66 62 80 65 92 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "neck" || activeRegion === "arms" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Torso */}
      <path d="M40 80L38 160" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${["chest", "belly", "hips"].includes(activeRegion) ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M80 80L82 160" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${["chest", "belly", "hips"].includes(activeRegion) ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Arms */}
      <path d="M28 80L14 145L20 175" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "arms" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M92 80L106 145L100 175" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "arms" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Hips */}
      <path d="M38 160L42 180" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "hips" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M82 160L78 180" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "hips" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M38 160H82" stroke="currentColor" strokeWidth="1.2" className={`transition-colors duration-500 ${activeRegion === "hips" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Legs */}
      <path d="M42 180L40 260" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "legs" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M78 180L80 260" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={`transition-colors duration-500 ${activeRegion === "legs" ? "text-teal-soft" : "text-slate-blue"}`} />
      {/* Feet */}
      <path d="M40 260L28 275H45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors duration-500 ${activeRegion === "feet" ? "text-teal-soft" : "text-slate-blue"}`} />
      <path d="M80 260L92 275H75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors duration-500 ${activeRegion === "feet" ? "text-teal-soft" : "text-slate-blue"}`} />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────

type Screen = "intro" | "session" | "complete";

export default function BodyScanPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");
  const [totalMinutes, setTotalMinutes] = useState(5);
  const [scanMode, setScanMode] = useState<ScanMode>("full");
  const [currentRegion, setCurrentRegion] = useState(0);
  const [regionElapsed, setRegionElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(true);
  const [voiceOn, setVoiceOn] = useState(() => voiceGuidance.isEnabled());
  const bodyScanAudio = useAudioGuide("body-scan");
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("off");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useWakeLock(screen === "session" && !isPaused);

  const regions = scanMode === "quick" ? quickRegions : fullRegions;
  const regionDuration = Math.floor((totalMinutes * 60) / regions.length);
  const region = regions[currentRegion];

  // ─── Timer ────────────────────────────────────────────────────

  const advanceRegion = useCallback(() => {
    const next = currentRegion + 1;
    if (next < regions.length) {
      haptics.transition();
      setCurrentRegion(next);
      setRegionElapsed(0);
    } else {
      haptics.complete();
      setScreen("complete");
    }
  }, [currentRegion]);

  useEffect(() => {
    if (screen !== "session" || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRegionElapsed((prev) => {
        if (prev + 1 >= regionDuration) {
          advanceRegion();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [screen, isPaused, regionDuration, advanceRegion]);

  // ─── Voice guidance ────────────────────────────────────────────

  // Stop voice + ambient on unmount
  useEffect(() => {
    return () => {
      voiceGuidance.stop();
      ambientAudio.stop();
    };
  }, []);

  useEffect(() => {
    if (screen === "session" && voiceOn) {
      // Play MP3 clip; quick scan uses quick-* filenames
      const quickMap: Record<string, string> = { head: "quick-upper", belly: "quick-core", legs: "quick-lower" };
      const filename = scanMode === "quick" ? quickMap[region.id] || region.id : region.id;
      bodyScanAudio.play(filename);
    }
  }, [currentRegion, screen]);

  useEffect(() => {
    if (screen === "complete") {
      voiceGuidance.stop();
    }
  }, [screen]);

  function startSession() {
    setCurrentRegion(0);
    setRegionElapsed(0);
    setIsPaused(false);
    setScreen("session");
  }

  // ─── INTRO ────────────────────────────────────────────────────

  if (screen === "intro") {
    return (
      <div key="intro" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 flex justify-center"><BodyScanIcon className="h-8 w-8 text-candle-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Body Scan</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim">
              Move your attention slowly through your body.<br />
              Notice. Soften. Let go.
            </p>
          </header>

          {/* Scan mode picker */}
          <div className="rounded-2xl border border-teal/15 bg-deep/60 p-6 backdrop-blur-sm">
            <p className="mb-4 text-center text-sm text-cream-dim">Scan depth</p>
            <div className="flex justify-center gap-3">
              {([
                { mode: "quick" as ScanMode, label: "Quick (3 regions)" },
                { mode: "full" as ScanMode, label: "Full (8 regions)" },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={`flex h-14 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-all duration-200 ${
                    scanMode === mode
                      ? "border-teal/50 bg-teal/15 text-teal-soft shadow-md shadow-teal/10"
                      : "border-slate-blue/50 bg-slate-blue/30 text-cream-dim hover:border-teal/30 hover:text-cream"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration picker */}
          <div className="mt-3 rounded-2xl border border-teal/15 bg-deep/60 p-6 backdrop-blur-sm">
            <p className="mb-4 text-center text-sm text-cream-dim">How long?</p>
            <div className="flex justify-center gap-3">
              {durationOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalMinutes(n)}
                  className={`flex h-14 w-18 items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200 ${
                    totalMinutes === n
                      ? "border-teal/50 bg-teal/15 text-teal-soft shadow-md shadow-teal/10"
                      : "border-slate-blue/50 bg-slate-blue/30 text-cream-dim hover:border-teal/30 hover:text-cream"
                  }`}
                >
                  {n} min
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-cream-dim/50">
              ~{Math.round((totalMinutes * 60) / regions.length)}s per region
            </p>
          </div>

          <button
            onClick={startSession}
            className="mt-6 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft backdrop-blur-sm transition-all duration-300 hover:bg-teal/30 active:scale-[0.98]"
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  // ─── SESSION ──────────────────────────────────────────────────

  if (screen === "session") {
    const progressPercent = ((currentRegion * regionDuration + regionElapsed) / (regions.length * regionDuration)) * 100;
    const regionRemaining = regionDuration - regionElapsed;

    return (
      <div
        key="session"
        className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-20 pt-6"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          setControlsHidden((h) => !h);
        }}
      >
        {/* Voice + ambient toggles */}
        <div className={`fixed left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-center gap-1.5 px-4 pt-3 pb-2 safe-top transition-opacity duration-300 ${controlsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <button
            onClick={() => {
              const next = voiceGuidance.toggle();
              setVoiceOn(next);
            }}
            className={`rounded-full px-2 py-1 text-[10px] transition-all ${
              voiceOn ? "bg-teal/20 text-teal-soft" : "text-cream-dim/30 hover:text-cream-dim/50"
            }`}
          >
            Voice
          </button>
          {(["rain", "ocean", "off"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s === "off" || ambientSound === s) { ambientAudio.stop(); setAmbientSound("off"); }
                else { ambientAudio.start(s); setAmbientSound(s); }
              }}
              className={`rounded-full px-2 py-1 text-[10px] transition-all ${
                ambientSound === s ? "bg-teal/20 text-teal-soft" : "text-cream-dim/30 hover:text-cream-dim/50"
              }`}
            >
              {s === "off" ? "Quiet" : s === "rain" ? "Rain" : "Ocean"}
            </button>
          ))}
        </div>

        {/* Session progress bar */}
        <div className={`mb-2 mt-2 w-full max-w-md px-6 transition-opacity duration-300 ${controlsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <SessionProgressBar current={currentRegion + 1} total={regions.length} />
        </div>

        {/* Region dots */}
        <div className={`mb-6 mt-2 flex items-center gap-2 transition-opacity duration-300 ${controlsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {regions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < currentRegion ? "w-3 bg-teal-soft/50" : i === currentRegion ? "w-5 bg-teal-soft" : "w-2 bg-slate-blue/40"
              }`}
            />
          ))}
        </div>

        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          {/* Body outline */}
          <BodyOutline activeRegion={region.id} />

          {/* Region info */}
          <div className="mt-6 text-center">
            <h2 className="text-xl font-light text-cream">{region.name}</h2>
            <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-cream-dim">
              {region.instruction}
            </p>
            <p className="mt-4 font-mono text-sm text-cream-dim/40">{regionRemaining}s</p>
          </div>

          {/* Advance region - large, bottom-reachable */}
          <button
            onClick={advanceRegion}
            className="mt-6 w-full max-w-[200px] rounded-2xl border border-teal/20 bg-deep/60 py-4 text-sm text-cream-dim transition-colors hover:border-teal/40 hover:text-cream active:scale-[0.98]"
          >
            Next region
          </button>
        </div>

        {/* Controls */}
        <div className={`fixed bottom-20 flex items-center gap-6 px-5 transition-opacity duration-300 ${controlsHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-teal/20 bg-deep/80 text-cream-dim transition-colors hover:text-cream"
          >
            {isPaused ? (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M5 3L15 9L5 15V3Z" fill="currentColor" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
            )}
          </button>
          <button onClick={() => { setScreen("intro"); setIsPaused(false); }} className="text-xs text-cream-dim/40 transition-colors hover:text-cream-dim">End</button>
        </div>

        <PresenceCue active={!isPaused} />

        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 px-6 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-lg text-cream/80">Paused</p>
              <button onClick={() => setIsPaused(false)} className="mt-4 rounded-xl bg-teal/20 px-6 py-2.5 text-sm text-teal-soft hover:bg-teal/30">Resume</button>
            </div>
          </div>
        )}

        <EscapeHatch />
      </div>
    );
  }

  // ─── COMPLETE ─────────────────────────────────────────────────

  if (screen === "complete") {
    return (
      <div key="complete" className="animate-screen-enter flex min-h-screen flex-col items-center justify-center px-5">
        <AftercareFlow
          technique="Body Scan"
          exerciseId={scanMode === "quick" ? "quick-body-scan" : "full-body-scan"}
          exerciseHref="/body-scan"
          onDone={() => router.push("/")}
          learnLink="/learn#body-scan"
        />
      </div>
    );
  }

  return null;
}
