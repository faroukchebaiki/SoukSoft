import { catalogProducts } from "@/data/mockData";
import type { CatalogProduct } from "@/types";

export const STORAGE_KEY = "souksoft-products";
export const PRODUCT_STORAGE_EVENT = "souksoft:products-updated";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneDefaults(): CatalogProduct[] {
  return catalogProducts.map((product) => ({ ...product }));
}

function notifyProductChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRODUCT_STORAGE_EVENT));
}

export function getStoredProducts(): CatalogProduct[] {
  if (!isBrowser()) return cloneDefaults();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = cloneDefaults();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      notifyProductChange();
      return defaults;
    }
    const parsed = JSON.parse(raw) as CatalogProduct[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

export function saveProducts(products: CatalogProduct[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  notifyProductChange();
}

export function resetProducts(): CatalogProduct[] {
  if (isBrowser()) {
    const defaults = cloneDefaults();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    notifyProductChange();
    return defaults;
  }
  return cloneDefaults();
}
