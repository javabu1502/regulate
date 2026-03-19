"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AffirmationsIcon } from "@/components/Icons";
import { haptics } from "@/lib/haptics";
import { getCurrentNSState, type NSState } from "@/components/NSStateSelector";
import { useAudioGuide } from "@/hooks/useAudioGuide";

// ─── Data ───────────────────────────────────────────────────────────

type Category =
  | "panic"
  | "self-worth"
  | "safety"
  | "grounding"
  | "strength"
  | "healing"
  | "boundaries"
  | "self-compassion"
  | "personal";

interface Affirmation {
  text: string;
  category: Category;
}

const categories: { id: Category; label: string; desc: string }[] = [
  { id: "panic", label: "In panic", desc: "When your body is in overdrive" },
  { id: "safety", label: "Feeling unsafe", desc: "When you need to feel held" },
  { id: "grounding", label: "Disconnected", desc: "When you need to come back" },
  { id: "self-worth", label: "Feeling small", desc: "When you forget your value" },
  { id: "strength", label: "Exhausted", desc: "When you need to keep going" },
  { id: "healing", label: "In recovery", desc: "When healing feels slow" },
  { id: "self-compassion", label: "Being hard on yourself", desc: "When you need gentleness" },
  { id: "boundaries", label: "Overwhelmed by others", desc: "When you need space" },
];

const builtInAffirmations: Affirmation[] = [
  // Panic - body-first, no toxic positivity
  { text: "My body is protecting me. This will pass.", category: "panic" },
  { text: "I have survived every panic attack before this one. This one is no different.", category: "panic" },
  { text: "I don't need to fight this. I can let it move through me like a wave.", category: "panic" },
  { text: "My heart is racing because my body loves me. It's trying to keep me safe.", category: "panic" },
  { text: "The worst part is almost over. I'm staying with my breath.", category: "panic" },
  { text: "I am not dying. I am not going crazy. This is adrenaline. It will pass.", category: "panic" },
  { text: "My body knows how to come back from this. It has done it every time.", category: "panic" },
  { text: "I let my shoulders drop. I unclench my jaw. I am safe enough right now.", category: "panic" },

  // Safety - when hypervigilance is running
  { text: "Right now, in this moment, I am safe.", category: "safety" },
  { text: "The danger has passed. My body just needs time to catch up.", category: "safety" },
  { text: "I am allowed to feel safe even if my body says otherwise.", category: "safety" },
  { text: "Nothing is happening to me right now. I am here. I am whole.", category: "safety" },
  { text: "My nervous system is learning that it's safe to relax. I give it time.", category: "safety" },
  { text: "I can create safety within myself, one breath at a time.", category: "safety" },
  { text: "Safety isn't the absence of fear. It's knowing I can hold myself through it.", category: "safety" },

  // Grounding - when dissociated or floating
  { text: "I feel my feet on the ground. I am here.", category: "grounding" },
  { text: "I come back to my body. It's waiting for me.", category: "grounding" },
  { text: "Right here. Right now. This is where I am. That's enough.", category: "grounding" },
  { text: "I notice what's real. The ground beneath me. The air around me.", category: "grounding" },
  { text: "I am not in the past. I am not in the future. I am here.", category: "grounding" },
  { text: "My body knows how to be here. I trust it.", category: "grounding" },
  { text: "I press my hands together. I feel the pressure. That's me. I'm real.", category: "grounding" },

  // Self-Worth
  { text: "I am worthy of care, even when I feel broken.", category: "self-worth" },
  { text: "I don't have to earn rest. I deserve it right now.", category: "self-worth" },
  { text: "I am not too much. I am not too little. I am enough.", category: "self-worth" },
  { text: "My struggles do not define me. My courage does.", category: "self-worth" },
  { text: "I am allowed to take up space.", category: "self-worth" },
  { text: "Being kind to myself is not selfish. It's necessary.", category: "self-worth" },
  { text: "I matter, even on the days I can't feel it.", category: "self-worth" },

  // Strength - when depleted
  { text: "I have gotten through hard things before. I will get through this.", category: "strength" },
  { text: "I am stronger than my anxiety knows.", category: "strength" },
  { text: "Asking for help is a sign of strength, not weakness.", category: "strength" },
  { text: "I am building resilience every time I ride out a wave.", category: "strength" },
  { text: "The fact that I'm here, trying, is proof of my strength.", category: "strength" },
  { text: "Courage isn't the absence of fear. It's showing up anyway.", category: "strength" },
  { text: "I am not starting over. I am starting from experience.", category: "strength" },
  { text: "I don't have to be brave all the time. Just brave enough for the next breath.", category: "strength" },

  // Healing
  { text: "Healing is not about going back to who I was. It's about becoming who I'm meant to be.", category: "healing" },
  { text: "I don't have to heal all at once. One breath at a time.", category: "healing" },
  { text: "Recovery isn't linear. Bad days don't erase my progress.", category: "healing" },
  { text: "My body remembers what my mind has tried to forget. I am patient with it.", category: "healing" },
  { text: "Every small step forward counts, even when it doesn't feel like it.", category: "healing" },
  { text: "I am not broken. I am healing. Those are very different things.", category: "healing" },

  // Self-Compassion
  { text: "I talk to myself the way I'd talk to someone I love.", category: "self-compassion" },
  { text: "I am doing the best I can with what I have right now.", category: "self-compassion" },
  { text: "It's okay to not be okay. I don't have to perform wellness.", category: "self-compassion" },
  { text: "I deserve the same kindness I give to others.", category: "self-compassion" },
  { text: "My feelings are valid, even the messy ones.", category: "self-compassion" },
  { text: "I don't owe anyone a version of myself that's easy to be around.", category: "self-compassion" },

  // Boundaries
  { text: "I am allowed to say no without explaining myself.", category: "boundaries" },
  { text: "Protecting my energy is not selfish. It's survival.", category: "boundaries" },
  { text: "I don't owe anyone access to my peace.", category: "boundaries" },
  { text: "It's okay to outgrow people, places, and patterns.", category: "boundaries" },
  { text: "Setting boundaries is an act of self-love.", category: "boundaries" },
  { text: "I can love someone and still need distance from them.", category: "boundaries" },
];

