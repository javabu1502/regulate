"use client";

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// ─── Haptics ────────────────────────────────────────────────────────
// Every cue in here used navigator.vibrate, which iOS ignores completely.
// Safari has never implemented the Vibration API and the webview inside the
// native app does not either, so on an iPhone this file did nothing at all,
// silently, including the eyes-free breathing guides whose entire job is to
// pace a breath you are not looking at.
//
// On a native build the cues go through the Taptic Engine instead. The web
// build keeps navigator.vibrate, which does work on Android browsers.
//
// The native API is a small set of named impacts rather than millisecond
// patterns, so each cue is expressed as a short sequence of those. The gaps
// are what carry the rhythm, which is the part that matters for pacing.

const HAPTICS_KEY = "regulate-haptics-enabled";

const NATIVE = typeof window !== "undefined" && Capacitor.isNativePlatform();

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

/** One impact on the Taptic Engine. Failures are never worth surfacing. */
function impact(style: ImpactStyle) {
  Haptics.impact({ style }).catch(() => { /* no engine, or denied */ });
}

/**
 * A rhythm of impacts. `beats` are the gaps in milliseconds between them,
 * so [0, 180, 180] fires three times a fifth of a second apart.
 */
function sequence(style: ImpactStyle, beats: number[]) {
  beats.forEach((at, i) => {
    if (i === 0 && at === 0) impact(style);
    else setTimeout(() => impact(style), beats.slice(0, i + 1).reduce((a, b) => a + b, 0));
  });
}

function cue(web: number | number[], native: () => void) {
  if (!isEnabled()) return;
  if (NATIVE) {
    try { native(); } catch { /* */ }
  } else {
    vibrate(web);
  }
}

export const haptics = {
  breatheIn: () => cue([10, 20, 10, 20, 10], () => sequence(ImpactStyle.Light, [0, 160, 160])),
  breatheOut: () => cue([30], () => impact(ImpactStyle.Medium)),
  tap: () => cue(30, () => impact(ImpactStyle.Medium)),
  groundingCheck: () => cue([10, 50, 10], () => sequence(ImpactStyle.Light, [0, 220])),
  complete: () => cue([10, 30, 10, 30, 10, 50], () =>
    Haptics.notification({ type: NotificationType.Success }).catch(() => { /* */ })),
  light: () => cue(10, () => impact(ImpactStyle.Light)),
  subtle: () => cue(8, () => impact(ImpactStyle.Light)),
  transition: () => cue([15, 30, 15], () => sequence(ImpactStyle.Light, [0, 140])),

  // Eyes-free breathing guides
  /** Rhythmic quick pulses to guide inhale pace */
  inhaleGuide: () => cue([15, 40, 15, 40, 15], () => sequence(ImpactStyle.Light, [0, 180, 180])),
  /** Single gentle tap for hold phase */
  holdGuide: () => cue(20, () => impact(ImpactStyle.Light)),
  /** Longer, slower vibration pulse for exhale pace */
  exhaleGuide: () => cue([40, 60, 40], () => sequence(ImpactStyle.Medium, [0, 300, 300])),
  /** Distinct double-tap for phase transitions */
  phaseChange: () => cue([25, 80, 25], () => sequence(ImpactStyle.Medium, [0, 120])),
};
