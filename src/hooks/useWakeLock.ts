"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Already released
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      release();
      return;
    }

    let cancelled = false;

    async function request() {
      if (!("wakeLock" in navigator)) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release();
        } else {
          wakeLockRef.current = sentinel;
        }
      } catch {
        // Wake lock request failed - not supported or permission denied
      }
    }

    request();

    return () => {
      cancelled = true;
      release();
    };
  }, [active, release]);

  return release;
}
