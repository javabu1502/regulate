"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HomeIcon, JournalIcon, SettingsIcon } from "@/components/Icons";

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

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

        {/* SOS Button - center */}
        <div className="flex flex-1 items-center justify-center py-1.5">
          <Link
            href="/sos"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-candle/15 border border-candle/30 text-candle transition-all active:scale-95 hover:bg-candle/25 focus:outline-none focus:ring-2 focus:ring-candle/50"
            aria-label="I need help right now"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12H8L10 7L12 17L14 10L16 12H20" />
            </svg>
          </Link>
        </div>

        {/* Journal */}
        <NavTab href="/journal" label="Journal" icon={JournalIcon} active={pathname === "/journal"} />

        {/* Settings */}
        <NavTab href="/settings" label="Settings" icon={SettingsIcon} active={pathname.startsWith("/settings")} />
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
