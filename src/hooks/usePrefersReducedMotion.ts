"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the OS "reduce motion" preference, and keeps tracking it if the
 * person changes it while a page is open.
 *
 * The CSS in globals.css already stops declarative animations. This is for
 * canvas work, where the motion is driven by requestAnimationFrame and the
 * media query cannot reach it.
 *
 * Starts false so the server render and the first client render agree.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default usePrefersReducedMotion;
