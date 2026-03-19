"use client";

import { useState } from "react";
import Link from "next/link";
import MicroExplanation from "@/components/MicroExplanation";

// ─── Exercise data ──────────────────────────────────────────────────

interface Exercise {
  name: string;
  description: string;
  href: string;
  time?: string;
  why?: string;
}

interface ExerciseGroup {
  label: string;
  exercises: Exercise[];
}

// ─── Feeling → recommended exercises ─────────────────────────────────

interface FeelingOption {
  key: string;
  label: string;
  subtext: string;
  exercises: string[];
}

const FEELINGS: FeelingOption[] = [
  {
    key: "calmer",
    label: "Anxious or tense",
    subtext: "Slow your nervous system down",
    exercises: ["Box Breathing", "4-7-8 Breathing", "Physiological Sigh", "Coherence", "Body Scan", "Self-Havening", "Gentle Swaying"],
  },
  {
    key: "grounded",
    label: "Racing thoughts",
    subtext: "Come back to your body and the present",
    exercises: ["5-4-3-2-1 Senses", "Body Grounding", "Object Grounding", "Orienting", "Body Scan"],
  },
  {
    key: "awake",
    label: "Frozen or numb",
    subtext: "Wake your body up gently",
    exercises: ["Body Shaking", "Air Punching", "Free Movement / Dancing", "Bilateral Tapping", "Butterfly Hug"],
  },
  {
    key: "sleepy",
    label: "Can\u2019t sleep",
    subtext: "Slow everything down for rest",
    exercises: ["4-7-8 Breathing", "Sleep Sequence", "Extended Exhale", "Body Scan"],
  },
  {
    key: "less-pain",
    label: "In pain",
    subtext: "Work with your body, not against it",
    exercises: ["Pendulation", "Body Scan", "Gentle Swaying", "Self-Havening"],
  },
];


// Goal labels kept for potential future use

const TIME_LABELS: { key: string; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "1-2", label: "1-2 min" },
  { key: "3-5", label: "3-5 min" },
  { key: "10+", label: "10+ min" },
];

/** Check if an exercise's time string matches the selected time filter */
function matchesTimeFilter(time: string | undefined, filter: string): boolean {
  if (filter === "any" || !time) return true;
  // Parse all numbers from the time string (e.g. "3-10 min" → [3, 10])
  const nums = time.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return true;

  if (filter === "1-2") {
    // At least one number is 1 or 2 (and not just 10/15 etc)
    return nums.some((n) => n >= 1 && n <= 2);
  }
  if (filter === "3-5") {
    return nums.some((n) => n >= 3 && n <= 5);
  }
  if (filter === "10+") {
    return nums.some((n) => n >= 10);
  }
  return true;
}

