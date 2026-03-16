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

// ─── Goal → exercise name mapping ────────────────────────────────────
const GOAL_EXERCISES: Record<string, string[]> = {
  calmer: ["Box Breathing", "4-7-8 Breathing", "Coherence", "Body Scan", "Self-Havening", "Gentle Swaying"],
  awake: ["Body Shaking", "Air Punching", "Free Movement / Dancing", "Bilateral Tapping"],
  sleepy: ["4-7-8 Breathing", "Sleep Sequence", "Extended Exhale", "Body Scan"],
  grounded: ["5-4-3-2-1 Senses", "Body Grounding", "Object Grounding", "Orienting"],
  "less-pain": ["Pendulation", "Body Scan", "Gentle Swaying", "Self-Havening"],
};

const GOAL_LABELS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "calmer", label: "Calmer" },
  { key: "awake", label: "More awake" },
  { key: "sleepy", label: "Sleepy" },
  { key: "grounded", label: "Grounded" },
  { key: "less-pain", label: "Less pain" },
];

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
      { name: "Box Breathing", description: "Equal rhythm: in, hold, out, hold", href: "/breathing", time: "3 min", why: "The even rhythm gives your nervous system something predictable to follow — and predictability means safety." },
      { name: "4-7-8 Breathing", description: "Deep calm: in for 4, hold for 7, out for 8", href: "/breathing", time: "5 min", why: "That long exhale is the key — breathing out longer than you breathe in directly activates your calming nervous system." },
      { name: "Physiological Sigh", description: "Quick reset: two inhales, long exhale", href: "/breathing", time: "3 min" },
      { name: "Coherence", description: "Steady rhythm: 5 seconds in, 5 out", href: "/breathing", time: "5 min" },
      { name: "Extended Exhale", description: "Longer out-breath to slow everything down", href: "/breathing", time: "3 min" },
    ],
  },
  {
    label: "Grounding",
    exercises: [
      { name: "5-4-3-2-1 Senses", description: "Use your senses to come back to now", href: "/grounding", time: "3-5 min", why: "When your brain is busy noticing real things around you, it can't stay stuck in anxious thoughts." },
      { name: "Body Grounding", description: "Feel your body's connection to the ground", href: "/grounding", time: "3 min" },
      { name: "Object Grounding", description: "Focus on something you can hold", href: "/grounding", time: "2 min" },
    ],
  },
  {
    label: "Somatic",
    exercises: [
      { name: "Bilateral Tapping", description: "Left-right rhythm to help your brain process", href: "/somatic", time: "3-5 min", why: "Left-right rhythm mimics REM sleep processing — it helps your brain file away distressing experiences." },
      { name: "Gentle Swaying", description: "Rock gently, like the ocean", href: "/somatic", time: "3 min" },
      { name: "Body Shaking", description: "Shake it ALL out", href: "/somatic", time: "2-3 min", why: "Animals shake after danger passes to discharge stress hormones. Your body knows how to do this too." },
      { name: "Self-Havening", description: "Gentle self-touch for safety", href: "/somatic", time: "3-5 min", why: "Gentle self-touch triggers delta waves in your brain — the same waves that appear in deep, restful sleep." },
      { name: "Butterfly Hug", description: "Cross your arms and tap", href: "/somatic", time: "2-3 min" },
      { name: "Return to Safety", description: "Gentle re-orienting after feeling unsafe", href: "/somatic", time: "3 min" },
      { name: "Orienting", description: "Slowly look around to signal safety", href: "/somatic", time: "2 min" },
      { name: "Humming / Voo Sound", description: "Deep vibration to calm your vagus nerve", href: "/somatic", time: "3 min" },
      { name: "Vagus Nerve Massage", description: "Gentle pressure on calming points", href: "/somatic", time: "2-3 min" },
      { name: "Eye Press Reset", description: "Gentle pressure on closed eyes to slow your heart", href: "/somatic", time: "1-2 min" },
      { name: "Air Punching", description: "Let it OUT \u2014 punch hard, be fierce", href: "/somatic", time: "2-3 min" },
      { name: "Bearing Down", description: "Engage your core against resistance", href: "/somatic", time: "1-2 min" },
      { name: "Free Movement / Dancing", description: "MOVE \u2014 dance like nobody\u2019s watching", href: "/somatic", time: "3-5 min" },
      { name: "Vestibular Eye Movement", description: "Slow eye tracking to settle your body", href: "/somatic", time: "2-3 min" },
      { name: "Pendulation", description: "Shift attention between tension and comfort", href: "/somatic", time: "5 min" },
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

// ─── Component ──────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [showGuide, setShowGuide] = useState(false);
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("any");
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);

  const filtersActive = goalFilter !== "all" || timeFilter !== "any";

  // Apply both filters to produce the visible groups
  const filteredGroups = exerciseGroups
    .map((group) => {
      const filtered = group.exercises.filter((ex) => {
        // Goal filter
        if (goalFilter !== "all") {
          const allowed = GOAL_EXERCISES[goalFilter];
          if (allowed && !allowed.includes(ex.name)) return false;
        }
        // Time filter
        if (!matchesTimeFilter(ex.time, timeFilter)) return false;
        return true;
      });
      return { ...group, exercises: filtered };
    })
    .filter((group) => !filtersActive || group.exercises.length > 0);

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

        {/* Which one should I pick? */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-teal/15 bg-deep/40 px-4 py-3 text-sm text-cream-dim/60 transition-all hover:border-teal/25 hover:text-cream-dim"
        >
          Which one should I pick?
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            className={`transition-transform duration-300 ${showGuide ? "rotate-180" : ""}`}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showGuide && (
          <div className="mb-6 rounded-2xl border border-teal/15 bg-deep/60 p-5 text-sm leading-relaxed text-cream-dim">
            <p className="font-medium text-cream mb-2">Quick guide:</p>
            <ul className="flex flex-col gap-2 text-xs">
              <li><span className="text-teal-soft">Panicking or can&apos;t breathe?</span> → Physiological Sigh (fastest relief)</li>
              <li><span className="text-teal-soft">Racing thoughts?</span> → 5-4-3-2-1 Senses or Box Breathing</li>
              <li><span className="text-teal-soft">Frozen or numb?</span> → Body Shaking, Free Movement, or Bilateral Tapping</li>
              <li><span className="text-teal-soft">Can&apos;t sleep?</span> → 4-7-8 Breathing or Sleep Sequence</li>
              <li><span className="text-teal-soft">General anxiety?</span> → Coherence Breathing or Self-Havening</li>
              <li><span className="text-teal-soft">Need a distraction?</span> → Try the <Link href="/games" className="underline underline-offset-2">Mindful Games</Link></li>
            </ul>
          </div>
        )}

        {/* I want to feel... */}
        <div className="mb-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-cream-dim/40">
            I want to feel&hellip;
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {GOAL_LABELS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGoalFilter(g.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  goalFilter === g.key
                    ? "bg-teal/20 text-teal-soft border-teal/30"
                    : "bg-deep/40 text-cream-dim/50 border-slate-blue/20"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time filter */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TIME_LABELS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeFilter(t.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  timeFilter === t.key
                    ? "bg-teal/20 text-teal-soft border-teal/30"
                    : "bg-deep/40 text-cream-dim/50 border-slate-blue/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {filtersActive && (
          <button
            onClick={() => { setGoalFilter("all"); setTimeFilter("any"); }}
            className="mb-4 text-xs text-teal-soft/70 underline underline-offset-2 transition-colors hover:text-teal-soft"
          >
            Clear filters
          </button>
        )}

        {/* Exercise groups */}
        <div className="flex flex-col gap-8">
          {filteredGroups.map((group) => (
            <section key={group.label}>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-cream-dim/40">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
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
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
