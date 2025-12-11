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

function hasDatePrefix(value: string | undefined): boolean {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(value.trim());
}

function migrateDates(
  existing: PurchaseHistoryEntry[],
  fallback: PurchaseHistoryEntry[],
): { entries: PurchaseHistoryEntry[]; changed: boolean } {
  let changed = false;
  const fallbackById = new Map(fallback.map((entry) => [entry.id, entry]));
  const todayDate = new Date().toISOString().slice(0, 10);

  const migrated = existing.map((entry) => {
    if (hasDatePrefix(entry.completedAt)) return entry;
    changed = true;
    const fallbackEntry = fallbackById.get(entry.id);
    if (fallbackEntry && hasDatePrefix(fallbackEntry.completedAt)) {
      return { ...entry, completedAt: fallbackEntry.completedAt };
    }
    const timePart = entry.completedAt?.trim() || "";
    const sanitizedTime = timePart.match(/^\d{1,2}:\d{2}$/) ? timePart : "12:00";
    return { ...entry, completedAt: `${todayDate} ${sanitizedTime}` };
  });

  return { entries: migrated, changed };
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
      const normalized = normalizeEntries(parsed);
      const { entries: migrated, changed } = migrateDates(normalized, fallback);
      if (changed) {
        persistPurchaseHistory(migrated);
        return migrated;
      }
      return normalized;
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
