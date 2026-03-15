"use client";

import Link from "next/link";
import AmbientAudio from "@/components/AmbientAudio";
import PageTransition from "@/components/PageTransition";

const games = [
  {
    href: "/games/bubbles",
    title: "Bubble Pop",
    description: "Pop bubbles. That's it.",
    color: "teal",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="11" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <circle cx="16" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="15" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      </svg>
    ),
  },
  {
    href: "/games/garden",
    title: "Breathing Garden",
    description: "Hold to grow a flower, let go to bloom.",
    color: "lavender",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 22V12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M12 12C12 9.5 14.5 7 17 7C17 9.5 14.5 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.7"
        />
        <path
          d="M12 12C12 9.5 9.5 7 7 7C7 9.5 9.5 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.7"
        />
        <path
          d="M12 12C12 8 14 5 12 3C10 5 12 8 12 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
    ),
  },
  {
    href: "/games/color-wash",
    title: "Color Wash",
    description: "Paint with your finger. Just color.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3C7 3 3 7 3 12c0 2.5 1 4 3 4 1.5 0 2-.8 2-2 0-1.5.7-2 2-2s2 .5 2 2c0 3 1.5 5 4 5 3.5 0 5-3 5-7 0-5-3.6-9-9-9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" opacity="0.5" />
        <circle cx="12" cy="7" r="1.2" fill="currentColor" opacity="0.4" />
        <circle cx="15.5" cy="9" r="1.2" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    href: "/games/stars",
    title: "Constellations",
    description: "Tap to place stars, make your own shapes.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="10" cy="5" r="1.5" fill="currentColor" opacity="0.7" />
        <circle cx="16" cy="7" r="1.5" fill="currentColor" opacity="0.5" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="14" cy="17" r="1.5" fill="currentColor" opacity="0.7" />
        <path
          d="M5 8L10 5L16 7L19 12L14 17"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
          strokeDasharray="2 3"
        />
      </svg>
    ),
  },
  {
    href: "/games/stones",
    title: "Stone Stacking",
    description: "Stack stones. See how high you can go.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <ellipse
          cx="12"
          cy="18"
          rx="7"
          ry="2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <ellipse
          cx="12"
          cy="13"
          rx="5.5"
          ry="2"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <ellipse
          cx="12"
          cy="9"
          rx="4"
          ry="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
    ),
  },
  {
    href: "/games/ripples",
    title: "Ripple Pool",
    description: "Tap the water. Watch the ripples.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="2"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <circle
          cx="12"
          cy="12"
          r="5"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.3"
        />
      </svg>
    ),
  },
  {
    href: "/games/sand",
    title: "Sand Garden",
    description: "Drag to rake lines in the sand.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <line x1="4" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="4" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <ellipse cx="14" cy="12" rx="2.5" ry="2" fill="currentColor" opacity="0.3" />
        <ellipse cx="8" cy="16" rx="2" ry="1.5" fill="currentColor" opacity="0.25" />
      </svg>
    ),
  },
  {
    href: "/games/burn",
    title: "Burn a Note",
    description: "Write something down. Watch it burn away.",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C12 3 8 7 8 11.5C8 14 10 16 12 16C14 16 16 14 16 11.5C16 7 12 3 12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d="M12 16V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
];

export default function GamesPage() {
  return (
    <PageTransition>
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-y-px"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>
        <AmbientAudio />
        </div>

        <header className="mb-8 mt-6 text-center">
          <div className="mb-3 flex justify-center">
            <svg
              className="h-8 w-8 text-teal-soft"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="8"
                cy="10"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="16"
                cy="8"
                r="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="14"
                cy="16"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-cream">
            Mindful Games
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            Something to do with your hands.
          </p>
        </header>

        {/* Decorative divider */}
        <div className="mb-6 flex justify-center">
          <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
            <path
              d="M0 4C10 0 20 8 30 4C40 0 50 8 60 4"
              stroke="rgba(42,107,110,0.3)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-3">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm transition-all hover:bg-teal/5 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal/10">
                  {game.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-medium text-cream">
                    {game.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-cream-dim">
                    {game.description}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 text-cream-dim/40 transition-colors group-hover:text-cream-dim"
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
