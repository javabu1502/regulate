"use client";

const JOURNAL_KEY = "regulate-journal";

interface SessionEntry {
  technique?: string;
  aftercareResponse?: string;
  type?: string;
  timestamp?: number;
  date?: string;
  techniques?: string[];
}

interface Recommendation {
  href: string;
  title: string;
  reason: string;
}

const techniqueToModule: Record<string, { href: string; title: string }> = {
  "Breathing": { href: "/breathing", title: "Guided Breathing" },
  "Grounding": { href: "/grounding", title: "5-4-3-2-1 Grounding" },
  "Body scan": { href: "/body-scan", title: "Body Scan" },
  "Body Scan": { href: "/body-scan", title: "Body Scan" },
  "Bilateral Tapping": { href: "/somatic", title: "Somatic Movement" },
  "Bilateral tapping": { href: "/somatic", title: "Somatic Movement" },
  "Gentle Swaying": { href: "/somatic", title: "Somatic Movement" },
  "Swaying": { href: "/somatic", title: "Somatic Movement" },
  "Affirmations": { href: "/affirmations", title: "Affirmations" },
  "Guided Breathing": { href: "/breathing", title: "Guided Breathing" },
  "5-4-3-2-1 Grounding": { href: "/grounding", title: "5-4-3-2-1 Grounding" },
};

export function getRecommendations(nsState?: string | null): Recommendation[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const entries: SessionEntry[] = JSON.parse(raw);

    // Score techniques based on aftercare responses
    const scores: Record<string, { better: number; same: number; harder: number; total: number }> = {};

    entries.forEach((e) => {
      const techniques: string[] = [];
      if (e.technique) techniques.push(e.technique);
      if (e.techniques) techniques.push(...e.techniques);

      techniques.forEach((t) => {
        if (!scores[t]) scores[t] = { better: 0, same: 0, harder: 0, total: 0 };
        scores[t].total++;
        if (e.aftercareResponse === "better") scores[t].better++;
        else if (e.aftercareResponse === "same") scores[t].same++;
        else if (e.aftercareResponse === "harder") scores[t].harder++;
      });
    });

    // Rank by effectiveness (better responses weighted highest)
    const ranked = Object.entries(scores)
      .map(([technique, s]) => ({
        technique,
        score: s.total > 0 ? (s.better * 3 + s.same * 1 - s.harder * 2) / s.total : 0,
        total: s.total,
      }))
      .filter((r) => r.total >= 2) // Need at least 2 uses
      .sort((a, b) => b.score - a.score);

    const recs: Recommendation[] = [];
    const seen = new Set<string>();

    for (const r of ranked) {
      const mod = techniqueToModule[r.technique];
      if (mod && !seen.has(mod.href)) {
        seen.add(mod.href);
        recs.push({
          ...mod,
          reason: r.score > 1.5 ? "Works well for you" : "Used frequently",
        });
      }
      if (recs.length >= 3) break;
    }

    // State-based fallbacks if not enough data
    if (recs.length < 2 && nsState) {
      const fallbacks: Record<string, Recommendation[]> = {
        hyperactivated: [
          { href: "/somatic", title: "Somatic Movement", reason: "Helps with high activation" },
          { href: "/breathing", title: "Guided Breathing", reason: "Calms your nervous system" },
        ],
        activated: [
          { href: "/breathing", title: "Guided Breathing", reason: "Slows your system down" },
          { href: "/grounding", title: "5-4-3-2-1 Grounding", reason: "Brings you to the present" },
        ],
        hypoactivated: [
          { href: "/somatic", title: "Somatic Movement", reason: "Gentle activation" },
          { href: "/grounding", title: "5-4-3-2-1 Grounding", reason: "Reconnects with your senses" },
        ],
      };
      const fb = fallbacks[nsState] || [];
      for (const r of fb) {
        if (!seen.has(r.href)) {
          seen.add(r.href);
          recs.push(r);
        }
        if (recs.length >= 3) break;
      }
    }

    return recs;
  } catch {
    return [];
  }
}
