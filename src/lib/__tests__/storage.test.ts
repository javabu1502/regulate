import { describe, it, expect, beforeEach } from "vitest";
import { entryTime, pruneOldEntries } from "../storage";

// Minimal localStorage stub for the node environment
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
});

describe("entryTime", () => {
  it("reads numeric timestamp (journal)", () => {
    expect(entryTime({ timestamp: 1700000000000 })).toBe(1700000000000);
  });

  it("reads ISO-string ts (sos-history)", () => {
    expect(entryTime({ ts: "2026-08-05T12:00:00.000Z" })).toBe(Date.parse("2026-08-05T12:00:00.000Z"));
  });

  it("reads numeric ts (sessions)", () => {
    expect(entryTime({ ts: 1700000000000 })).toBe(1700000000000);
  });

  it("falls back to ISO date, then numeric id", () => {
    expect(entryTime({ date: "2026-08-05T12:00:00.000Z" })).toBe(Date.parse("2026-08-05T12:00:00.000Z"));
    expect(entryTime({ id: "1700000000000" })).toBe(1700000000000);
  });

  it("returns 0 for unrecognized shapes", () => {
    expect(entryTime({})).toBe(0);
    expect(entryTime(null)).toBe(0);
    expect(entryTime("nope")).toBe(0);
  });
});

describe("pruneOldEntries", () => {
  it("keeps the most recent entries across mixed field shapes", () => {
    const entries = [
      { id: "a", timestamp: 1000 },
      { id: "b", date: new Date(3000).toISOString() },
      { id: "c", ts: new Date(2000).toISOString() },
      { id: "d", ts: 4000 },
    ];
    localStorage.setItem("k", JSON.stringify(entries));
    pruneOldEntries("k", 2);
    const kept = JSON.parse(localStorage.getItem("k")!);
    expect(kept.map((e: { id: string }) => e.id)).toEqual(["d", "b"]);
  });

  it("does nothing when under the cap", () => {
    const entries = [{ id: "a", timestamp: 1 }];
    localStorage.setItem("k", JSON.stringify(entries));
    pruneOldEntries("k", 10);
    expect(JSON.parse(localStorage.getItem("k")!)).toEqual(entries);
  });
});
