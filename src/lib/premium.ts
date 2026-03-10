"use client";

const PREMIUM_KEY = "regulate-premium";

// --- Product Configuration ---
// Single source of truth for product details. Update here when pricing changes.
export const PRODUCT_ID = "regulate_plus_lifetime";
export const PRICE = "$2.99";

// --- Synchronous helpers (unchanged) ---
// These remain for quick checks in rendering logic.

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PREMIUM_KEY) === "true";
  } catch {
    return false;
  }
}

export function setPremium(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(PREMIUM_KEY, "true");
    } else {
      localStorage.removeItem(PREMIUM_KEY);
    }
  } catch { /* */ }
}

// --- Async premium service layer ---
// These async functions wrap the localStorage implementation today.
// When integrating RevenueCat / StoreKit, replace only the function bodies below.
// Call sites throughout the app will not need to change.

/**
 * Initialize the premium service. Call once at app startup (e.g., in a root layout effect).
 * Currently reads localStorage; will later configure the RevenueCat SDK and sync entitlements.
 */
export async function initializePremium(): Promise<void> {
  // TODO: Replace with RevenueCat SDK call
  // e.g.:
  //   Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  //   const customerInfo = await Purchases.getCustomerInfo();
  //   if (customerInfo.entitlements.active["regulate_plus"]) {
  //     setPremium(true);
  //   }

  // Current implementation: just read localStorage (already handled synchronously).
  // This is a no-op placeholder so call sites are wired up for the async flow.
  isPremium();
}

/**
 * Trigger the purchase flow for Regulate+.
 * Returns true if the purchase succeeded, false otherwise.
 * Currently sets localStorage immediately; will later present the App Store payment sheet.
 */
export async function purchasePremium(): Promise<boolean> {
  // TODO: Replace with RevenueCat SDK call
  // e.g.:
  //   try {
  //     const { customerInfo } = await Purchases.purchaseProduct(PRODUCT_ID);
  //     const unlocked = !!customerInfo.entitlements.active["regulate_plus"];
  //     setPremium(unlocked);
  //     return unlocked;
  //   } catch (e) {
  //     if (e.userCancelled) return false;
  //     throw e;
  //   }

  // Current implementation: instant unlock via localStorage.
  setPremium(true);
  return true;
}

/**
 * Restore previous purchases (required by Apple App Store guidelines).
 * Returns true if an active entitlement was found, false otherwise.
 * Currently checks localStorage; will later call RevenueCat restore.
 */
export async function restorePurchases(): Promise<boolean> {
  // TODO: Replace with RevenueCat SDK call
  // e.g.:
  //   try {
  //     const customerInfo = await Purchases.restorePurchases();
  //     const unlocked = !!customerInfo.entitlements.active["regulate_plus"];
  //     setPremium(unlocked);
  //     return unlocked;
  //   } catch {
  //     return false;
  //   }

  // Current implementation: just check what's already in localStorage.
  return isPremium();
}

// --- Feature lists ---

export const PREMIUM_FEATURES = [
  "Journal and session history",
  "Personalized exercise recommendations",
  "What works for you insights",
  "Therapist summary export",
  "Weekly reflection prompts",
] as const;

export const FREE_FEATURES = [
  "All 11 somatic exercises",
  "Guided breathing (4 patterns)",
  "SOS crisis flow",
  "Body scan",
  "Grounding",
  "Affirmations",
  "Sleep tools",
  "Safety plan",
  "Crisis resources",
] as const;
