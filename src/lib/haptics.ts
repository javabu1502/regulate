"use client";

const HAPTICS_KEY = "regulate-haptics-enabled";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Default to enabled
    const val = localStorage.getItem(HAPTICS_KEY);
    return val === null || val === "1";
  } catch { return false; }
}

export function setHapticsEnabled(enabled: boolean) {
  localStorage.setItem(HAPTICS_KEY, enabled ? "1" : "0");
}

export function getHapticsEnabled(): boolean {
  return isEnabled();
}

function vibrate(pattern: number | number[]) {
  if (!isEnabled()) return;
  try { navigator.vibrate?.(pattern); } catch { /* */ }
}

export const haptics = {
  breatheIn: () => vibrate([10, 20, 10, 20, 10]),
  breatheOut: () => vibrate([30]),
  tap: () => vibrate(30),
  groundingCheck: () => vibrate([10, 50, 10]),
  complete: () => vibrate([10, 30, 10, 30, 10, 50]),
  light: () => vibrate(10),
  subtle: () => vibrate(8),
  transition: () => vibrate([15, 30, 15]),

  // Eyes-free breathing guides
  /** Rhythmic quick pulses to guide inhale pace */
  inhaleGuide: () => vibrate([15, 40, 15, 40, 15]),
  /** Single gentle tap for hold phase */
  holdGuide: () => vibrate(20),
  /** Longer, slower vibration pulse for exhale pace */
  exhaleGuide: () => vibrate([40, 60, 40]),
  /** Distinct double-tap for phase transitions */
  phaseChange: () => vibrate([25, 80, 25]),
};
