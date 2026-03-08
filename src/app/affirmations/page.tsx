"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Data ───────────────────────────────────────────────────────────

type Category = "panic" | "self-worth" | "safety" | "grounding" | "strength";

interface Affirmation {
  text: string;
  category: Category;
}

const categoryLabels: Record<Category, string> = {
  panic: "Panic",
  "self-worth": "Self-Worth",
  safety: "Safety",
  grounding: "Grounding",
  strength: "Strength",
};

const allAffirmations: Affirmation[] = [
  // Panic
  { text: "You are not in danger. This will pass.", category: "panic" },
  { text: "Your body is trying to protect you. It's okay to feel this.", category: "panic" },
  { text: "This is temporary. You have survived every panic attack before this one.", category: "panic" },
  { text: "You don't need to fight this. Let it move through you.", category: "panic" },
  { text: "Your heart is racing because your body loves you. It's trying to keep you safe.", category: "panic" },
  { text: "The worst part is almost over. Stay with your breath.", category: "panic" },
  // Self-Worth
  { text: "You are worthy of care, even when you feel broken.", category: "self-worth" },
  { text: "You don't have to earn rest. You deserve it right now.", category: "self-worth" },
  { text: "You are not too much. You are not too little. You are enough.", category: "self-worth" },
  { text: "Your struggles do not define you. Your courage does.", category: "self-worth" },
  { text: "You are allowed to take up space.", category: "self-worth" },
  { text: "Being kind to yourself is not selfish. It's necessary.", category: "self-worth" },
  // Safety
  { text: "Right now, in this moment, you are safe.", category: "safety" },
  { text: "You are allowed to feel safe even if your body says otherwise.", category: "safety" },
  { text: "The danger has passed. Your body just needs time to catch up.", category: "safety" },
  { text: "You can create safety within yourself, one breath at a time.", category: "safety" },
  { text: "Nothing bad is happening right now. You are okay.", category: "safety" },
  { text: "Your nervous system is learning that it's safe to relax.", category: "safety" },
  // Grounding
  { text: "Feel your feet on the ground. You are here.", category: "grounding" },
  { text: "Come back to your body. It's waiting for you.", category: "grounding" },
  { text: "Right here. Right now. This is where you are. That's enough.", category: "grounding" },
  { text: "Notice what's real. The ground beneath you. The air around you.", category: "grounding" },
  { text: "You are not in the past. You are not in the future. You are here.", category: "grounding" },
  { text: "Your body knows how to be here. Trust it.", category: "grounding" },
  // Strength
  { text: "You have gotten through hard things before. You will get through this.", category: "strength" },
  { text: "You are stronger than your anxiety knows.", category: "strength" },
  { text: "Healing is not linear. Every step forward counts, even the small ones.", category: "strength" },
  { text: "Asking for help is a sign of strength, not weakness.", category: "strength" },
  { text: "You are building resilience every time you ride out a wave.", category: "strength" },
  { text: "The fact that you're here, trying, is proof of your strength.", category: "strength" },
  { text: "Courage isn't the absence of fear. It's showing up anyway.", category: "strength" },
  { text: "You are not starting over. You are starting from experience.", category: "strength" },
];

const STORAGE_KEY = "regulate-favorites";

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

// ─── Accent colors per index ────────────────────────────────────────

const bgAccents = [
  "from-teal/8 to-teal/3",
  "from-candle/6 to-candle/2",
  "from-teal-muted/8 to-teal/3",
  "from-candle/5 to-teal/3",
];

// ─── Component ──────────────────────────────────────────────────────

type Tab = "browse" | "favorites";

