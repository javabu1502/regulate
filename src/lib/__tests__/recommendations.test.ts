import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before importing the module
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  length: 0,
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Now import the module (after localStorage is available)
const { getRecommendations, getPersonalizedRecommendations, getTopTechniques } =
  await import("../recommendations");

function setJournal(entries: unknown[]) {
  store["regulate-journal"] = JSON.stringify(entries);
}

function setSOSHistory(entries: unknown[]) {
  store["regulate-sos-history"] = JSON.stringify(entries);
}

function clearStorage() {
  Object.keys(store).forEach((k) => delete store[k]);
}

describe("getRecommendations", () => {
  beforeEach(clearStorage);

  it("returns empty array when no journal data exists", () => {
    expect(getRecommendations()).toEqual([]);
  });

  it("returns empty array when journal is empty array", () => {
    setJournal([]);
    expect(getRecommendations()).toEqual([]);
  });

  it("scores techniques using better*3 + same*1 - harder*2 formula", () => {
    // Breathing: 2 better, 1 harder = (2*3 + 0 - 1*2) / 3 = 4/3 = 1.33
    // Grounding: 3 same = (0 + 3*1 - 0) / 3 = 1.0
    setJournal([
      { technique: "Breathing", aftercareResponse: "better" },
      { technique: "Breathing", aftercareResponse: "better" },
      { technique: "Breathing", aftercareResponse: "harder" },
      { technique: "Grounding", aftercareResponse: "same" },
      { technique: "Grounding", aftercareResponse: "same" },
      { technique: "Grounding", aftercareResponse: "same" },
    ]);

    const recs = getRecommendations();
    // Breathing should rank above Grounding (1.33 > 1.0)
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].href).toBe("/breathing");
  });

  it("returns at most 3 recommendations", () => {
    setJournal([
      { technique: "Breathing", aftercareResponse: "better" },
      { technique: "Breathing", aftercareResponse: "better" },
      { technique: "Grounding", aftercareResponse: "better" },
      { technique: "Grounding", aftercareResponse: "better" },
      { technique: "Body Scan", aftercareResponse: "better" },
      { technique: "Body Scan", aftercareResponse: "better" },
      { technique: "Bilateral Tapping", aftercareResponse: "better" },
      { technique: "Bilateral Tapping", aftercareResponse: "better" },
      { technique: "Affirmations", aftercareResponse: "better" },
      { technique: "Affirmations", aftercareResponse: "better" },
    ]);

    const recs = getRecommendations();
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it("requires at least 2 uses of a technique to include it", () => {
    setJournal([
      { technique: "Breathing", aftercareResponse: "better" },
      // Only 1 use - should not appear
    ]);

    const recs = getRecommendations();
    expect(recs).toEqual([]);
  });

  it("assigns 'Works well for you' when score > 1.5", () => {
    // 2 better = (2*3) / 2 = 3.0 > 1.5
    setJournal([
      { technique: "Breathing", aftercareResponse: "better" },
      { technique: "Breathing", aftercareResponse: "better" },
    ]);

    const recs = getRecommendations();
    expect(recs[0].reason).toBe("Works well for you");
  });

  it("assigns 'Used frequently' when score <= 1.5", () => {
    // 2 same = (0 + 2*1 - 0) / 2 = 1.0 <= 1.5
    setJournal([
      { technique: "Breathing", aftercareResponse: "same" },
      { technique: "Breathing", aftercareResponse: "same" },
    ]);

    const recs = getRecommendations();
    expect(recs[0].reason).toBe("Used frequently");
  });

  it("uses nsState fallbacks when not enough scored data", () => {
    // Journal exists but no technique has 2+ uses, so no data-driven recs
    setJournal([
      { technique: "Breathing", aftercareResponse: "better" },
    ]);
    const recs = getRecommendations("hyperactivated");
    expect(recs.length).toBeGreaterThan(0);
    const hrefs = recs.map((r) => r.href);
    expect(hrefs).toContain("/somatic");
    expect(hrefs).toContain("/breathing");
  });

  it("deduplicates techniques that map to the same module href", () => {
    // "Bilateral Tapping" and "Gentle Swaying" both map to /somatic
    setJournal([
      { technique: "Bilateral Tapping", aftercareResponse: "better" },
      { technique: "Bilateral Tapping", aftercareResponse: "better" },
      { technique: "Gentle Swaying", aftercareResponse: "better" },
      { technique: "Gentle Swaying", aftercareResponse: "better" },
    ]);

    const recs = getRecommendations();
    const somaticRecs = recs.filter((r) => r.href === "/somatic");
    expect(somaticRecs.length).toBe(1);
  });

  it("handles the techniques array field in addition to technique", () => {
    setJournal([
      { techniques: ["Breathing", "Grounding"], aftercareResponse: "better" },
      { techniques: ["Breathing"], aftercareResponse: "better" },
      { technique: "Grounding", aftercareResponse: "better" },
    ]);

    const recs = getRecommendations();
    expect(recs.length).toBeGreaterThan(0);
  });
});

