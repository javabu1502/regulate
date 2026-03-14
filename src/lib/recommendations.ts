"use client";

const JOURNAL_KEY = "regulate-journal";
const SOS_HISTORY_KEY = "regulate-sos-history";

interface SessionEntry {
  technique?: string;
  aftercareResponse?: string;
  type?: string;
  timestamp?: number;
  date?: string;
  techniques?: string[];
}

interface SOSHistoryEntry {
  tool: string;
  label: string;
  ts: string;
  helped: boolean;
  partial?: boolean;
}

interface Recommendation {
  href: string;
  title: string;
  reason: string;
}

// ─── Canonical technique ID map ─────────────────────────────────────
// Normalizes every known variation (display names, journal entries, SOS tool IDs)
// down to a single canonical ID that matches the SOS exercise IDs.

const canonicalTechniqueId: Record<string, string> = {
  // Already-canonical SOS tool IDs → themselves
  breathing: "breathing",
  extended: "extended",
  tapping: "tapping",
  grounding: "grounding",
  "gentle-movement": "gentle-movement",
  "body-scan": "body-scan",
  somatic: "somatic",
  affirmations: "affirmations",
  sleep: "sleep",
  // Journal / display-name variations → canonical
  "Breathing": "breathing",
  "Guided Breathing": "breathing",
  "Physiological sigh": "breathing",
  "Extended exhale": "extended",
  "Extended Exhale": "extended",
  "Grounding": "grounding",
  "5-4-3-2-1 Grounding": "grounding",
  "Body scan": "body-scan",
  "Body Scan": "body-scan",
  "Bilateral Tapping": "tapping",
  "Bilateral tapping": "tapping",
  "Gentle Swaying": "gentle-movement",
  "Gentle movement": "gentle-movement",
  "Swaying": "gentle-movement",
  "Somatic exercises": "somatic",
  "Somatic Movement": "somatic",
  "Affirmations": "affirmations",
  "Sleep sequence": "sleep",
  "Sleep": "sleep",
};

/** Normalize any technique name/ID to a canonical exercise ID */
function normalizeTechniqueId(name: string): string | null {
  return canonicalTechniqueId[name] ?? canonicalTechniqueId[name.toLowerCase()] ?? null;
}

// Map canonical IDs to module pages (for getRecommendations)
const techniqueToModule: Record<string, { href: string; title: string }> = {
  breathing: { href: "/breathing", title: "Guided Breathing" },
  extended: { href: "/breathing", title: "Guided Breathing" },
  grounding: { href: "/grounding", title: "5-4-3-2-1 Grounding" },
  "body-scan": { href: "/body-scan", title: "Body Scan" },
  tapping: { href: "/somatic", title: "Somatic Movement" },
  "gentle-movement": { href: "/somatic", title: "Somatic Movement" },
  somatic: { href: "/somatic", title: "Somatic Movement" },
  affirmations: { href: "/affirmations", title: "Affirmations" },
  sleep: { href: "/sleep", title: "Sleep Sequence" },
};

// Map canonical IDs to human-readable labels for the insight card
const sosToolLabels: Record<string, string> = {
  breathing: "Physiological sigh",
  extended: "Extended exhale",
  tapping: "Bilateral tapping",
  grounding: "5-4-3-2-1 Grounding",
  "gentle-movement": "Gentle movement",
  "body-scan": "Body scan",
  somatic: "Somatic exercises",
  affirmations: "Affirmations",
  sleep: "Sleep sequence",
};

// ─── Original recommendation function (for module pages) ─────────────

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
        const id = normalizeTechniqueId(t) || t;
        if (!scores[id]) scores[id] = { better: 0, same: 0, harder: 0, total: 0 };
        scores[id].total++;
        if (e.aftercareResponse === "better") scores[id].better++;
        else if (e.aftercareResponse === "same") scores[id].same++;
        else if (e.aftercareResponse === "harder") scores[id].harder++;
      });
    });

    // Also fold in SOS history data for a fuller picture
    try {
      const sosRaw = localStorage.getItem(SOS_HISTORY_KEY);
      if (sosRaw) {
        const history: SOSHistoryEntry[] = JSON.parse(sosRaw);
        for (const entry of history) {
          const id = normalizeTechniqueId(entry.tool) || entry.tool;
          if (!scores[id]) scores[id] = { better: 0, same: 0, harder: 0, total: 0 };
          scores[id].total++;
          if (entry.helped) scores[id].better++;
          else scores[id].harder++;
        }
      }
    } catch { /* */ }

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

// ─── Personalized SOS recommendations ──────────────────────────────

// Default body-state mapping (clinically aligned)
const defaultRecommendations: Record<string, string[]> = {
  panicking: ["breathing", "tapping", "body-scan"],
  anxious: ["extended", "grounding", "somatic"],
  shutdown: ["gentle-movement", "affirmations", "grounding"],
};

interface ToolScore {
  id: string;
  helped: number;
  notHelped: number;
  total: number;
  successRate: number;
}

