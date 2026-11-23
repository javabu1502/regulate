"use client";

import { useState, useEffect } from "react";
import { getCurrentNSState } from "@/components/NSStateSelector";
import Link from "next/link";
import AmbientAudio from "@/components/AmbientAudio";
import PageTransition from "@/components/PageTransition";
import { isGameSoundEnabled, setGameSoundEnabled } from "@/lib/game-sound";

// Which nervous-system state each game actually suits, so the list can lead
// with what fits instead of being a flat pile. Most of these calm or
// discharge; Looking Around is the one that gently activates, which is what
// shutdown actually needs.
export type BodyState = "panicking" | "anxious" | "shutdown";

// Seventeen games is too many to scan as one list. Ordered so the ones that
// ask least of you come first, and the single activating one is called out
// at the end rather than hidden among the calming ones.
// What each group is actually for. A run of game names read as noise and
// said nothing; a line of purpose is the thing you are choosing between.
const GROUP_BLURB: Record<string, string> = {
  "Something to follow": "A rhythm or a path. Nothing to decide.",
  "Quiet company": "Something present that asks nothing of you.",
  "Busy hands": "Repetitive and tactile. Somewhere to put the restlessness.",
  "Make something": "Open-ended. You leave a mark.",
  "Let it go": "Set something down and have it taken.",
  "When you're numb": "Wakes you up a little instead of settling you.",
};

const GROUP_ORDER = [
  "Something to follow",
  "Quiet company",
  "Busy hands",
  "Make something",
  "Let it go",
  "When you're numb",
] as const;

