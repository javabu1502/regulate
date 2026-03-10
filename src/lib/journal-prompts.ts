"use client";

interface Prompt {
  text: string;
  triggers?: string[];
  techniques?: string[];
}

const prompts: Prompt[] = [
  // General
  { text: "What was your body telling you before this started?" },
  { text: "What did you need most in that moment?" },
  { text: "What would you say to a friend going through the same thing?" },
  { text: "Is there something you want to remember for next time?" },

  // Trigger-specific
  { text: "What about the situation felt unsafe? Was there a real threat?", triggers: ["Unknown", "Social situation", "Crowded place"] },
  { text: "What part of this was about the present, and what was about the past?", triggers: ["Relationship", "Work stress"] },
  { text: "What did your body do first? Where did you feel it?", triggers: ["Health fear"] },
  { text: "Was there a moment it shifted? What changed?", triggers: ["Unknown"] },

  // Technique-specific
  { text: "Which breath felt like the turning point?", techniques: ["Breathing"] },
  { text: "What did you notice during the grounding exercise?", techniques: ["Grounding"] },
  { text: "Where in your body did you feel the release?", techniques: ["Body scan", "Bilateral tapping", "Swaying"] },
];

// ─── Reflective progress prompts (10+ sessions) ─────────────────

const reflectionPrompts: string[] = [
  "What do you notice about your body's signals now compared to when you started?",
  "Which tools feel most natural to reach for? What does that tell you?",
  "Have you noticed any patterns in when you feel activated?",
  "What has surprised you about your regulation practice?",
  "How has your relationship with anxiety or panic changed?",
  "What would you tell someone just starting this journey?",
  "Have you noticed your window of tolerance expanding?",
  "What does safety feel like in your body now?",
];

const REFLECTION_SHOWN_KEY = "regulate-reflection-shown";

/**
 * Pick a reflective prompt that hasn't been shown in the last 3.
 * Stores the history in localStorage so repeats are avoided.
 */
export function getReflectionPrompt(): string {
  let shown: string[] = [];
  try {
    shown = JSON.parse(localStorage.getItem(REFLECTION_SHOWN_KEY) || "[]");
  } catch { /* */ }

  const lastThree = shown.slice(-3);
  const available = reflectionPrompts.filter((p) => !lastThree.includes(p));
  const pool = available.length > 0 ? available : reflectionPrompts;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  // Record it
  shown.push(picked);
  // Keep only last 10 to avoid unbounded growth
  if (shown.length > 10) shown = shown.slice(-10);
  try {
    localStorage.setItem(REFLECTION_SHOWN_KEY, JSON.stringify(shown));
  } catch { /* */ }

  return picked;
}

export function getPrompts(triggers: string[], techniques: string[]): string[] {
  const relevant: string[] = [];

  // Add trigger-matched prompts
  prompts.forEach((p) => {
    if (p.triggers && p.triggers.some((t) => triggers.includes(t))) {
      relevant.push(p.text);
    }
    if (p.techniques && p.techniques.some((t) => techniques.includes(t))) {
      relevant.push(p.text);
    }
  });

  // Add general prompts to fill up to 3
  const general = prompts.filter((p) => !p.triggers && !p.techniques);
  for (const p of general) {
    if (!relevant.includes(p.text)) {
      relevant.push(p.text);
    }
    if (relevant.length >= 3) break;
  }

  return relevant.slice(0, 3);
}