const STORAGE_KEY = "regulate-favorites";
const PERSONAL_STORAGE_KEY = "regulate-personal-affirmations";

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveFavorites(favs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}
function loadPersonalAffirmations(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PERSONAL_STORAGE_KEY) || "[]"); } catch { return []; }
}
function savePersonalAffirmations(items: string[]) {
  localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(items));
}

// ─── NS State → Category mapping ────────────────────────────────────

/** Maps body states (from home page / SOS query param) to recommended categories */
const stateToCategories: Record<string, Category[]> = {
  panicking: ["safety", "grounding"],
  hyperactivated: ["safety", "grounding"],
  anxious: ["self-compassion", "strength"],
  activated: ["self-compassion", "strength"],
  shutdown: ["self-worth", "healing"],
  hypoactivated: ["self-worth", "healing"],
};

/** Maps NS state (from NSStateSelector) to body-state key for lookup */
function nsStateToBodyState(ns: NSState): string {
  switch (ns) {
    case "hyperactivated": return "hyperactivated";
    case "activated": return "activated";
    case "hypoactivated": return "hypoactivated";
    case "window": return "";
    default: return "";
  }
}

function getRecommendedCategories(queryState: string | null): Category[] {
  // Query param takes priority (from SOS flow)
  if (queryState && stateToCategories[queryState]) {
    return stateToCategories[queryState];
  }
  // Fall back to stored NS state
  const nsState = getCurrentNSState();
  if (nsState) {
    const key = nsStateToBodyState(nsState);
    if (key && stateToCategories[key]) {
      return stateToCategories[key];
    }
  }
  return [];
}

// ─── Component ──────────────────────────────────────────────────────

type View = "home" | "flow" | "favorites" | "personal";

// Wrapper for Suspense (useSearchParams needs it)
export default function AffirmationsPage() {
  return (
    <Suspense fallback={null}>
      <AffirmationsPageInner />
    </Suspense>
  );
}