describe("getPersonalizedRecommendations", () => {
  beforeEach(clearStorage);

  it("returns defaults when no history exists", () => {
    const result = getPersonalizedRecommendations("panicking");
    expect(result).toEqual(["breathing", "tapping", "grounding"]);
  });

  it("returns defaults for anxious state", () => {
    const result = getPersonalizedRecommendations("anxious");
    expect(result).toEqual(["extended", "body-scan", "grounding"]);
  });

  it("returns defaults for shutdown state", () => {
    const result = getPersonalizedRecommendations("shutdown");
    expect(result).toEqual(["gentle-movement", "somatic", "tapping"]);
  });

  it("falls back to panicking defaults for unknown state", () => {
    const result = getPersonalizedRecommendations("unknown-state");
    expect(result).toEqual(["breathing", "tapping", "grounding"]);
  });

  it("always returns exactly 3 recommendations", () => {
    // With history
    setSOSHistory([
      { tool: "breathing", label: "Breathing", ts: "2025-01-01", helped: true },
      { tool: "breathing", label: "Breathing", ts: "2025-01-02", helped: true },
      { tool: "tapping", label: "Tapping", ts: "2025-01-01", helped: true },
      { tool: "tapping", label: "Tapping", ts: "2025-01-02", helped: true },
    ]);

    const result = getPersonalizedRecommendations("panicking");
    expect(result).toHaveLength(3);
  });

  it("prioritizes tools with high success rates from SOS history", () => {
    // Create strong history for body-scan
    setSOSHistory([
      { tool: "body-scan", label: "Body scan", ts: "2025-01-01", helped: true },
      { tool: "body-scan", label: "Body scan", ts: "2025-01-02", helped: true },
      { tool: "body-scan", label: "Body scan", ts: "2025-01-03", helped: true },
    ]);

    const result = getPersonalizedRecommendations("panicking");
    expect(result).toContain("body-scan");
  });
});

describe("getTopTechniques", () => {
  beforeEach(clearStorage);

  it("returns null when no data exists", () => {
    expect(getTopTechniques()).toBeNull();
  });

  it("returns null when fewer than 3 total data points", () => {
    setSOSHistory([
      { tool: "breathing", label: "Breathing", ts: "2025-01-01", helped: true },
      { tool: "tapping", label: "Tapping", ts: "2025-01-02", helped: true },
    ]);

    expect(getTopTechniques()).toBeNull();
  });

  it("returns techniques when sufficient data exists", () => {
    setSOSHistory([
      { tool: "breathing", label: "Breathing", ts: "2025-01-01", helped: true },
      { tool: "breathing", label: "Breathing", ts: "2025-01-02", helped: true },
      { tool: "tapping", label: "Tapping", ts: "2025-01-03", helped: true },
    ]);

    const result = getTopTechniques();
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
    expect(result!.length).toBeLessThanOrEqual(3);
    expect(result![0]).toHaveProperty("id");
    expect(result![0]).toHaveProperty("label");
    expect(result![0]).toHaveProperty("successRate");
    expect(result![0]).toHaveProperty("totalSessions");
  });

  it("returns null when no tools have helped responses", () => {
    setSOSHistory([
      { tool: "breathing", label: "Breathing", ts: "2025-01-01", helped: false },
      { tool: "breathing", label: "Breathing", ts: "2025-01-02", helped: false },
      { tool: "tapping", label: "Tapping", ts: "2025-01-03", helped: false },
    ]);

    expect(getTopTechniques()).toBeNull();
  });
});
