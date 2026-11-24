import type { CapacitorConfig } from "@capacitor/cli";

// ─── Native shell ───────────────────────────────────────────────────
// Regulate is a fully static site with no API routes and no server-only
// APIs, so `next build` with output: "export" produces a directory that can
// be bundled straight into an app. Nothing is fetched over the network at
// runtime: the pages, the 173 voice clips and the 15 meditations all ship
// inside the binary, which is what makes the app work in a tunnel, on a
// plane, or on a phone with no signal left.
//
// appId is permanent once a build has been submitted to either store, so it
// is worth being sure about before the first upload.

const config: CapacitorConfig = {
  appId: "consulting.busker.regulate",
  appName: "Regulate",
  webDir: "out",
  backgroundColor: "#0c1526",
  ios: {
    contentInset: "never",
    backgroundColor: "#0c1526",
    // The app is a dark surface edge to edge; letting it scroll past the
    // bounds shows white.
    scrollEnabled: true,
  },
  android: {
    backgroundColor: "#0c1526",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#0c1526",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#93b8b3",
    },
  },
};

export default config;
