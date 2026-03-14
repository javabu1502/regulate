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
  title: "Regulate - Nervous System Support",
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
  userScalable: true,
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
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var ts = localStorage.getItem('regulate-text-size');
            if (!ts) {
              var oldFs = localStorage.getItem('regulate-font-size');
              if (oldFs === 'large') ts = 'large';
            }
            if (ts === 'large') {
              document.documentElement.classList.add('large-text');
              document.body && document.body.classList.add('text-size-large');
            } else if (ts === 'xl') {
              document.body && document.body.classList.add('text-size-xl');
            }
            var nm = localStorage.getItem('regulate-night-mode');
            if (nm === 'on') {
              document.documentElement.classList.add('night-mode');
            } else if (nm !== 'off') {
              var h = new Date().getHours();
              if (h >= 22 || h < 6) {
                document.documentElement.classList.add('night-mode');
              }
            }
          } catch(e) {}
        `}} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal/20 focus:px-4 focus:py-2 focus:text-sm focus:text-teal-soft">
          Skip to content
        </a>
        <RegisterSW />
        <OnboardingGate><AppShell><main id="main-content">{children}</main></AppShell></OnboardingGate>
      </body>
    </html>
  );
}
