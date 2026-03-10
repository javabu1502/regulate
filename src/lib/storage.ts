/**
 * localStorage cleanup utilities for Regulate.
 * Keeps stored arrays trimmed and provides usage reporting.
 */

export function pruneOldEntries(key: string, maxEntries: number): void {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const arr: unknown[] = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length <= maxEntries) return;

    // Sort by timestamp descending, keep the most recent
    const sorted = [...arr].sort((a, b) => {
      const tA = typeof a === "object" && a !== null ? Number((a as Record<string, unknown>).timestamp ?? 0) : 0;
      const tB = typeof b === "object" && b !== null ? Number((b as Record<string, unknown>).timestamp ?? 0) : 0;
      return tB - tA;
    });

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
