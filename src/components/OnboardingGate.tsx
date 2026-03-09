"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ONBOARDING_KEY = "onboarding_complete";

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Don't gate the onboarding page itself
    if (pathname === "/onboarding") {
      setChecked(true);
      return;
    }

    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      router.replace("/onboarding");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked && pathname !== "/onboarding") {
    // Show nothing while checking — prevents flash
    return <div className="min-h-screen bg-midnight" />;
  }

  return <>{children}</>;
}