export default function AffirmationsPage() {
  const [tab, setTab] = useState<Tab>("browse");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fading, setFading] = useState(false);
  const [favIndex, setFavIndex] = useState(0);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const filtered =
    activeCategory === "all"
      ? allAffirmations
      : allAffirmations.filter((a) => a.category === activeCategory);

  const currentAffirmation = filtered[currentIndex % filtered.length];
  const isFaved = currentAffirmation
    ? favorites.includes(currentAffirmation.text)
    : false;

  const favAffirmations = allAffirmations.filter((a) => favorites.includes(a.text));
  const currentFav = favAffirmations[favIndex % Math.max(1, favAffirmations.length)];

  function advance() {
    setFading(true);
    setTimeout(() => {
      if (tab === "browse") {
        setCurrentIndex((prev) => (prev + 1) % filtered.length);
      } else {
        setFavIndex((prev) => (prev + 1) % favAffirmations.length);
      }
      setFading(false);
    }, 250);
  }

  function toggleFavorite() {
    const text = currentAffirmation?.text;
    if (!text) return;
    const next = isFaved
      ? favorites.filter((f) => f !== text)
      : [...favorites, text];
    setFavorites(next);
    saveFavorites(next);
  }

  function removeFav(text: string) {
    const next = favorites.filter((f) => f !== text);
    setFavorites(next);
    saveFavorites(next);
    if (favIndex >= next.length && next.length > 0) {
      setFavIndex(next.length - 1);
    }
  }

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setFading(false);
  }, [activeCategory]);

  const accentBg = bgAccents[currentIndex % bgAccents.length];

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>

        <header className="mb-6 mt-6 text-center">
          <div className="mb-3 text-4xl">💛</div>
          <h1 className="text-xl font-semibold tracking-tight text-cream">Affirmations</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            Words to hold you when things feel heavy.
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-5 flex justify-center gap-2">
          <button
            onClick={() => setTab("browse")}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "browse" ? "bg-teal/20 text-teal-soft" : "text-cream-dim hover:text-cream"}`}
          >
            Browse
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === "favorites" ? "bg-candle/15 text-candle" : "text-cream-dim hover:text-cream"}`}
          >
            Favorites{favorites.length > 0 && ` (${favorites.length})`}
          </button>
        </div>

        {/* BROWSE TAB */}
        {tab === "browse" && (
          <>
            {/* Category filters */}
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveCategory("all")}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${activeCategory === "all" ? "bg-teal/20 text-teal-soft" : "bg-slate-blue/30 text-cream-dim hover:text-cream"}`}
              >
                All
              </button>
              {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${activeCategory === cat ? "bg-teal/20 text-teal-soft" : "bg-slate-blue/30 text-cream-dim hover:text-cream"}`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* Card */}
            <button
              onClick={advance}
              className={`w-full rounded-2xl border border-teal/15 bg-gradient-to-b ${accentBg} p-8 text-center backdrop-blur-sm transition-all duration-300 active:scale-[0.98]`}
            >
              <p
                className={`text-xl font-light leading-relaxed text-cream transition-opacity duration-250 ${fading ? "opacity-0" : "opacity-100"}`}
              >
                &ldquo;{currentAffirmation?.text}&rdquo;
              </p>
              <span className="mt-4 inline-block rounded-full bg-slate-blue/40 px-2.5 py-0.5 text-xs text-cream-dim">
                {categoryLabels[currentAffirmation?.category]}
              </span>
            </button>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={toggleFavorite}
                className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200 ${
                  isFaved
                    ? "border-candle/40 bg-candle/15 text-candle"
                    : "border-slate-blue/40 bg-deep/60 text-cream-dim hover:border-candle/30 hover:text-candle-soft"
                }`}
                aria-label={isFaved ? "Remove from favorites" : "Add to favorites"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill={isFaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" />
                </svg>
              </button>
              <button
                onClick={advance}
                className="flex h-12 items-center gap-2 rounded-full border border-teal/20 bg-deep/60 px-5 text-sm text-cream-dim transition-colors hover:text-cream"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-cream-dim/40">
              {currentIndex % filtered.length + 1} of {filtered.length}
            </p>
          </>
        )}

        {/* FAVORITES TAB */}
        {tab === "favorites" && (
          <>
            {favAffirmations.length === 0 ? (
              <div className="mt-12 text-center">
                <p className="text-sm text-cream-dim">No favorites yet.</p>
                <p className="mt-1 text-xs text-cream-dim/50">
                  Tap the heart while browsing to save affirmations.
                </p>
              </div>
            ) : (
              <>
                {/* Card view */}
                <button
                  onClick={advance}
                  className="w-full rounded-2xl border border-candle/15 bg-gradient-to-b from-candle/6 to-candle/2 p-8 text-center backdrop-blur-sm transition-all duration-300 active:scale-[0.98]"
                >
                  <p className={`text-xl font-light leading-relaxed text-cream transition-opacity duration-250 ${fading ? "opacity-0" : "opacity-100"}`}>
                    &ldquo;{currentFav?.text}&rdquo;
                  </p>
                </button>

                <div className="mt-4 flex items-center justify-center gap-4">
                  <button
                    onClick={() => currentFav && removeFav(currentFav.text)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-candle/40 bg-candle/15 text-candle transition-colors"
                    aria-label="Remove from favorites"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" />
                    </svg>
                  </button>
                  <button onClick={advance} className="flex h-12 items-center gap-2 rounded-full border border-teal/20 bg-deep/60 px-5 text-sm text-cream-dim hover:text-cream">
                    Next <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>

                <p className="mt-4 text-center text-xs text-cream-dim/40">
                  {favIndex % favAffirmations.length + 1} of {favAffirmations.length} saved
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
