"use client";

import { useEffect, useRef } from "react";

/**
 * Saves and restores scroll position using sessionStorage.
 * Debounces the scroll handler to avoid excessive writes.
 */
export function useScrollMemory(key: string, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const storageKey = `regulate-scroll-${key}`;

    // Restore scroll position on mount
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const y = parseInt(saved, 10);
      if (!isNaN(y)) {
        // Use rAF to ensure DOM is ready
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }

    // Save scroll position on scroll (debounced)
    function onScroll() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }, 150);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
      sessionStorage.removeItem(storageKey);
    };
  }, [key, enabled]);
}