const exerciseGroups: ExerciseGroup[] = [
  {
    label: "Quick Reset (60 seconds)",
    exercises: [
      { name: "Physiological Sigh", description: "Two quick inhales, one long exhale — instant relief", href: "/breathing?pattern=sigh", time: "1 min", why: "The double inhale pops open collapsed air sacs in your lungs, and the long exhale activates your body's brake pedal." },
      { name: "30-Second Shake", description: "Shake your whole body — release tension fast", href: "/somatic?exercise=body-shaking", time: "30 sec" },
      { name: "Eye Press Reset", description: "Gentle pressure on closed eyes — slows heart rate", href: "/somatic?exercise=eye-press", time: "1 min" },
      { name: "Three Deep Breaths", description: "Just three slow breaths — that's all you need", href: "/breathing?pattern=extended-exhale", time: "1 min" },
    ],
  },
  {
    label: "Breathing",
    exercises: [
      { name: "Box Breathing", description: "Equal rhythm: in, hold, out, hold", href: "/breathing?pattern=box", time: "3 min", why: "The even rhythm gives your nervous system something predictable to follow — and predictability means safety." },
      { name: "4-7-8 Breathing", description: "Deep calm: in for 4, hold for 7, out for 8", href: "/breathing?pattern=478", time: "5 min", why: "That long exhale is the key — breathing out longer than you breathe in directly activates your calming nervous system." },
      { name: "Physiological Sigh", description: "Quick reset: two inhales, long exhale", href: "/breathing?pattern=sigh", time: "3 min" },
      { name: "Coherence", description: "Steady rhythm: 5 seconds in, 5 out", href: "/breathing?pattern=coherence", time: "5 min" },
      { name: "Extended Exhale", description: "Longer out-breath to slow everything down", href: "/breathing?pattern=extended-exhale", time: "3 min" },
    ],
  },
  {
    label: "Grounding",
    exercises: [
      { name: "5-4-3-2-1 Senses", description: "Use your senses to come back to now", href: "/grounding?type=sensory", time: "3-5 min", why: "When your brain is busy noticing real things around you, it can't stay stuck in anxious thoughts." },
      { name: "Body Grounding", description: "Feel your body's connection to the ground", href: "/grounding?type=body", time: "3 min" },
      { name: "Object Grounding", description: "Focus on something you can hold", href: "/grounding?type=object", time: "2 min" },
    ],
  },
  {
    label: "Somatic",
    exercises: [
      { name: "Bilateral Tapping", description: "Left-right rhythm to help your brain process", href: "/somatic?exercise=bilateral-tapping", time: "3-5 min", why: "Left-right rhythm mimics REM sleep processing — it helps your brain file away distressing experiences." },
      { name: "Gentle Swaying", description: "Rock gently, like the ocean", href: "/somatic?exercise=gentle-swaying", time: "3 min" },
      { name: "Body Shaking", description: "Shake it ALL out", href: "/somatic?exercise=body-shaking", time: "2-3 min", why: "Animals shake after danger passes to discharge stress hormones. Your body knows how to do this too." },
      { name: "Self-Havening", description: "Gentle self-touch for safety", href: "/somatic?exercise=havening", time: "3-5 min", why: "Gentle self-touch triggers delta waves in your brain — the same waves that appear in deep, restful sleep." },
      { name: "Butterfly Hug", description: "Cross your arms and tap", href: "/somatic?exercise=bilateral-tapping", time: "2-3 min" },
      { name: "Return to Safety", description: "Gentle re-orienting after feeling unsafe", href: "/somatic?exercise=return-to-safety", time: "3 min" },
      { name: "Orienting", description: "Slowly look around to signal safety", href: "/somatic?exercise=orienting", time: "2 min" },
      { name: "Humming / Voo Sound", description: "Deep vibration to calm your vagus nerve", href: "/somatic?exercise=humming", time: "3 min" },
      { name: "Vagus Nerve Massage", description: "Gentle pressure on calming points", href: "/somatic?exercise=vagus-nerve-massage", time: "2-3 min" },
      { name: "Eye Press Reset", description: "Gentle pressure on closed eyes to slow your heart", href: "/somatic?exercise=eye-press", time: "1-2 min" },
      { name: "Air Punching", description: "Let it OUT \u2014 punch hard, be fierce", href: "/somatic?exercise=air-punching", time: "2-3 min" },
      { name: "Bearing Down", description: "Engage your core against resistance", href: "/somatic?exercise=bearing-down", time: "1-2 min" },
      { name: "Free Movement / Dancing", description: "MOVE \u2014 dance like nobody\u2019s watching", href: "/somatic?exercise=dancing", time: "3-5 min" },
      { name: "Vestibular Eye Movement", description: "Slow eye tracking to settle your body", href: "/somatic?exercise=vestibular-eyes", time: "2-3 min" },
      { name: "Pendulation", description: "Shift attention between tension and comfort", href: "/somatic?exercise=pendulation", time: "5 min" },
    ],
  },
  {
    label: "Body & Mind",
    exercises: [
      { name: "Body Scan", description: "Notice your body, one area at a time", href: "/body-scan", time: "3-10 min", why: "Noticing without fixing. When you pay attention to your body without trying to change it, tension often releases on its own." },
      { name: "Affirmations", description: "Words that meet you where you are", href: "/affirmations", time: "2 min" },
    ],
  },
  {
    label: "Sleep",
    exercises: [
      { name: "Sleep Sequence", description: "Breathing and relaxation for restless nights", href: "/sleep", time: "10-15 min" },
    ],
  },
];

