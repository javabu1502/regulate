"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ambientAudio } from "@/lib/ambient-audio";

// ─── Types ──────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  label: string;
  href: string;
  category: string;
}

interface MediaLink {
  title: string;
  url: string;
}

interface ContactData {
  name: string;
  phone: string;
  label: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const KEYS = {
  exercises: "regulate-toolkit-exercises",
  media: "regulate-toolkit-media",
  grounding: "regulate-toolkit-grounding",
  helper: "regulate-toolkit-helper-instructions",
  contacts: "my_person",
  warnings: "regulate-toolkit-warnings",
  reasons: "regulate-toolkit-reasons",
} as const;

// ─── Storage helpers ────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function loadString(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || "";
}

function loadContacts(): ContactData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.contacts);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Old single-contact format
    if (parsed && parsed.name && parsed.phone) {
      return [{ name: parsed.name, phone: parsed.phone, label: "other" }];
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Page ───────────────────────────────────────────────────────────

export default function ToolkitPage() {
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [helperMode, setHelperMode] = useState(false);
  const [helperStep, setHelperStep] = useState(1);
  const [ambientPlaying, setAmbientPlaying] = useState<"ocean" | "rain" | null>(null);

  // Data state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [media, setMedia] = useState<MediaLink[]>([]);
  const [grounding, setGrounding] = useState<string[]>([]);
  const [helperInstructions, setHelperInstructions] = useState("");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);

  // Edit form state
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [groundingInput, setGroundingInput] = useState("");

  // Load data
  useEffect(() => {
    setExercises(load<Exercise[]>(KEYS.exercises, []));
    setMedia(load<MediaLink[]>(KEYS.media, []));
    setGrounding(load<string[]>(KEYS.grounding, []));
    setHelperInstructions(loadString(KEYS.helper));
    setContacts(loadContacts());
    setWarnings(load<string[]>(KEYS.warnings, []));
    setReasons(load<string[]>(KEYS.reasons, []));
    setLoaded(true);
  }, []);

  // Auto-enter edit mode on first visit (no data yet)
  useEffect(() => {
    if (!loaded) return;
    const hasData = exercises.length > 0 || media.length > 0 || grounding.length > 0 || helperInstructions || warnings.length > 0 || reasons.length > 0;
    if (!hasData) setEditing(true);
  }, [loaded, exercises.length, media.length, grounding.length, helperInstructions, warnings.length, reasons.length]);

  // ─── Save helpers ───────────────────────────────────────────────

  function toggleExercise(ex: Exercise) {
    const exists = exercises.some((e) => e.id === ex.id);
    const next = exists ? exercises.filter((e) => e.id !== ex.id) : [...exercises, ex];
    setExercises(next);
    localStorage.setItem(KEYS.exercises, JSON.stringify(next));
  }

  function addMedia() {
    if (!mediaTitle.trim() || !mediaUrl.trim()) return;
    const next = [...media, { title: mediaTitle.trim(), url: mediaUrl.trim() }];
    setMedia(next);
    localStorage.setItem(KEYS.media, JSON.stringify(next));
    setMediaTitle("");
    setMediaUrl("");
  }

  function removeMedia(index: number) {
    const next = media.filter((_, i) => i !== index);
    setMedia(next);
    localStorage.setItem(KEYS.media, JSON.stringify(next));
  }

  function addGrounding() {
    if (!groundingInput.trim()) return;
    const next = [...grounding, groundingInput.trim()];
    setGrounding(next);
    localStorage.setItem(KEYS.grounding, JSON.stringify(next));
    setGroundingInput("");
  }

  function removeGrounding(index: number) {
    const next = grounding.filter((_, i) => i !== index);
    setGrounding(next);
    localStorage.setItem(KEYS.grounding, JSON.stringify(next));
  }

  function saveHelperInstructions(text: string) {
    setHelperInstructions(text);
    if (text.trim()) {
      localStorage.setItem(KEYS.helper, text);
    } else {
      localStorage.removeItem(KEYS.helper);
    }
  }

  function addWarning(text: string) {
    if (!text.trim()) return;
    const next = [...warnings, text.trim()];
    setWarnings(next);
    localStorage.setItem(KEYS.warnings, JSON.stringify(next));
  }

  function removeWarning(index: number) {
    const next = warnings.filter((_, i) => i !== index);
    setWarnings(next);
    localStorage.setItem(KEYS.warnings, JSON.stringify(next));
  }

  function updateWarning(index: number, value: string) {
    const next = warnings.map((w, i) => (i === index ? value : w));
    setWarnings(next);
    localStorage.setItem(KEYS.warnings, JSON.stringify(next));
  }

  function addReason(text: string) {
    if (!text.trim()) return;
    const next = [...reasons, text.trim()];
    setReasons(next);
    localStorage.setItem(KEYS.reasons, JSON.stringify(next));
  }

  function removeReason(index: number) {
    const next = reasons.filter((_, i) => i !== index);
    setReasons(next);
    localStorage.setItem(KEYS.reasons, JSON.stringify(next));
  }

  function updateReason(index: number, value: string) {
    const next = reasons.map((r, i) => (i === index ? value : r));
    setReasons(next);
    localStorage.setItem(KEYS.reasons, JSON.stringify(next));
  }

  const exitHelperMode = useCallback(() => {
    if (ambientPlaying) {
      ambientAudio.stop();
      setAmbientPlaying(null);
    }
    setHelperMode(false);
    setHelperStep(1);
  }, [ambientPlaying]);

  const toggleAmbient = useCallback((sound: "ocean" | "rain") => {
    if (ambientPlaying === sound) {
      ambientAudio.stop();
      setAmbientPlaying(null);
    } else {
      ambientAudio.start(sound);
      setAmbientPlaying(sound);
    }
  }, [ambientPlaying]);

  if (!loaded) return null;

  // ─── Helper Mode (Guided Caregiver Flow) ────────────────────────

  if (helperMode) {
    const TOTAL_STEPS = 5;

    const StepDots = () => (
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i + 1 === helperStep ? "bg-teal" : "bg-slate-blue/30"
            }`}
          />
        ))}
      </div>
    );

    const NavBar = () => (
      <div className="flex items-center justify-between">
        {helperStep > 1 ? (
          <button
            onClick={() => setHelperStep(helperStep - 1)}
            className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={exitHelperMode}
          className="flex h-10 w-10 items-center justify-center rounded-full text-cream-dim/50 transition-colors hover:bg-cream/5 hover:text-cream-dim"
          aria-label="Close helper mode"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-midnight">
        <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-12 pt-6">
          <div className="mx-auto w-full max-w-md flex-1">
            <NavBar />
            <div className="mb-8 mt-4">
              <StepDots />
            </div>

            {/* ── Step 1: Introduction ──────────────────────────── */}
            {helperStep === 1 && (
              <div className="flex flex-1 flex-col">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-cream">
                  You&apos;re helping someone who&apos;s overwhelmed
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-cream-dim/70">
                  Here&apos;s what to do. Go at their pace, not yours.
                </p>

                {helperInstructions && (
                  <div className="mt-8 rounded-2xl border border-candle/20 bg-candle/8 px-5 py-5">
                    <p className="mb-3 text-sm font-medium text-candle-soft/80">
                      They&apos;ve written this for you:
                    </p>
                    <p className="text-base leading-relaxed text-candle-soft">
                      {helperInstructions}
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-10">
                  <button
                    onClick={() => setHelperStep(2)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-teal px-6 py-4 text-lg font-semibold text-midnight transition-colors hover:bg-teal/90"
                  >
                    Start
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Create calm ───────────────────────────── */}
            {helperStep === 2 && (
              <div className="flex flex-1 flex-col">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-cream">
                  Create calm around them
                </h1>
                <div className="mt-8 flex flex-col gap-5">
                  <p className="text-lg leading-relaxed text-cream-dim/70">
                    Speak slowly and softly. Lower your voice.
                  </p>
                  <p className="text-lg leading-relaxed text-cream-dim/70">
                    Reduce noise and light if you can.
                  </p>
                  <p className="text-lg leading-relaxed text-cream-dim/70">
                    Don&apos;t ask them to explain what happened.
                  </p>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => toggleAmbient("ocean")}
                    className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-base font-medium transition-colors ${
                      ambientPlaying === "ocean"
                        ? "border-teal/40 bg-teal/20 text-teal-soft"
                        : "border-slate-blue/20 bg-deep/60 text-cream-dim hover:border-teal/20"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                      <path d="M2 10C4 8 6 12 8 10C10 8 12 12 14 10C16 8 18 12 18 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {ambientPlaying === "ocean" ? "Ocean playing" : "Ocean sounds"}
                  </button>
                  <button
                    onClick={() => toggleAmbient("rain")}
                    className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-base font-medium transition-colors ${
                      ambientPlaying === "rain"
                        ? "border-teal/40 bg-teal/20 text-teal-soft"
                        : "border-slate-blue/20 bg-deep/60 text-cream-dim hover:border-teal/20"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                      <path d="M7 4L6 8M11 3L10 7M15 5L14 9M5 10L4 14M9 9L8 13M13 10L12 14M7 15L6 19M11 14L10 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    {ambientPlaying === "rain" ? "Rain playing" : "Rain sounds"}
                  </button>
                </div>

                <div className="mt-auto pt-10">
                  <button
                    onClick={() => setHelperStep(3)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-teal px-6 py-4 text-lg font-semibold text-midnight transition-colors hover:bg-teal/90"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Breathe with them ─────────────────────── */}
            {helperStep === 3 && (
              <div className="flex flex-1 flex-col">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-cream">
                  Breathe with them
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-cream-dim/70">
                  Match their breathing first, then slowly start to lengthen your exhales.
                </p>

                {/* Breathing pacer */}
                <div className="my-10 flex flex-col items-center gap-4">
                  <div className="relative flex h-[140px] w-[140px] items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full border-2 border-teal/60"
                      style={{
                        animation: "helperBreathe 10s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="text-sm font-medium text-teal-soft/80"
                      style={{
                        animation: "helperBreatheLabel 10s ease-in-out infinite",
                      }}
                    >
                      breathe
                    </span>
                  </div>
                  <p className="text-xs text-cream-dim/40">
                    In for 4 &middot; Out for 6
                  </p>
                </div>
                <style>{`
                  @keyframes helperBreathe {
                    0%, 100% { transform: scale(1); }
                    40% { transform: scale(1.3); }
                    /* Hold briefly at peak then contract */
                  }
                  @keyframes helperBreatheLabel {
                    0%, 100% { opacity: 0.5; }
                    20% { opacity: 1; }
                    40% { opacity: 1; }
                    60% { opacity: 0.5; }
                  }
                `}</style>

                <p className="text-lg leading-relaxed text-cream-dim/70">
                  They can follow your breathing, or just listen to you breathe.
                </p>

                <div className="mt-auto flex items-center gap-3 pt-10">
                  <button
                    onClick={() => setHelperStep(4)}
                    className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-teal px-6 py-4 text-lg font-semibold text-midnight transition-colors hover:bg-teal/90"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setHelperStep(4)}
                    className="flex min-h-[56px] items-center justify-center rounded-2xl px-5 py-4 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Ground them ──────────────────────────── */}
            {helperStep === 4 && (
              <div className="flex flex-1 flex-col">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-cream">
                  Ground them gently
                </h1>
                <div className="mt-8 flex flex-col gap-5">
                  <div className="rounded-2xl border border-teal/15 bg-teal/5 px-5 py-4">
                    <p className="text-lg leading-relaxed text-cream">
                      Ask them: &ldquo;Can you feel your feet on the floor?&rdquo;
                    </p>
                  </div>
                  <div className="rounded-2xl border border-teal/15 bg-teal/5 px-5 py-4">
                    <p className="text-lg leading-relaxed text-cream">
                      Ask them: &ldquo;What&apos;s one thing you can see right now?&rdquo;
                    </p>
                  </div>
                  <p className="text-lg leading-relaxed text-cream-dim/70">
                    Don&apos;t rush. Wait for each answer.
                  </p>
                  <p className="text-lg leading-relaxed text-cream-dim/70">
                    If they can&apos;t talk, that&apos;s okay. Just sit with them.
                  </p>
                </div>

                <div className="mt-auto pt-10">
                  <button
                    onClick={() => setHelperStep(5)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-teal px-6 py-4 text-lg font-semibold text-midnight transition-colors hover:bg-teal/90"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 5: You're doing great ───────────────────── */}
            {helperStep === 5 && (
              <div className="flex flex-1 flex-col">
                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-cream">
                  You&apos;re doing great
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-cream-dim/70">
                  Stay with them. There&apos;s no rush.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-cream-dim/70">
                  When they&apos;re ready, they might want to:
                </p>

                {exercises.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3">
                    {exercises.map((ex) => (
                      <Link
                        key={ex.id}
                        href={ex.href}
                        onClick={() => {
                          if (ambientPlaying) {
                            ambientAudio.stop();
                            setAmbientPlaying(null);
                          }
                        }}
                        className="flex min-h-[56px] items-center justify-center rounded-2xl border border-teal/20 bg-teal/10 px-6 py-4 text-base font-medium text-teal-soft transition-colors hover:border-teal/40 hover:bg-teal/15"
                      >
                        {ex.label}
                      </Link>
                    ))}
                  </div>
                )}

                {media.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    {media.map((m, i) => (
                      <a
                        key={i}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-coral/20 bg-coral/10 px-6 py-4 text-base font-medium text-coral transition-colors hover:border-coral/40 hover:bg-coral/15"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                          <path d="M4 3L14 9L4 15V3Z" fill="currentColor" opacity="0.6" />
                        </svg>
                        {m.title}
                      </a>
                    ))}
                  </div>
                )}

                <p className="mt-6 text-lg leading-relaxed text-cream-dim/50">
                  Or just sit together quietly. That&apos;s enough.
                </p>

                <div className="mt-auto pt-10">
                  <button
                    onClick={exitHelperMode}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-teal px-6 py-4 text-lg font-semibold text-midnight transition-colors hover:bg-teal/90"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit Mode ────────────────────────────────────────────────────

  if (editing) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-midnight px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Home
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-xl border border-slate-blue/20 px-4 py-2 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
              >
                Print
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl bg-teal/20 px-4 py-2 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30"
              >
                Done
              </button>
            </div>
          </div>

          <header className="mb-8 mt-6">
            <h1 className="text-xl font-semibold tracking-tight text-cream">Build Your Panic Kit</h1>
            <p className="mt-2 text-sm text-cream-dim/60 leading-relaxed">
              This includes your safety plan. You can print it from here.
            </p>
            <p className="mt-1 text-sm text-cream-dim/60 leading-relaxed">
              Set this up now, while you&apos;re calm. When you&apos;re panicking, you won&apos;t have time
              to think — this page will be ready for you with exactly what you need.
            </p>
          </header>

          {/* ── My Go-To Exercises ────────────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">My go-to exercises</h2>
            {exercises.length === 0 ? (
              <div className="rounded-xl border border-slate-blue/20 bg-deep/60 p-4">
                <p className="text-sm text-cream-dim/50 leading-relaxed">
                  Complete an exercise and tap &ldquo;Add to toolkit&rdquo; when it helps.
                  Your favorites will show up here.
                </p>
                <Link href="/exercises" className="mt-3 inline-flex items-center gap-1 text-sm text-teal-soft/70 transition-colors hover:text-teal-soft">
                  Browse exercises
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/60 p-3">
                    <span className="flex-1 text-sm text-cream-dim">{ex.label}</span>
                    <button
                      onClick={() => toggleExercise(ex)}
                      className="shrink-0 text-xs text-cream-dim/30 transition-colors hover:text-coral"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <Link href="/exercises" className="mt-1 inline-flex items-center gap-1 text-xs text-teal-soft/70 transition-colors hover:text-teal-soft">
                  Browse more exercises
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            )}
          </section>

          {/* ── My Music & Videos ─────────────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">My music &amp; videos</h2>
            <p className="mb-3 text-xs text-cream-dim/40">Spotify or YouTube links that calm you down.</p>
            {media.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {media.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/60 p-3">
                    <span className="flex-1 truncate text-sm text-cream-dim">{m.title}</span>
                    <button
                      onClick={() => removeMedia(i)}
                      className="shrink-0 text-xs text-cream-dim/30 transition-colors hover:text-coral"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Title (e.g., My calm playlist)"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <input
                type="url"
                placeholder="Spotify or YouTube URL"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <button
                onClick={addMedia}
                disabled={!mediaTitle.trim() || !mediaUrl.trim()}
                className="rounded-xl bg-teal/20 py-2.5 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </section>

          {/* ── Grounding Reminders ──────────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">My grounding reminders</h2>
            <p className="mb-3 text-xs text-cream-dim/40">Personal cues that bring you back. Things you can see, touch, or do right now.</p>
            {grounding.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {grounding.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/60 p-3">
                    <span className="flex-1 text-sm text-cream-dim">{g}</span>
                    <button
                      onClick={() => removeGrounding(i)}
                      className="shrink-0 text-xs text-cream-dim/30 transition-colors hover:text-coral"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Hold the smooth rock in my pocket"
                value={groundingInput}
                onChange={(e) => setGroundingInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGrounding()}
                className="flex-1 rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
              />
              <button
                onClick={addGrounding}
                disabled={!groundingInput.trim()}
                className="shrink-0 rounded-xl bg-teal/20 px-4 py-3 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </section>

          {/* ── Emergency Contacts ───────────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">My emergency contacts</h2>
            {contacts.length > 0 ? (
              <div className="mb-3 flex flex-col gap-2">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-blue/20 bg-deep/60 p-3 text-sm text-cream-dim">
                    {c.name} <span className="text-cream-dim/30">({c.phone})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-cream-dim/40">No contacts added yet.</p>
            )}
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-sm text-teal-soft/70 transition-colors hover:text-teal-soft"
            >
              Edit contacts in Settings
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </section>

          {/* ── Instructions for Others ──────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">Instructions for others</h2>
            <p className="mb-3 text-xs text-cream-dim/40">
              What helps when someone else is with you? They can read this on your toolkit page.
            </p>
            <textarea
              value={helperInstructions}
              onChange={(e) => saveHelperInstructions(e.target.value)}
              placeholder="e.g., Don't ask me questions. Just sit with me and put on ocean sounds."
              rows={4}
              className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none resize-none"
            />
          </section>

          {/* ── My Warning Signs ─────────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">My warning signs</h2>
            <p className="mb-3 text-xs text-cream-dim/40">How do you know you&apos;re starting to struggle?</p>
            {warnings.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={w}
                      onChange={(e) => updateWarning(i, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-blue/20 bg-deep/60 p-3 text-sm text-cream-dim focus:border-teal/30 focus:outline-none"
                    />
                    <button
                      onClick={() => removeWarning(i)}
                      className="shrink-0 text-xs text-cream-dim/30 transition-colors hover:text-coral"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                const next = [...warnings, ""];
                setWarnings(next);
                localStorage.setItem(KEYS.warnings, JSON.stringify(next));
              }}
              className="rounded-xl bg-teal/20 px-4 py-2.5 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30"
            >
              + Add warning sign
            </button>
          </section>

          {/* ── Reasons to Keep Going ─────────────────────── */}
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-cream-dim/40">Reasons to keep going</h2>
            {reasons.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => updateReason(i, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-blue/20 bg-deep/60 p-3 text-sm text-cream-dim focus:border-teal/30 focus:outline-none"
                    />
                    <button
                      onClick={() => removeReason(i)}
                      className="shrink-0 text-xs text-cream-dim/30 transition-colors hover:text-coral"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                const next = [...reasons, ""];
                setReasons(next);
                localStorage.setItem(KEYS.reasons, JSON.stringify(next));
              }}
              className="rounded-xl bg-teal/20 px-4 py-2.5 text-sm font-medium text-teal-soft transition-colors hover:bg-teal/30"
            >
              + Add reason
            </button>
          </section>

          <button
            onClick={() => setEditing(false)}
            className="mt-4 w-full rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-colors hover:bg-teal/30"
          >
            Save &amp; View Toolkit
          </button>
        </div>
      </div>
    );
  }

  // ─── Toolkit Mode (Panic View) ────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center bg-midnight px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl border border-slate-blue/20 px-4 py-2 text-sm text-cream-dim/50 transition-colors hover:text-cream-dim"
          >
            Edit
          </button>
        </div>

        {/* Reassurance header */}
        <header className="mb-10 mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-cream">
            You&apos;re going to be okay
          </h1>
          <p className="mt-3 text-sm text-cream-dim/50">
            This will pass. Use what helps.
          </p>
        </header>

        {/* ── Emergency Contacts ──────────────────────────── */}
        {contacts.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Call someone</h2>
            <div className="flex flex-col gap-3">
              {contacts.map((c, i) => (
                <a
                  key={i}
                  href={`tel:${c.phone}`}
                  className="flex min-h-[56px] items-center justify-center gap-3 rounded-2xl border border-teal/20 bg-deep/60 px-6 py-4 text-base font-medium text-cream transition-colors hover:border-teal/40"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-teal-soft">
                    <path d="M3.5 2.5C3.5 2.5 5 2 6 3.5L7 5.5C7 5.5 6 6.5 7 8.5C8 10.5 9.5 9.5 9.5 9.5L11.5 11C13 12 12.5 13.5 12.5 13.5C11.5 15 9 14.5 7 12.5C5 10.5 3 8 3.5 5.5C3.5 5.5 3.5 3.5 3.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Call {c.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Music & Videos ──────────────────────────────── */}
        {media.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Listen</h2>
            <div className="flex flex-col gap-3">
              {media.map((m, i) => (
                <a
                  key={i}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-coral/20 bg-coral/10 px-6 py-4 text-base font-medium text-coral transition-colors hover:border-coral/40 hover:bg-coral/15"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                    <path d="M4 3L14 9L4 15V3Z" fill="currentColor" opacity="0.6" />
                  </svg>
                  {m.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick Exercises (compact 2-col grid) ─────────── */}
        {exercises.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Try this</h2>
            <div className="grid grid-cols-2 gap-2">
              {exercises.map((ex) => (
                <Link
                  key={ex.id}
                  href={ex.href}
                  className="flex items-center justify-center rounded-2xl border border-teal/20 bg-teal/10 px-3 py-2.5 text-sm font-medium text-teal-soft transition-colors hover:border-teal/40 hover:bg-teal/15"
                >
                  {ex.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Grounding Reminders ─────────────────────────── */}
        {grounding.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Ground yourself</h2>
            <div className="flex flex-col gap-3">
              {grounding.map((g, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-candle/15 bg-candle/5 px-5 py-4 text-sm leading-relaxed text-candle-soft"
                >
                  {g}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Help Mode Button ───────────────────────────── */}
        <button
          onClick={() => { setHelperMode(true); setHelperStep(1); }}
          className="mb-8 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl border border-cream/15 bg-cream/8 px-6 py-4 text-base font-medium text-cream transition-colors hover:border-cream/25 hover:bg-cream/12"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
            <path d="M11 21C16.5228 21 21 16.5228 21 11C21 5.47715 16.5228 1 11 1C5.47715 1 1 5.47715 1 11C1 16.5228 5.47715 21 11 21Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 8.5C8.5 7.11929 9.61929 6 11 6C12.3807 6 13.5 7.11929 13.5 8.5C13.5 9.88071 12.3807 11 11 11V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="11" cy="15.5" r="0.75" fill="currentColor" />
          </svg>
          Someone with me? Help them help you
        </button>

        {/* ── Helper Instructions ─────────────────────────── */}
        {helperInstructions && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">For someone helping me</h2>
            <div className="rounded-2xl border border-cream/10 bg-cream/5 px-5 py-5 text-sm leading-relaxed text-cream/80">
              {helperInstructions}
            </div>
          </section>
        )}

        {/* ── Warning Signs ──────────────────────────────── */}
        {warnings.filter((w) => w.trim()).length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">My warning signs</h2>
            <div className="flex flex-col gap-2">
              {warnings.filter((w) => w.trim()).map((w, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-candle/15 bg-candle/5 px-5 py-3 text-sm leading-relaxed text-candle-soft"
                >
                  {w}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Reasons to Keep Going ──────────────────────── */}
        {reasons.filter((r) => r.trim()).length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-cream-dim/30">Reasons to keep going</h2>
            <div className="flex flex-col gap-2">
              {reasons.filter((r) => r.trim()).map((r, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-lavender/15 bg-lavender/5 px-5 py-3 text-sm leading-relaxed text-lavender"
                >
                  {r}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 988 Crisis Lifeline ─────────────────────────── */}
        <section className="mt-4 border-t border-slate-blue/15 pt-8">
          <a
            href="tel:988"
            className="flex min-h-[56px] items-center justify-center gap-3 rounded-2xl border border-cream/10 bg-deep/60 px-6 py-4 text-base font-medium text-cream transition-colors hover:border-cream/20"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-cream/60">
              <path d="M3.5 2.5C3.5 2.5 5 2 6 3.5L7 5.5C7 5.5 6 6.5 7 8.5C8 10.5 9.5 9.5 9.5 9.5L11.5 11C13 12 12.5 13.5 12.5 13.5C11.5 15 9 14.5 7 12.5C5 10.5 3 8 3.5 5.5C3.5 5.5 3.5 3.5 3.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            988 Suicide &amp; Crisis Lifeline
          </a>
          <p className="mt-3 text-center text-xs text-cream-dim/30">
            Call or text 988 &middot; Available 24/7
          </p>
        </section>
      </div>
    </div>
  );
}
