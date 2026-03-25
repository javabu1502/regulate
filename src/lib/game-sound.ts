const STORAGE_KEY = "regulate-game-sound";

export function isGameSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setGameSoundEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, "off");
    }
  } catch {
    // Silently fail
  }
}
