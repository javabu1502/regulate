"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Safety Plan has been merged into the Emergency Toolkit.
// This page redirects users who have bookmarked /safety-plan.

export default function SafetyPlanRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Migrate old safety plan data to toolkit keys if needed
    try {
      const oldPlan = localStorage.getItem("regulate-safety-plan");
      if (oldPlan) {
        const data = JSON.parse(oldPlan);
        // Migrate warning signs
        if (data.warningSigns && !localStorage.getItem("regulate-toolkit-warnings")) {
          const filtered = data.warningSigns.filter((s: string) => s.trim());
          if (filtered.length > 0) {
            localStorage.setItem("regulate-toolkit-warnings", JSON.stringify(filtered));
          }
        }
        // Migrate reasons
        if (data.reasons && !localStorage.getItem("regulate-toolkit-reasons")) {
          const filtered = data.reasons.filter((s: string) => s.trim());
          if (filtered.length > 0) {
            localStorage.setItem("regulate-toolkit-reasons", JSON.stringify(filtered));
          }
        }
        // Migrate coping strategies into exercises if toolkit exercises are empty
        // (coping strategies are free-text so we can't auto-map them perfectly)
      }
    } catch {}

    router.replace("/toolkit");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight">
      <p className="text-sm text-cream-dim/40">Redirecting to your toolkit...</p>
    </div>
  );
}
