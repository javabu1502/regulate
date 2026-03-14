import Link from "next/link";

// ─── Exercise data ──────────────────────────────────────────────────

interface Exercise {
  name: string;
  description: string;
  href: string;
}

interface ExerciseGroup {
  label: string;
  exercises: Exercise[];
}

const exerciseGroups: ExerciseGroup[] = [
  {
    label: "Breathing",
    exercises: [
      { name: "Box Breathing", description: "Equal rhythm: in, hold, out, hold", href: "/breathing" },
      { name: "4-7-8 Breathing", description: "Deep calm: in for 4, hold for 7, out for 8", href: "/breathing" },
      { name: "Physiological Sigh", description: "Quick reset: two inhales, long exhale", href: "/breathing" },
      { name: "Coherence", description: "Steady rhythm: 5 seconds in, 5 out", href: "/breathing" },
      { name: "Extended Exhale", description: "Longer out-breath to slow everything down", href: "/breathing" },
    ],
  },
  {
    label: "Grounding",
    exercises: [
      { name: "5-4-3-2-1 Senses", description: "Use your senses to come back to now", href: "/grounding" },
      { name: "Body Grounding", description: "Feel your body's connection to the ground", href: "/grounding" },
      { name: "Object Grounding", description: "Focus on something you can hold", href: "/grounding" },
    ],
  },
  {
    label: "Somatic",
    exercises: [
      { name: "Bilateral Tapping", description: "Left-right rhythm to help your brain process", href: "/somatic" },
      { name: "Gentle Swaying", description: "Rock gently, like the ocean", href: "/somatic" },
      { name: "Body Shaking", description: "Shake it ALL out", href: "/somatic" },
      { name: "Self-Havening", description: "Gentle self-touch for safety", href: "/somatic" },
      { name: "Butterfly Hug", description: "Cross your arms and tap", href: "/somatic" },
      { name: "Return to Safety", description: "Gentle re-orienting after feeling unsafe", href: "/somatic" },
      { name: "Orienting", description: "Slowly look around to signal safety", href: "/somatic" },
      { name: "Humming / Voo Sound", description: "Deep vibration to calm your vagus nerve", href: "/somatic" },
      { name: "Vagus Nerve Massage", description: "Gentle pressure on calming points", href: "/somatic" },
      { name: "Eye Press Reset", description: "Gentle pressure on closed eyes to slow your heart", href: "/somatic" },
      { name: "Air Punching", description: "Let it OUT \u2014 punch hard, be fierce", href: "/somatic" },
      { name: "Bearing Down", description: "Engage your core against resistance", href: "/somatic" },
      { name: "Free Movement / Dancing", description: "MOVE \u2014 dance like nobody\u2019s watching", href: "/somatic" },
      { name: "Vestibular Eye Movement", description: "Slow eye tracking to settle your body", href: "/somatic" },
      { name: "Pendulation", description: "Shift attention between tension and comfort", href: "/somatic" },
    ],
  },
  {
    label: "Body & Mind",
    exercises: [
      { name: "Body Scan", description: "Notice your body, one area at a time", href: "/body-scan" },
      { name: "Affirmations", description: "Words that meet you where you are", href: "/affirmations" },
    ],
  },
  {
    label: "Sleep",
    exercises: [
      { name: "Sleep Sequence", description: "Breathing and relaxation for restless nights", href: "/sleep" },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────

export default function ExercisesPage() {
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
        <header className="mb-8">
          <h1 className="text-xl font-light tracking-tight text-cream">
            Exercises
          </h1>
          <p className="mt-1.5 text-xs text-cream-dim/60">
            Everything in one place. Pick what feels right.
          </p>
        </header>

        {/* Exercise groups */}
        <div className="flex flex-col gap-8">
          {exerciseGroups.map((group) => (
            <section key={group.label}>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-cream-dim/40">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {group.exercises.map((exercise) => (
                  <Link
                    key={exercise.name}
                    href={exercise.href}
                    className="group block rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/50"
                  >
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-blue/15 bg-deep/40 px-4 py-3.5 transition-all duration-300 hover:border-teal/25 active:scale-[0.99]">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-cream">{exercise.name}</h3>
                        <p className="mt-0.5 text-xs text-cream-dim/50">{exercise.description}</p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-cream-dim/30 transition-colors group-hover:text-cream-dim/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4l4 4-4 4" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
