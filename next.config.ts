import type { NextConfig } from "next";

// The native build exports a plain directory of files for Capacitor to
// bundle. The web build does not, because it needs the headers rule below
// to stop browsers caching the service worker, and `output: export` drops
// headers entirely. One flag rather than two configs.
const NATIVE = process.env.BUILD_TARGET === "native";

const nextConfig: NextConfig = {
  ...(NATIVE ? { output: "export" as const, images: { unoptimized: true } } : {}),
  async headers() {
    return [
      {
        // Prevent browser from caching the service worker file
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
