"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// ─── Native shell setup ─────────────────────────────────────────────
// Runs once, only inside the packaged app. On the web every call here is
// skipped, so the browser build is unchanged.
//
// The plugins are imported lazily rather than at the top of the file. A
// static import would pull the native bridges into the web bundle for every
// visitor to the site, who will never call any of them.

export default function NativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        // The app is dark everywhere, so the clock and battery want to be light.
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#0c1526" });
        }
      } catch { /* a status bar is not worth an error */ }

      try {
        // Hold the splash until the first screen has actually painted, so
        // there is no flash of empty background on a cold start.
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch { /* */ }
    })();
  }, []);

  return null;
}
