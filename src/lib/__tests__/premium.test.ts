import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before importing the module
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  length: 0,
  key: vi.fn(() => null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
// window is needed for the typeof window check
Object.defineProperty(globalThis, "window", { value: globalThis });

const {
  isPremium,
  setPremium,
  purchasePremium,
  restorePurchases,
  initializePremium,
  PRODUCT_ID,
  PRICE,
  PREMIUM_FEATURES,
  FREE_FEATURES,
} = await import("../premium");

function clearStorage() {
  Object.keys(store).forEach((k) => delete store[k]);
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
}

describe("isPremium", () => {
  beforeEach(clearStorage);

  it("returns false when no premium key is set", () => {
    expect(isPremium()).toBe(false);
  });

  it("returns true when premium key is 'true'", () => {
    store["regulate-premium"] = "true";
    expect(isPremium()).toBe(true);
  });

  it("returns false for any other value", () => {
    store["regulate-premium"] = "false";
    expect(isPremium()).toBe(false);

    store["regulate-premium"] = "1";
    expect(isPremium()).toBe(false);

    store["regulate-premium"] = "";
    expect(isPremium()).toBe(false);
  });
});

describe("setPremium", () => {
  beforeEach(clearStorage);

  it("sets localStorage to 'true' when called with true", () => {
    setPremium(true);
    expect(store["regulate-premium"]).toBe("true");
  });

  it("removes the key when called with false", () => {
    store["regulate-premium"] = "true";
    setPremium(false);
    expect(store["regulate-premium"]).toBeUndefined();
  });

  it("round-trips correctly with isPremium", () => {
    expect(isPremium()).toBe(false);
    setPremium(true);
    expect(isPremium()).toBe(true);
    setPremium(false);
    expect(isPremium()).toBe(false);
  });
});

describe("purchasePremium", () => {
  beforeEach(clearStorage);

  it("returns true and activates premium", async () => {
    const result = await purchasePremium();
    expect(result).toBe(true);
    expect(isPremium()).toBe(true);
  });
});

describe("restorePurchases", () => {
  beforeEach(clearStorage);

  it("returns false when not premium", async () => {
    const result = await restorePurchases();
    expect(result).toBe(false);
  });

  it("returns true when already premium", async () => {
    setPremium(true);
    const result = await restorePurchases();
    expect(result).toBe(true);
  });
});

describe("initializePremium", () => {
  beforeEach(clearStorage);

  it("resolves without error", async () => {
    await expect(initializePremium()).resolves.toBeUndefined();
  });
});

describe("constants", () => {
  it("exports PRODUCT_ID", () => {
    expect(PRODUCT_ID).toBe("regulate_plus_lifetime");
  });

  it("exports PRICE", () => {
    expect(PRICE).toBe("$2.99");
  });

  it("exports PREMIUM_FEATURES as a non-empty array", () => {
    expect(PREMIUM_FEATURES.length).toBeGreaterThan(0);
  });

  it("exports FREE_FEATURES as a non-empty array", () => {
    expect(FREE_FEATURES.length).toBeGreaterThan(0);
  });
});
