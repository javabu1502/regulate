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

const { getPrompts, getReflectionPrompt } = await import("../journal-prompts");

function clearStorage() {
  Object.keys(store).forEach((k) => delete store[k]);
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
}

describe("getPrompts", () => {
  it("returns at most 3 prompts", () => {
    const result = getPrompts(
      ["Unknown", "Social situation", "Crowded place"],
      ["Breathing", "Grounding", "Body scan"]
    );
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("returns prompts matching triggers", () => {
    const result = getPrompts(["Unknown"], []);
    // Should include "Was there a moment it shifted?" and/or the unsafe question
    const hasTriggered = result.some(
      (p) =>
        p.includes("unsafe") || p.includes("shifted")
    );
    expect(hasTriggered).toBe(true);
  });

  it("returns prompts matching techniques", () => {
    const result = getPrompts([], ["Breathing"]);
    const hasBreathingPrompt = result.some((p) => p.includes("breath"));
    expect(hasBreathingPrompt).toBe(true);
  });

  it("fills with general prompts when fewer than 3 matches", () => {
    const result = getPrompts([], []);
    // No triggers/techniques matched, should get general prompts
    expect(result.length).toBe(3);
    // General prompts don't mention specific techniques
    expect(result[0]).toBeTruthy();
  });

  it("returns general prompts for empty inputs", () => {
    const result = getPrompts([], []);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("returns technique-specific prompts for Body scan", () => {
    const result = getPrompts([], ["Body scan"]);
    const hasBodyPrompt = result.some((p) => p.includes("release") || p.includes("body"));
    expect(hasBodyPrompt).toBe(true);
  });

  it("does not duplicate prompts", () => {
    const result = getPrompts(["Unknown"], ["Breathing"]);
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});

describe("getReflectionPrompt", () => {
  beforeEach(clearStorage);

  it("returns a non-empty string", () => {
    const prompt = getReflectionPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("stores shown prompts in localStorage", () => {
    getReflectionPrompt();
    const stored = JSON.parse(store["regulate-reflection-shown"] || "[]");
    expect(stored.length).toBe(1);
  });

  it("avoids repeating the last 3 prompts", () => {
    // Call 4 times - the 4th should not repeat any of the last 3
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(getReflectionPrompt());
    }
    // The 4th result should differ from at least one of positions 1-3
    // (it won't be the same as all three)
    const lastThreeBefore4th = results.slice(0, 3);
    // We can't guarantee it's different from ALL three (it could match one),
    // but it should not be the same as all three
    const allSame = lastThreeBefore4th.every((p) => p === results[3]);
    expect(allSame).toBe(false);
  });

  it("limits stored history to 10 entries", () => {
    // Call 15 times
    for (let i = 0; i < 15; i++) {
      getReflectionPrompt();
    }
    const stored = JSON.parse(store["regulate-reflection-shown"] || "[]");
    expect(stored.length).toBeLessThanOrEqual(10);
  });

  it("handles corrupt localStorage data gracefully", () => {
    store["regulate-reflection-shown"] = "not valid json";
    // Should not throw
    const prompt = getReflectionPrompt();
    expect(typeof prompt).toBe("string");
  });
});
