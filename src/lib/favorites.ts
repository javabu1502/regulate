"use client";

const FAVORITES_KEY = "regulate-favorites-v2";

// Key format: "breathing:box", "somatic:tapping", "affirmation:You are not..."
export function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch { return []; }
}

export function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function isFavorite(key: string): boolean {
  return loadFavorites().includes(key);
}

export function toggleFavorite(key: string): boolean {
  const favs = loadFavorites();
  const index = favs.indexOf(key);
  if (index >= 0) {
    favs.splice(index, 1);
    saveFavorites(favs);
    return false;
  } else {
    favs.push(key);
    saveFavorites(favs);
    return true;
  }
}

export function getFavoritesByModule(module: string): string[] {
  return loadFavorites()
    .filter((k) => k.startsWith(`${module}:`))
    .map((k) => k.slice(module.length + 1));
}
