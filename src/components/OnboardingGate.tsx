"use client";

// Onboarding gate removed - app is now open by default.
// Keeping component to avoid breaking layout.tsx import.

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
