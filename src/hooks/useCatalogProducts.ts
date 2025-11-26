import { useEffect, useState } from "react";

import { PRODUCT_STORAGE_EVENT, STORAGE_KEY, getStoredProducts } from "@/lib/productStorage";
import type { CatalogProduct } from "@/types";

/**
 * Keep catalog data in sync with localStorage and custom product events.
 */
export function useCatalogProducts(): { catalogData: CatalogProduct[] } {
  const [catalogData, setCatalogData] = useState<CatalogProduct[]>(() => getStoredProducts());

  useEffect(() => {
    const syncCatalog = () => {
      setCatalogData(getStoredProducts());
    };
    syncCatalog();
    window.addEventListener(PRODUCT_STORAGE_EVENT, syncCatalog);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncCatalog();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PRODUCT_STORAGE_EVENT, syncCatalog);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return { catalogData };
}
