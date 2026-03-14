export interface Meditation {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  durationSec: number;
  audioSrc?: string;
}

export const meditations: Meditation[] = [
  // ─── Grounding & Safety ─────────────────────────────────────────
  {
    id: "safe-place",
    title: "Safe Place",
    description: "Build a mental space that feels safe",
    category: "Grounding & Safety",
    duration: "5 min",
    durationSec: 300,
  },
  {
    id: "body-as-home",
    title: "Body as Home",
    description: "Reconnecting with your body",
    category: "Grounding & Safety",
    duration: "6 min",
    durationSec: 360,
  },
  {
    id: "feet-on-the-floor",
    title: "Feet on the Floor",
    description: "Quick present-moment anchoring",
    category: "Grounding & Safety",
    duration: "3 min",
    durationSec: 180,
  },

  // ─── Processing & Release ───────────────────────────────────────
  {
    id: "letting-the-wave-pass",
    title: "Letting the Wave Pass",
    description: "Riding difficult emotions",
    category: "Processing & Release",
    duration: "6 min",
    durationSec: 360,
  },
  {
    id: "putting-it-down",
    title: "Putting It Down",
    description: "Setting down what you're carrying",
    category: "Processing & Release",
    duration: "5 min",
    durationSec: 300,
  },
  {
    id: "the-container",
    title: "The Container",
    description: "Placing overwhelming thoughts somewhere safe",
    category: "Processing & Release",
    duration: "5 min",
    durationSec: 300,
  },

  // ─── Self-Compassion ───────────────────────────────────────────
  {
    id: "the-younger-you",
    title: "The Younger You",
    description: "Speaking kindly to your younger self",
    category: "Self-Compassion",
    duration: "7 min",
    durationSec: 420,
  },
  {
    id: "you-did-your-best-today",
    title: "You Did Your Best Today",
    description: "End-of-day wind down",
    category: "Self-Compassion",
    duration: "5 min",
    durationSec: 300,
  },
  {
    id: "permission-to-rest",
    title: "Permission to Rest",
    description: "For people who feel guilty resting",
    category: "Self-Compassion",
    duration: "5 min",
    durationSec: 300,
  },

  // ─── Regulation ────────────────────────────────────────────────
  {
    id: "warming-your-hands",
    title: "Warming Your Hands",
    description: "Guided body warming",
    category: "Regulation",
    duration: "5 min",
    durationSec: 300,
  },
  {
    id: "heavy-and-warm",
    title: "Heavy and Warm",
    description: "Autogenic-style relaxation",
    category: "Regulation",
    duration: "6 min",
    durationSec: 360,
  },
  {
    id: "following-the-breath-home",
    title: "Following the Breath Home",
    description: "Breath awareness without control",
    category: "Regulation",
    duration: "5 min",
    durationSec: 300,
  },

  // ─── Sleep ─────────────────────────────────────────────────────
  {
    id: "drifting",
    title: "Drifting",
    description: "Body scan that fades to silence",
    category: "Sleep",
    duration: "8 min",
    durationSec: 480,
  },
  {
    id: "night-sky",
    title: "Night Sky",
    description: "Counting stars visualization",
    category: "Sleep",
    duration: "7 min",
    durationSec: 420,
  },
  {
    id: "rain-on-the-roof",
    title: "Rain on the Roof",
    description: "Safe shelter, letting go",
    category: "Sleep",
    duration: "8 min",
    durationSec: 480,
  },
];

export function getMeditationById(id: string): Meditation | undefined {
  return meditations.find((m) => m.id === id);
}

export function getMeditationsByCategory(): { category: string; items: Meditation[] }[] {
  const categoryOrder = [
    "Grounding & Safety",
    "Processing & Release",
    "Self-Compassion",
    "Regulation",
    "Sleep",
  ];

  return categoryOrder.map((category) => ({
    category,
    items: meditations.filter((m) => m.category === category),
  }));
}
