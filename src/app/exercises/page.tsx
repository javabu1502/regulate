"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Exercise data ──────────────────────────────────────────────────

interface Exercise {
  name: string;
  description: string;
  href: string;
  time?: string;
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
    label: "Anxious",
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
    label: "Frozen",
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


const exerciseGroups: ExerciseGroup[] = [
  {
    label: "Quick Reset",
    exercises: [
      { name: "Physiological Sigh", description: "Two quick inhales, one long exhale", href: "/breathing?pattern=sigh", time: "1 min" },
      { name: "30-Second Shake", description: "Shake your whole body", href: "/somatic?exercise=body-shaking", time: "30 sec" },
      { name: "Eye Press Reset", description: "Gentle pressure on closed eyes", href: "/somatic?exercise=eye-press", time: "1 min" },
      { name: "Three Deep Breaths", description: "Just three slow breaths", href: "/breathing?pattern=extended-exhale", time: "1 min" },
    ],
  },
  {
    label: "Breathing",
    exercises: [
      { name: "Box Breathing", description: "In, hold, out, hold — equal rhythm", href: "/breathing?pattern=box", time: "3 min" },
      { name: "4-7-8 Breathing", description: "In 4, hold 7, out 8", href: "/breathing?pattern=478", time: "5 min" },
      { name: "Physiological Sigh", description: "Two inhales, long exhale", href: "/breathing?pattern=sigh", time: "3 min" },
      { name: "Coherence", description: "5 seconds in, 5 out", href: "/breathing?pattern=coherence", time: "5 min" },
      { name: "Extended Exhale", description: "Longer out-breath", href: "/breathing?pattern=extended-exhale", time: "3 min" },
    ],
  },
  {
    label: "Grounding",
    exercises: [
      { name: "5-4-3-2-1 Senses", description: "Use your senses to come back to now", href: "/grounding?type=sensory", time: "3-5 min" },
      { name: "Body Grounding", description: "Feel your body's connection to the ground", href: "/grounding?type=body", time: "3 min" },
      { name: "Object Grounding", description: "Focus on something you can hold", href: "/grounding?type=object", time: "2 min" },
    ],
  },
  {
    label: "Movement & Energy",
    exercises: [
      { name: "Body Shaking", description: "Shake it all out", href: "/somatic?exercise=body-shaking", time: "2-3 min" },
      { name: "Air Punching", description: "Let it out — punch hard", href: "/somatic?exercise=air-punching", time: "2-3 min" },
      { name: "Free Movement / Dancing", description: "Move — dance like nobody's watching", href: "/somatic?exercise=dancing", time: "3-5 min" },
      { name: "Gentle Swaying", description: "Rock gently, like the ocean", href: "/somatic?exercise=gentle-swaying", time: "3 min" },
      { name: "Bearing Down", description: "Engage your core against resistance", href: "/somatic?exercise=bearing-down", time: "1-2 min" },
    ],
  },
  {
    label: "Touch & Tapping",
    exercises: [
      { name: "Bilateral Tapping", description: "Left-right rhythm to process", href: "/somatic?exercise=bilateral-tapping", time: "3-5 min" },
      { name: "Self-Havening", description: "Gentle self-touch for safety", href: "/somatic?exercise=havening", time: "3-5 min" },
      { name: "Butterfly Hug", description: "Cross your arms and tap", href: "/somatic?exercise=bilateral-tapping", time: "2-3 min" },
      { name: "Vagus Nerve Massage", description: "Gentle pressure on calming points", href: "/somatic?exercise=vagus-nerve-massage", time: "2-3 min" },
    ],
  },
  {
    label: "Eyes & Senses",
    exercises: [
      { name: "Orienting", description: "Slowly look around to signal safety", href: "/somatic?exercise=orienting", time: "2 min" },
      { name: "Eye Press Reset", description: "Gentle pressure to slow your heart", href: "/somatic?exercise=eye-press", time: "1-2 min" },
      { name: "Vestibular Eye Movement", description: "Slow eye tracking to settle", href: "/somatic?exercise=vestibular-eyes", time: "2-3 min" },
      { name: "Humming / Voo Sound", description: "Deep vibration to calm your vagus nerve", href: "/somatic?exercise=humming", time: "3 min" },
    ],
  },
  {
    label: "Deeper Work",
    exercises: [
      { name: "Body Scan", description: "Notice your body, one area at a time", href: "/body-scan", time: "3-10 min" },
      { name: "Pendulation", description: "Shift between tension and comfort", href: "/somatic?exercise=pendulation", time: "5 min" },
      { name: "Return to Safety", description: "Re-orient after feeling unsafe", href: "/somatic?exercise=return-to-safety", time: "3 min" },
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

// ─── Exercise card ──────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      href={exercise.href}
      className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-all hover:bg-deep/40"
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-cream-dim/70 group-hover:text-cream">{exercise.name}</span>
          {exercise.time && (
            <span className="text-[10px] text-cream-dim/25">{exercise.time}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-cream-dim/30">{exercise.description}</p>
      </div>
      <svg className="ml-3 h-3 w-3 shrink-0 text-cream-dim/15 group-hover:text-cream-dim/35" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </Link>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [activeFeeling, setActiveFeeling] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const activeFeelingData = FEELINGS.find((f) => f.key === activeFeeling);
  const matchingNames = activeFeelingData ? new Set(activeFeelingData.exercises) : null;

  // Build filtered exercise list when a feeling is selected
  const filteredExercises = matchingNames
    ? activeFeelingData!.exercises
        .map((name) => exerciseByName.get(name))
        .filter((ex): ex is Exercise => ex !== undefined)
    : null;

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
        <header className="mb-5">
          <h1 className="text-xl font-light tracking-tight text-cream">
            Exercises
          </h1>
        </header>

        {/* Feeling filter chips */}
        <div className="mb-6">
          <p className="mb-3 text-sm text-cream/70">
            What are you feeling?
          </p>
          <div className="flex flex-wrap gap-2.5">
            {FEELINGS.map((feeling) => {
              const isActive = activeFeeling === feeling.key;
              return (
                <button
                  key={feeling.key}
                  onClick={() => setActiveFeeling(isActive ? null : feeling.key)}
                  className={`rounded-full border px-4 py-2 text-[15px] transition-all ${
                    isActive
                      ? "border-teal/30 bg-teal/15 text-cream"
                      : "border-slate-blue/20 bg-deep/50 text-cream-dim/60 hover:border-teal/20 hover:text-cream-dim/80"
                  }`}
                >
                  {feeling.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtered view — when a feeling is selected */}
        {activeFeelingData && filteredExercises && (
          <div className="mb-6">
            <p className="mb-3 text-sm text-cream-dim/50">
              {activeFeelingData.subtext}
            </p>
            <div className="flex flex-col gap-2">
              {filteredExercises.map((exercise) => (
                <ExerciseCard key={exercise.name} exercise={exercise} />
              ))}
            </div>
          </div>
        )}

        {/* Browse all — flat list grouped by category, always visible */}
        {!activeFeeling && (
          <div className="flex flex-col gap-1.5">
            {exerciseGroups.map((group) => {
              const isOpen = openGroup === group.label;
              return (
                <section key={group.label}>
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : group.label)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-deep/40"
                  >
                    <span className="text-sm text-cream-dim/60">{group.label}</span>
                    <svg
                      className={`h-3.5 w-3.5 text-cream-dim/25 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-0.5 pl-2">
                      {group.exercises.map((exercise) => (
                        <ExerciseCard key={exercise.name} exercise={exercise} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