function AffirmationsPageInner() {
  const [view, setView] = useState<View>("home");
  const [activeCategory, setActiveCategory] = useState<Category>("panic");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fading, setFading] = useState(false);
  const [personalAffirmations, setPersonalAffirmations] = useState<string[]>([]);
  const [newPersonal, setNewPersonal] = useState("");
  const [recommendedCats, setRecommendedCats] = useState<Category[]>([]);
  const [autoStarted, setAutoStarted] = useState(false);
  const affirmationAudio = useAudioGuide("affirmations");

  const searchParams = useSearchParams();
  const queryState = searchParams.get("state");

  useEffect(() => {
    setFavorites(loadFavorites());
    setPersonalAffirmations(loadPersonalAffirmations());

    // Determine recommended categories based on NS state
    const recommended = getRecommendedCategories(queryState);
    setRecommendedCats(recommended);

    // Auto-start flow if arriving from SOS with a state param
    if (queryState && recommended.length > 0) {
      setActiveCategory(recommended[0]);
      setCurrentIndex(0);
      setView("flow");
      setAutoStarted(true);
    }
  }, [queryState]);

  const allAffirmations: Affirmation[] = [
    ...builtInAffirmations,
    ...personalAffirmations.map((text) => ({ text, category: "personal" as Category })),
  ];

  const filtered = allAffirmations.filter((a) => a.category === activeCategory);
  const currentIdx = currentIndex % Math.max(1, filtered.length);
  const current = filtered[currentIdx];
  const isFaved = current ? favorites.includes(current.text) : false;

  // Play audio clip when affirmation changes
  useEffect(() => {
    if (view === "flow" && current && activeCategory !== "personal") {
      affirmationAudio.play(`${activeCategory}-${currentIdx + 1}`);
    }
  }, [currentIdx, activeCategory, view]);

  const advance = useCallback(() => {
    haptics.subtle();
    setFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filtered.length);
      setFading(false);
    }, 300);
  }, [filtered.length]);

  function toggleFavorite() {
    if (!current) return;
    const next = isFaved
      ? favorites.filter((f) => f !== current.text)
      : [...favorites, current.text];
    setFavorites(next);
    saveFavorites(next);
  }

  function startCategory(cat: Category) {
    setActiveCategory(cat);
    setCurrentIndex(0);
    setFading(false);
    setView("flow");
  }

  function addPersonalAffirmation() {
    const trimmed = newPersonal.trim();
    if (!trimmed || personalAffirmations.includes(trimmed)) return;
    const next = [...personalAffirmations, trimmed];
    setPersonalAffirmations(next);
    savePersonalAffirmations(next);
    setNewPersonal("");
  }

  function removePersonalAffirmation(text: string) {
    const next = personalAffirmations.filter((a) => a !== text);
    setPersonalAffirmations(next);
    savePersonalAffirmations(next);
    if (favorites.includes(text)) {
      const nextFavs = favorites.filter((f) => f !== text);
      setFavorites(nextFavs);
      saveFavorites(nextFavs);
    }
  }

  // ─── HOME - pick what you need ────────────────────────────────────

  if (view === "home") {
    return (
      <div key="home" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>

          <header className="mb-8 mt-6 text-center">
            <div className="mb-3 flex justify-center"><AffirmationsIcon className="h-8 w-8 text-candle-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">What do you need to hear?</h1>
            <p className="mt-2 text-sm text-cream-dim">Pick what fits right now.</p>
          </header>

          {/* Recommended for you */}
          {recommendedCats.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-teal-soft/50">Recommended for you</p>
              <p className="mb-3 text-xs text-cream-dim/40">Based on how you&apos;re feeling</p>
              <div className="flex flex-col gap-2">
                {categories
                  .filter((cat) => recommendedCats.includes(cat.id))
                  .map((cat) => (
                    <button
                      key={`rec-${cat.id}`}
                      onClick={() => startCategory(cat.id)}
                      className="w-full rounded-2xl border border-teal/25 bg-teal/5 px-5 py-4 text-left transition-all hover:border-teal/40 active:scale-[0.98]"
                    >
                      <span className="text-sm font-medium text-cream">{cat.label}</span>
                      <span className="mt-0.5 block text-xs text-cream-dim/50">{cat.desc}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* All categories */}
          {recommendedCats.length > 0 && (
            <p className="mb-2 text-[10px] uppercase tracking-widest text-cream-dim/30">All categories</p>
          )}
          <div className="flex flex-col gap-2.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => startCategory(cat.id)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-all active:scale-[0.98] ${
                  recommendedCats.includes(cat.id)
                    ? "border-teal/15 bg-deep/50 hover:border-teal/25"
                    : "border-slate-blue/25 bg-deep/50 hover:border-teal/25"
                }`}
              >
                <span className="text-sm font-medium text-cream">{cat.label}</span>
                <span className="mt-0.5 block text-xs text-cream-dim/50">{cat.desc}</span>
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setView("favorites")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/40 py-3 text-xs text-cream-dim/50 transition-colors hover:border-candle/20 hover:text-cream-dim"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" />
              </svg>
              Saved{favorites.length > 0 && ` (${favorites.length})`}
            </button>
            <button
              onClick={() => setView("personal")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-blue/20 bg-deep/40 py-3 text-xs text-cream-dim/50 transition-colors hover:border-teal/20 hover:text-cream-dim"
            >
              + Your words
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FLOW - focused affirmation experience ────────────────────────

  if (view === "flow") {
    const catLabel = categories.find((c) => c.id === activeCategory)?.label || "";

    return (
      <div key="flow" className="animate-screen-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight px-6">
        {/* Back */}
        <button
          onClick={() => { setView("home"); setAutoStarted(false); }}
          className="fixed left-4 top-6 p-2 text-cream-dim/40 hover:text-cream-dim"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        {/* Category label + choose different */}
        <div className="fixed top-8 flex flex-col items-center gap-1">
          <p className="text-xs text-cream-dim/40">{catLabel}</p>
          {autoStarted && (
            <button
              onClick={() => { setView("home"); setAutoStarted(false); }}
              className="text-[11px] text-teal-soft/50 underline underline-offset-2 transition-colors hover:text-teal-soft/80"
            >
              Choose different
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className={`fixed flex gap-1 ${autoStarted ? "top-[4.5rem]" : "top-14"}`}>
          {filtered.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex % filtered.length ? "w-5 bg-candle/60" : i < currentIndex % filtered.length ? "w-2 bg-candle/25" : "w-2 bg-slate-blue/40"
              }`}
            />
          ))}
        </div>

        {/* Affirmation */}
        <div className="max-w-sm text-center">
          <p
            className={`text-2xl font-light leading-relaxed text-cream transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}
          >
            {current?.text}
          </p>
        </div>

        {/* Actions */}
        <div className="fixed bottom-20 flex items-center gap-4">
          <button
            onClick={toggleFavorite}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
              isFaved
                ? "border-candle/40 bg-candle/15 text-candle"
                : "border-slate-blue/40 bg-deep/60 text-cream-dim/40 hover:text-candle-soft"
            }`}
            aria-label={isFaved ? "Unsave" : "Save"}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill={isFaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
              <path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" />
            </svg>
          </button>

          <button
            onClick={advance}
            className="flex h-12 items-center gap-2 rounded-full bg-teal/15 px-6 text-sm text-teal-soft transition-colors hover:bg-teal/25"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* Count */}
        <p className="fixed bottom-12 text-[10px] text-cream-dim/30">
          {(currentIndex % filtered.length) + 1} of {filtered.length}
        </p>
      </div>
    );
  }

  // ─── FAVORITES ────────────────────────────────────────────────────

  if (view === "favorites") {
    const favAffirmations = allAffirmations.filter((a) => favorites.includes(a.text));

    return (
      <div key="favorites" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <button onClick={() => setView("home")} className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>

          <header className="mb-6 mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-cream">Saved Affirmations</h1>
            <p className="mt-1 text-sm text-cream-dim">Words you chose to keep close.</p>
          </header>

          {favAffirmations.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-sm text-cream-dim">None saved yet.</p>
              <p className="mt-1 text-xs text-cream-dim/50">Tap the heart on any affirmation to save it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {favAffirmations.map((a) => (
                <div
                  key={a.text}
                  className="flex items-start gap-3 rounded-2xl border border-candle/10 bg-candle/5 px-5 py-4"
                >
                  <p className="flex-1 text-sm leading-relaxed text-cream">&ldquo;{a.text}&rdquo;</p>
                  <button
                    onClick={() => {
                      const next = favorites.filter((f) => f !== a.text);
                      setFavorites(next);
                      saveFavorites(next);
                    }}
                    className="mt-0.5 shrink-0 text-candle/40 hover:text-candle"
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" stroke="none">
                      <path d="M10 17.5L2 10C0.5 8.5 0.5 5.5 2 4C3.5 2.5 6 2.5 7.5 4L10 6.5L12.5 4C14 2.5 16.5 2.5 18 4C19.5 5.5 19.5 8.5 18 10L10 17.5Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PERSONAL ─────────────────────────────────────────────────────

  if (view === "personal") {
    return (
      <div key="personal" className="animate-screen-enter flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <button onClick={() => setView("home")} className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>

          <header className="mb-6 mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-cream">Your Words</h1>
            <p className="mt-1 text-sm text-cream-dim">Write affirmations that speak to you.</p>
          </header>

          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={newPersonal}
              onChange={(e) => setNewPersonal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addPersonalAffirmation(); }}
              placeholder="Write your own..."
              className="flex-1 rounded-xl border border-slate-blue/40 bg-deep/60 px-4 py-3 text-sm text-cream placeholder:text-cream-dim/40 focus:border-teal/40 focus:outline-none"
            />
            <button
              onClick={addPersonalAffirmation}
              className="rounded-xl bg-teal/20 px-4 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30"
            >
              Add
            </button>
          </div>

          {personalAffirmations.length === 0 ? (
            <div className="mt-8 text-center">
              <p className="text-sm text-cream-dim">No personal affirmations yet.</p>
              <p className="mt-1 text-xs text-cream-dim/50">What would you say to your best friend?</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {personalAffirmations.map((text, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-blue/20 bg-deep/40 px-4 py-3">
                  <p className="flex-1 text-sm leading-relaxed text-cream/90">&ldquo;{text}&rdquo;</p>
                  <button
                    onClick={() => removePersonalAffirmation(text)}
                    className="mt-0.5 shrink-0 text-cream-dim/30 hover:text-cream-dim"
                    aria-label="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2L10 10M10 2L2 10" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