const games = [
  {
    href: "/games/koi",
    group: "Quiet company",
    states: ["shutdown", "anxious"] as BodyState[],
    forWhat: "Company, on its own terms",
    title: "Koi",
    description: "Hold still and the fish come over.",
    color: "teal",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <ellipse cx="13" cy="12" rx="5" ry="2.6" />
        <path d="M8 12l-3.5 2.2V9.8L8 12Z" />
        <circle cx="16" cy="11.2" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/games/beads",
    group: "Something to follow",
    states: ["anxious", "panicking"] as BodyState[],
    forWhat: "The hand counts so you don't have to",
    title: "Beads",
    description: "Move one bead at a time. One per breath.",
    color: "candle",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="12" cy="12" r="7.5" opacity="0.4" />
        <circle cx="12" cy="4.5" r="2" fill="currentColor" opacity="0.8" />
        <circle cx="19.5" cy="12" r="1.5" />
        <circle cx="12" cy="19.5" r="1.5" />
        <circle cx="4.5" cy="12" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/games/tide",
    group: "Let it go",
    states: ["anxious", "panicking"] as BodyState[],
    forWhat: "Set something down and let it go",
    title: "Tide",
    description: "Put a stone on the sand. The water takes it.",
    color: "lavender",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" />
        <path d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" opacity="0.5" />
        <ellipse cx="9" cy="9" rx="2.4" ry="1.6" />
      </svg>
    ),
  },

  {
    href: "/games/labyrinth",
    group: "Something to follow",
    states: ["panicking", "anxious"] as BodyState[],
    forWhat: "One line, one direction, nothing to decide",
    title: "Labyrinth",
    description: "Trace a path with a finger. Four shapes.",
    color: "teal",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4 4 6 6 0 1 1 6-6 8 8 0 1 1-8 8" />
      </svg>
    ),
  },
  {
    href: "/games/mandala",
    group: "Make something",
    states: ["anxious"] as BodyState[],
    forWhat: "Aimless movement comes back ordered",
    title: "Mandala",
    description: "Draw, and it mirrors itself.",
    color: "lavender",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
        <path d="M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2" opacity="0.55" />
      </svg>
    ),
  },
  {
    href: "/games/chimes",
    group: "Quiet company",
    states: ["anxious", "shutdown"] as BodyState[],
    forWhat: "Sound-led, works with your eyes closed",
    title: "Bowls",
    description: "Sound them. They ring on and layer.",
    color: "candle",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M6 4v16M10.5 6v12M15 4v16M19.5 7v10" />
      </svg>
    ),
  },

  {
    href: "/games/looking-around",
    group: "When you're numb",
    states: ["shutdown", "anxious"] as BodyState[],
    forWhat: "Wakes you up a little when you're numb",
    title: "Looking Around",
    description: "Find the light, touch it, look for the next.",
    color: "candle",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        <path d="M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" opacity="0.5" />
      </svg>
    ),
  },
  {
    href: "/games/crossing",
    group: "Something to follow",
    states: ["panicking", "anxious"] as BodyState[],
    forWhat: "Left-right rhythm, nothing to do",
    title: "Crossing",
    description: "A light moves side to side. Follow it.",
    color: "teal",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 12h18" opacity="0.4" />
        <circle cx="7" cy="12" r="2.5" />
        <circle cx="17" cy="12" r="1.5" opacity="0.45" />
      </svg>
    ),
  },
  {
    href: "/games/nothing",
    group: "Something to follow",
    states: ["panicking", "anxious", "shutdown"] as BodyState[],
    forWhat: "When following instructions is too much",
    title: "Nothing To Do",
    description: "A shape, breathing. That's all.",
    color: "lavender",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="8" opacity="0.35" />
      </svg>
    ),
  },

  {
    href: "/games/bubbles",
    group: "Busy hands",
    states: ["anxious", "panicking"] as BodyState[],
    forWhat: "Busy hands, nothing to decide",
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
    group: "Something to follow",
    states: ["anxious", "panicking"] as BodyState[],
    forWhat: "Paces your breathing",
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
    group: "Make something",
    states: ["anxious"] as BodyState[],
    forWhat: "Open-ended, no goal",
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
    group: "Make something",
    states: ["anxious", "shutdown"] as BodyState[],
    forWhat: "Gentle focus, light activity",
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
    group: "Busy hands",
    states: ["anxious"] as BodyState[],
    forWhat: "Slow hands, steady attention",
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
    group: "Quiet company",
    states: ["anxious", "shutdown"] as BodyState[],
    forWhat: "Just watch something respond",
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
    group: "Busy hands",
    states: ["anxious", "panicking"] as BodyState[],
    forWhat: "Repetitive, tactile",
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
    group: "Let it go",
    states: ["panicking"] as BodyState[],
    forWhat: "Put something down and be rid of it",
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
  // The body state the person last reported. The list is ordered by it rather
  // than being a flat eight, so someone frozen is not handed the most
  // sedating option first.
  const [bodyState, setBodyState] = useState<BodyState | null>(null);
  // One group open at a time, the same way the exercises list behaves.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  useEffect(() => {
    // The state selector speaks in polyvagal terms; the games are tagged in
    // the same words the SOS triage uses.
    const map: Record<string, BodyState> = {
      hyperactivated: "panicking",
      activated: "anxious",
      hypoactivated: "shutdown",
    };
    const current = getCurrentNSState();
    const state = current ? map[current] : undefined;
    if (state) setBodyState(state);
    // Everything starts closed. Each heading lists what is inside, so the
    // whole set can be read without opening anything.
  }, []);

  // Read after mount: a lazy initializer would read localStorage during the
  // first render and disagree with the static prerender.
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => {
    setSoundOn(isGameSoundEnabled());
  }, []);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setGameSoundEnabled(next);
            }}
            className={`transition-colors ${soundOn ? "text-cream-dim/60" : "text-cream-dim/25"}`}
            aria-label={soundOn ? "Sound effects on" : "Sound effects off"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              {soundOn ? (
                <>
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </>
              ) : (
                <line x1="23" y1="9" x2="17" y2="15" />
              )}
            </svg>
          </button>
          <AmbientAudio />
        </div>
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

        {bodyState && (
          <p className="mb-3 text-[11px] text-cream-dim/40">
            Groups that suit how you said you were feeling are marked.
            Anything here is fine to try.
          </p>
        )}

        <div className="flex flex-col gap-1">
          {GROUP_ORDER.map((groupName) => {
            // Inside a group, anything suiting the reported state comes first.
            const inGroup = games
              .filter((g) => g.group === groupName)
              .sort((a, b) =>
                bodyState
                  ? Number(b.states.includes(bodyState)) -
                    Number(a.states.includes(bodyState))
                  : 0,
              );
            if (inGroup.length === 0) return null;
            const isOpen = openGroup === groupName;
            const suits = bodyState
              ? inGroup.filter((g) => g.states.includes(bodyState)).length
              : 0;
            return (
              <section key={groupName}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : groupName)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-xl px-1 py-3.5 transition-colors hover:bg-deep/40"
                >
                  <span className="flex min-w-0 flex-col items-start gap-1 pr-3 text-left">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[11px] uppercase tracking-widest text-cream-dim/75">
                        {groupName}
                      </span>
                      {suits > 0 && (
                        <span className="text-[10px] text-teal-soft/50">suits you now</span>
                      )}
                    </span>
                    {!isOpen && (
                      <span className="text-[11px] leading-relaxed text-cream-dim/40">
                        {GROUP_BLURB[groupName]}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-cream-dim/25">{inGroup.length}</span>
                    <svg
                      className={`h-3.5 w-3.5 text-cream-dim/25 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </span>
                </button>
                <div className={`flex flex-col gap-3 ${isOpen ? "mt-3" : "hidden"}`}>
                  {inGroup.map((game) => (

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
                  <p className="mt-1 text-[11px] text-cream-dim/35">
                    {game.forWhat}
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
              </section>
            );
          })}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
