"use client";

const JOURNAL_KEY = "regulate-journal";

interface AnyEntry {
  timestamp?: number;
  date?: string;
}

function getCompletionDates(): Set<string> {
  const dates = new Set<string>();
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return dates;
    const entries: AnyEntry[] = JSON.parse(raw);
    entries.forEach((e) => {
      const ts = e.timestamp || (e.date ? new Date(e.date).getTime() : 0);
      if (ts > 0) {
        dates.add(new Date(ts).toISOString().slice(0, 10));
      }
    });
  } catch { /* */ }
  return dates;
}

export function computeStreak(): { current: number; total: number } {
  const dates = getCompletionDates();
  const total = dates.size;
  if (total === 0) return { current: 0, total: 0 };

  // Compute current streak (consecutive days ending today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  const checkDate = new Date(today);

  // Allow starting from today or yesterday
  if (!dates.has(checkDate.toISOString().slice(0, 10))) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!dates.has(checkDate.toISOString().slice(0, 10))) {
      return { current: 0, total };
    }
  }

  while (dates.has(checkDate.toISOString().slice(0, 10))) {
    current++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return { current, total };
}
