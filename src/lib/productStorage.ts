import { catalogProducts } from "@/data/mockData";
import type { CatalogProduct } from "@/types";

export const STORAGE_KEY = "souksoft-products";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredProducts(): CatalogProduct[] {
  if (!isBrowser()) return catalogProducts;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogProducts));
      return catalogProducts;
    }
    const parsed = JSON.parse(raw) as CatalogProduct[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return catalogProducts;
  } catch {
    return catalogProducts;
  }
}

export function saveProducts(products: CatalogProduct[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function resetProducts(): CatalogProduct[] {
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogProducts));
  }
  return catalogProducts;
}