/**
 * Scores all SOS tool IDs by combining:
 * 1. SOS history (helped/not helped)
 * 2. Journal aftercare responses (better/same/harder) mapped to tool IDs
 */
function getToolScores(): Map<string, ToolScore> {
  const scores = new Map<string, ToolScore>();

  function getOrCreate(id: string): ToolScore {
    if (!scores.has(id)) {
      scores.set(id, { id, helped: 0, notHelped: 0, total: 0, successRate: 0 });
    }
    return scores.get(id)!;
  }

  // 1. SOS history
  try {
    const raw = localStorage.getItem(SOS_HISTORY_KEY);
    if (raw) {
      const history: SOSHistoryEntry[] = JSON.parse(raw);
      for (const entry of history) {
        const toolId = normalizeTechniqueId(entry.tool) || entry.tool;
        const score = getOrCreate(toolId);
        score.total++;
        if (entry.helped) score.helped++;
        else score.notHelped++;
      }
    }
  } catch { /* */ }

  // 2. Journal aftercare entries
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (raw) {
      const entries: SessionEntry[] = JSON.parse(raw);
      for (const entry of entries) {
        if (!entry.aftercareResponse || entry.aftercareResponse === "skipped") continue;

        const techniques: string[] = [];
        if (entry.technique) techniques.push(entry.technique);
        if (entry.techniques) techniques.push(...entry.techniques);

        for (const t of techniques) {
          const toolId = normalizeTechniqueId(t);
          if (!toolId) continue;

          const score = getOrCreate(toolId);
          score.total++;
          if (entry.aftercareResponse === "better") score.helped++;
          else if (entry.aftercareResponse === "harder") score.notHelped++;
          // "same" counts as total but not helped/not helped
        }
      }
    }
  } catch { /* */ }

  // Calculate success rates
  for (const score of scores.values()) {
    score.successRate = score.total > 0 ? score.helped / score.total : 0;
  }

  return scores;
}

/**
 * Returns personalized SOS exercise IDs for a given body state.
 * Combines personal history with clinically-aligned defaults.
 *
 * - Tools the user has marked as "helped" get prioritized
 * - Falls back to the default fixed map when no history exists
 * - Always returns exactly 3 recommendations
 */
export function getPersonalizedRecommendations(bodyState: string): string[] {
  const state = bodyState || "panicking";
  const defaults = defaultRecommendations[state] || defaultRecommendations.panicking;

  try {
    const scores = getToolScores();

    // No data at all - return defaults
    if (scores.size === 0) return defaults;

    // Get tools that have been used and have a positive success rate
    // Only consider tools with at least 2 data points to avoid noise
    const effective = Array.from(scores.values())
      .filter((s) => s.total >= 2 && s.successRate > 0.3)
      .sort((a, b) => {
        // Sort by success rate first, then by total uses as tiebreaker
        if (Math.abs(b.successRate - a.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        return b.total - a.total;
      });

    if (effective.length === 0) return defaults;

    // Build final list: personal successes first, then fill with defaults
    const result: string[] = [];
    const used = new Set<string>();

    // Add personally effective tools (up to 2 to leave room for a default)
    for (const tool of effective) {
      if (result.length >= 2) break;
      result.push(tool.id);
      used.add(tool.id);
    }

    // Fill remaining slots with defaults that aren't already included
    for (const id of defaults) {
      if (result.length >= 3) break;
      if (!used.has(id)) {
        result.push(id);
        used.add(id);
      }
    }

    // If still not 3, fill from all defaults across states
    if (result.length < 3) {
      const allDefaults = [...new Set(Object.values(defaultRecommendations).flat())];
      for (const id of allDefaults) {
        if (result.length >= 3) break;
        if (!used.has(id)) {
          result.push(id);
          used.add(id);
        }
      }
    }

    return result;
  } catch {
    return defaults;
  }
}

// ─── Insight: top effective techniques for the home page ────────────

export interface TopTechnique {
  id: string;
  label: string;
  successRate: number;
  totalSessions: number;
}

/**
 * Returns the user's top 2-3 most effective techniques.
 * Returns null if there isn't enough data (fewer than 3 total sessions).
 */
export function getTopTechniques(): TopTechnique[] | null {
  try {
    const scores = getToolScores();

    // Need at least 3 total data points across all tools
    let totalDataPoints = 0;
    for (const s of scores.values()) {
      totalDataPoints += s.total;
    }
    if (totalDataPoints < 3) return null;

    // Get tools with at least 1 helped response
    const effective = Array.from(scores.values())
      .filter((s) => s.helped > 0 && s.total >= 1)
      .sort((a, b) => {
        // Primary: success rate, secondary: total uses
        if (Math.abs(b.successRate - a.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        return b.total - a.total;
      })
      .slice(0, 3);

    if (effective.length === 0) return null;

    return effective.map((s) => ({
      id: s.id,
      label: sosToolLabels[s.id] || s.id,
      successRate: s.successRate,
      totalSessions: s.total,
    }));
  } catch {
    return null;
  }
}
