"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import VoiceOffer from "@/components/VoiceOffer";

// Modules that play spoken guidance. The voice offer appears on the first of
// these someone opens, and nowhere else.
const VOICE_ROUTES = ["/breathing", "/grounding", "/body-scan", "/somatic", "/affirmations"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onVoiceRoute = VOICE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  return (
    <>
      {children}
      {onVoiceRoute && <VoiceOffer />}
      <BottomNav />
    </>
  );
}
