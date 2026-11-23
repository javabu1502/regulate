"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HomeIcon, SafetyPlanIcon, HeadphonesIcon, PracticeIcon } from "@/components/Icons";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on onboarding and during SOS
  const hidden = pathname.startsWith("/onboarding") || pathname.startsWith("/sos");
  if (hidden) return null;

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-blue/20 bg-midnight/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch">
        {/* Home */}
        <NavTab href="/" label="Home" icon={HomeIcon} active={pathname === "/"} />

        {/* Listen — fifteen recorded guided meditations, which were the best
            thing in here and were reachable only from halfway down Practice. */}
        <NavTab href="/meditations" label="Listen" icon={HeadphonesIcon} active={pathname.startsWith("/meditations")} />

        {/* SOS Button - center */}
        <div className="flex flex-1 items-center justify-center py-1.5">
          <button
            onClick={() => {
              window.location.href = "/sos";
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-candle/20 border-2 border-candle/40 text-candle transition-all active:scale-95 hover:bg-candle/30 focus:outline-none focus:ring-2 focus:ring-candle/50"
            aria-label="I need help right now"
          >
            <span className="text-xs font-bold leading-none" aria-hidden="true">SOS</span>
          </button>
        </div>

        {/* Toolkit — the panic kit, contacts, warning signs and reasons.
            This earns the nav slot over Learn, which is reading and is the
            least usable thing mid-distress; Learn is linked from Practice. */}
        <NavTab href="/toolkit" label="My kit" icon={SafetyPlanIcon} active={pathname === "/toolkit"} />

        {/* Practice. Settings moved to the gear in the Home header: it is a
            once-a-month destination and was holding a permanent slot. */}
        <NavTab href="/practice" label="Practice" icon={PracticeIcon} active={pathname === "/practice"} />
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-teal/50 focus:ring-inset ${
        active ? "text-teal-soft" : "text-cream-dim/70 hover:text-cream-dim"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
