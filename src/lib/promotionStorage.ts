import type { Promotion } from "@/types";

const PROMOTION_STORAGE_KEY = "souksoft-promotions";
const PROMOTION_EVENT = "souksoft:promotions-updated";
const MAX_PROMOTIONS = 200;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPromotions(): Promotion[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(PROMOTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Promotion[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function persistPromotions(entries: Promotion[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    PROMOTION_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_PROMOTIONS)),
  );
  window.dispatchEvent(new CustomEvent(PROMOTION_EVENT));
}

export function addPromotion(entry: Promotion) {
  const promotions = getPromotions();
  const next = [entry, ...promotions];
  persistPromotions(next);
  return entry;
}

export function updatePromotionStatus(promotionId: string, status: Promotion["status"]) {
  const promotions = getPromotions();
  const next = promotions.map((promotion) =>
    promotion.id === promotionId ? { ...promotion, status } : promotion,
  );
  persistPromotions(next);
  return next.find((promotion) => promotion.id === promotionId);
}

export function clearPromotion(promotionId: string) {
  const promotions = getPromotions();
  const next = promotions.filter((promotion) => promotion.id !== promotionId);
  persistPromotions(next);
  return next;
}

export { PROMOTION_EVENT, PROMOTION_STORAGE_KEY };
