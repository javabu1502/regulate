/**
 * localStorage cleanup utilities for Regulate.
 * Keeps stored arrays trimmed and provides usage reporting.
 */

/**
 * Entries across the app store their time under different fields and formats:
 * journal uses `timestamp` (ms number, older entries only had `date` ISO),
 * sos-history uses `ts` (ISO string), sessions use `ts` (ms number).
 */
export function entryTime(entry: unknown): number {
  if (typeof entry !== "object" || entry === null) return 0;
  const e = entry as Record<string, unknown>;
  for (const value of [e.timestamp, e.ts, e.date, e.id]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export function pruneOldEntries(key: string, maxEntries: number): void {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const arr: unknown[] = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length <= maxEntries) return;

    // Sort by time descending, keep the most recent
    const sorted = [...arr].sort((a, b) => entryTime(b) - entryTime(a));

    localStorage.setItem(key, JSON.stringify(sorted.slice(0, maxEntries)));
  } catch {
    // Silently fail - pruning is an enhancement
  }
}

export function getStorageUsage(): { used: number; keys: { key: string; bytes: number }[] } {
  const keys: { key: string; bytes: number }[] = [];
  let total = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) ?? "";
      const bytes = (key.length + value.length) * 2; // UTF-16
      total += bytes;

      if (key.startsWith("regulate-")) {
        keys.push({ key, bytes });
      }
    }
  } catch {
    // Silently fail
  }

  keys.sort((a, b) => b.bytes - a.bytes);
  return { used: total, keys };
}
