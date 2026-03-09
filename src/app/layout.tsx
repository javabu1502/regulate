import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import OnboardingGate from "@/components/OnboardingGate";
import AppShell from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regulate — Nervous System Support",
  description:
    "Gentle tools for panic attacks, anxiety, and nervous system regulation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Regulate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal/20 focus:px-4 focus:py-2 focus:text-sm focus:text-teal-soft">
          Skip to content
        </a>
        <RegisterSW />
        <OnboardingGate><AppShell><div id="main-content">{children}</div></AppShell></OnboardingGate>
      </body>
    </html>
  );
}
