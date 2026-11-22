"use client";

/**
 * Usable height for a full-screen game canvas.
 *
 * The bottom nav floats above the canvas, so pointer events inside its strip
 * never reach the canvas. Sizing a drawing surface to the full viewport leaves
 * a band at the bottom that looks drawable and is not. Measuring the nav keeps
 * what you can see and what you can touch the same, and picks up the iOS safe
 * area for free.
 */
export function canvasHeight(): number {
  if (typeof window === "undefined") return 0;
  let reserved = 0;
  try {
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    reserved = nav ? nav.getBoundingClientRect().height : 0;
  } catch {
    reserved = 0;
  }
  return Math.max(120, window.innerHeight - reserved);
}