// Flat lookup for exercise details by name
const exerciseByName = new Map<string, Exercise>();
for (const g of exerciseGroups) {
  for (const ex of g.exercises) {
    if (!exerciseByName.has(ex.name)) exerciseByName.set(ex.name, ex);
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [activeFeeling, setActiveFeeling] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("any");
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Apply time filter to produce the visible groups (for "Browse all" section)
  const filteredGroups = exerciseGroups
    .map((group) => {
      const filtered = group.exercises.filter((ex) => matchesTimeFilter(ex.time, timeFilter));
      return { ...group, exercises: filtered };
    })
    .filter((group) => group.exercises.length > 0);

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <main className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Home
        </Link>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl font-light tracking-tight text-cream">
            Exercises
          </h1>
          <p className="mt-1.5 text-xs text-cream-dim/60">
            Everything in one place. Pick what feels right.
          </p>
        </header>

        {/* "How are you feeling?" — tap a feeling to see exercises that can help */}
        <div className="mb-6">
          <p className="mb-2.5 text-[10px] uppercase tracking-widest text-cream-dim/40">
            How are you feeling?
          </p>
          <div className="flex flex-col gap-2">
            {FEELINGS.map((feeling) => {
              const isActive = activeFeeling === feeling.key;
              return (
                <div key={feeling.key}>
                  <button
                    onClick={() => setActiveFeeling(isActive ? null : feeling.key)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-teal/30 bg-teal/10 text-cream"
                        : "border-slate-blue/15 bg-deep/40 text-cream-dim/60 hover:border-teal/20"
                    }`}
                  >
                    <div>
                      <span className="text-sm">{feeling.label}</span>
                      {isActive && (
                        <p className="mt-0.5 text-xs text-cream-dim/50">{feeling.subtext}</p>
                      )}
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 16 16" fill="none"
                      className={`shrink-0 text-cream-dim/40 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isActive && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pl-4">
                      {feeling.exercises.map((name) => {
                        const ex = exerciseByName.get(name);
                        if (!ex) return null;
                        return (
                          <Link
                            key={name}
                            href={ex.href}
                            className="text-sm text-teal-soft transition-colors hover:text-teal-soft/80"
                          >
                            {ex.name}{ex.time ? <span className="ml-1 text-[10px] text-cream-dim/30">{ex.time}</span> : null} &rarr;
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Browse all — with time filter */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-cream-dim/40">
            Browse all
          </p>
          <div className="flex gap-1.5">
            {TIME_LABELS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeFilter(t.key)}
                className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
                  timeFilter === t.key
                    ? "bg-teal/20 text-teal-soft border-teal/30"
                    : "bg-deep/40 text-cream-dim/40 border-slate-blue/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise groups (collapsible) */}
        <div className="flex flex-col gap-3">
          {filteredGroups.map((group) => {
            const isOpen = expandedGroup === group.label;
            return (
              <section key={group.label}>
                <button
                  onClick={() => setExpandedGroup(isOpen ? null : group.label)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-blue/15 bg-deep/40 px-4 py-3 transition-all hover:border-teal/25"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-cream">{group.label}</span>
                    <span className="text-[10px] text-cream-dim/30">{group.exercises.length}</span>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 16 16" fill="none"
                    className={`text-cream-dim/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="mt-2 flex flex-col gap-2">
                    {group.exercises.map((exercise) => (
                      <div key={exercise.name} className="relative">
                        <Link
                          href={exercise.href}
                          className="group block rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/50"
                        >
                          <div className={`flex items-center justify-between gap-3 rounded-xl border border-slate-blue/15 bg-deep/40 px-4 py-3.5 transition-all duration-300 hover:border-teal/25 active:scale-[0.99]${exercise.why ? " pr-12" : ""}`}>
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-cream">{exercise.name}</h3>
                              <p className="mt-0.5 text-xs text-cream-dim/50">{exercise.description}{exercise.time && <span className="text-cream-dim/30"> · {exercise.time}</span>}</p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 text-cream-dim/30 transition-colors group-hover:text-cream-dim/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 4l4 4-4 4" />
                            </svg>
                          </div>
                        </Link>
                        {exercise.why && (
                          <MicroExplanation
                            text={exercise.why}
                            isOpen={expandedExplanation === exercise.name}
                            onToggle={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setExpandedExplanation(
                                expandedExplanation === exercise.name ? null : exercise.name
                              );
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
