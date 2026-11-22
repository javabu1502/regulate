"use client";

// Single source of truth for the app's public address, so the deploy URL is
// not pasted into pages. Set NEXT_PUBLIC_APP_URL in the deploy environment
// once there is a real domain; until then the live origin is used at runtime.

const CONFIGURED = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");

/** Full origin, e.g. "https://regulate.app". Empty string if not yet known. */
export function appUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return window.location.origin;
  }
  return CONFIGURED;
}

/** Host only, e.g. "regulate.app". Empty string if not yet known. */
export function appHost(): string {
  const url = appUrl();
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}
