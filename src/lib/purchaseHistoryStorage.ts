import type { PurchaseHistoryEntry } from "@/types";

export const PURCHASE_HISTORY_STORAGE_KEY = "souksoft-purchase-history";
export const PURCHASE_HISTORY_EVENT = "souksoft:purchase-history-updated";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyHistoryChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PURCHASE_HISTORY_EVENT));
}

function normalizeEntries(entries: PurchaseHistoryEntry[]): PurchaseHistoryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    lineItems: entry.lineItems?.map((item) => ({ ...item })),
  }));
}

export function getStoredPurchaseHistory(fallback: PurchaseHistoryEntry[]): PurchaseHistoryEntry[] {
  if (!isBrowser()) return normalizeEntries(fallback);
  try {
    const raw = window.localStorage.getItem(PURCHASE_HISTORY_STORAGE_KEY);
    if (!raw) {
      const seeded = normalizeEntries(fallback);
      window.localStorage.setItem(PURCHASE_HISTORY_STORAGE_KEY, JSON.stringify(seeded));
      notifyHistoryChange();
      return seeded;
    }
    const parsed = JSON.parse(raw) as PurchaseHistoryEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeEntries(parsed);
    }
    const seeded = normalizeEntries(fallback);
    window.localStorage.setItem(PURCHASE_HISTORY_STORAGE_KEY, JSON.stringify(seeded));
    notifyHistoryChange();
    return seeded;
  } catch {
    return normalizeEntries(fallback);
  }
}

export function persistPurchaseHistory(entries: PurchaseHistoryEntry[]): void {
  if (!isBrowser()) return;
  const normalized = normalizeEntries(entries);
  window.localStorage.setItem(PURCHASE_HISTORY_STORAGE_KEY, JSON.stringify(normalized));
  notifyHistoryChange();
}
