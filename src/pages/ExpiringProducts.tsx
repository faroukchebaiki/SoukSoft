import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Home,
  LayoutGrid,
  List,
  RefreshCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalogProduct, Promotion } from "@/types";
import { PRODUCT_STORAGE_EVENT, STORAGE_KEY, getStoredProducts } from "@/lib/productStorage";
import { addPromotion, getPromotions } from "@/lib/promotionStorage";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface ExpiringEntry {
  product: CatalogProduct;
  expiresAt: Date;
  status: "expiring" | "expired";
  daysRemaining: number;
}

interface ExpiringProductsProps {
  products?: CatalogProduct[];
  onGoHome?: () => void;
}

function getMarkdownPercent(daysRemaining: number) {
  if (daysRemaining < 0) return 50;
  if (daysRemaining <= 2) return 40;
  if (daysRemaining <= 5) return 25;
  if (daysRemaining <= 10) return 15;
  return 10;
}

export function ExpiringProducts({
  products: externalProducts,
  onGoHome,
}: ExpiringProductsProps = {}) {
  const [windowDays, setWindowDays] = useState(30);
  const [products, setProducts] = useState<CatalogProduct[]>(
    () => externalProducts ?? getStoredProducts(),
  );
  const [promotions, setPromotions] = useState<Promotion[]>(() => getPromotions());
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isWindowMenuOpen, setIsWindowMenuOpen] = useState(false);
  const windowMenuRef = useRef<HTMLDivElement | null>(null);

  const syncProducts = useCallback(() => {
    setProducts(getStoredProducts());
  }, []);

  useEffect(() => {
    if (externalProducts) {
      setProducts(externalProducts);
    }
  }, [externalProducts]);

  useEffect(() => {
    if (externalProducts) return;
    if (typeof window === "undefined") return;
    const handleProductEvent = () => syncProducts();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncProducts();
      }
    };

    window.addEventListener(PRODUCT_STORAGE_EVENT, handleProductEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PRODUCT_STORAGE_EVENT, handleProductEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [externalProducts, syncProducts]);

  useEffect(() => {
    if (!isWindowMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (windowMenuRef.current && !windowMenuRef.current.contains(event.target as Node)) {
        setIsWindowMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWindowMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isWindowMenuOpen]);

  useEffect(() => {
    if (!onGoHome) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onGoHome();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onGoHome]);

  const expiringEntries = useMemo<ExpiringEntry[]>(() => {
    const now = Date.now();
    return products
      .map((product) => {
        if (!product.expirationDate) return null;
        const expiresAt = new Date(product.expirationDate);
        if (Number.isNaN(expiresAt.getTime())) return null;
        const diffInDays = (expiresAt.getTime() - now) / MS_PER_DAY;
        const diffDays = diffInDays < 0 ? Math.floor(diffInDays) : Math.ceil(diffInDays);
        const status: ExpiringEntry["status"] | null =
          diffDays < 0 ? "expired" : diffDays <= windowDays ? "expiring" : null;
        if (!status) return null;
        return {
          product,
          expiresAt,
          status,
          daysRemaining: diffDays,
        };
      })
      .filter((entry): entry is ExpiringEntry => Boolean(entry))
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }, [products, windowDays]);

  const summary = useMemo(
    () => ({
      expired: expiringEntries.filter((entry) => entry.status === "expired").length,
      expiringSoon: expiringEntries.filter((entry) => entry.status === "expiring").length,
    }),
    [expiringEntries],
  );

  const thresholdOptions = [7, 14, 30, 60, 90];

  const handleCreatePromotion = (entry: ExpiringEntry) => {
    const discountPercent = getMarkdownPercent(entry.daysRemaining);
    const promotion: Promotion = {
      id: crypto.randomUUID?.() ?? `PROMO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sku: entry.product.sku,
      productName: entry.product.name,
      discountPercent,
      createdAt: new Date().toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
      status: "Queued",
      source: "expiring-items",
      notes: `${entry.product.stockQty} units flagged`,
      triggeredBy: "ExpiringProducts",
    };
    addPromotion(promotion);
    setPromotions((prev) => [promotion, ...prev]);
    setPromotionNotice(
      `Promotion queued for ${entry.product.name} at ${discountPercent}% off.`,
    );
  };

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Expiry radar</h1>
          <p className="text-sm text-muted-foreground">Focus on flagged items; no wasted space.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border bg-card/80 p-1 text-xs">
            <span className="px-2 text-muted-foreground">View</span>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="gap-1 rounded-lg px-2"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="gap-1 rounded-lg px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </Button>
          </div>
          <div className="relative" ref={windowMenuRef}>
            <Button
              variant="outline"
              className="h-10 min-w-[170px] justify-between gap-2 rounded-xl border bg-card/70 text-sm shadow-sm"
              onClick={() => setIsWindowMenuOpen((prev) => !prev)}
            >
              {windowDays} day window
              <ChevronDown
                className={`h-4 w-4 transition ${isWindowMenuOpen ? "rotate-180" : ""}`}
              />
            </Button>
            {isWindowMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 overflow-hidden rounded-xl border bg-card/90 text-sm shadow-xl backdrop-blur-sm">
                {thresholdOptions.map((days) => {
                  const active = days === windowDays;
                  return (
                    <button
                      key={days}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/60 ${
                        active ? "bg-primary/10 font-semibold text-primary" : ""
                      }`}
                      onClick={() => {
                        setWindowDays(days);
                        setIsWindowMenuOpen(false);
                      }}
                    >
                      <span>{days} day window</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <Button variant="outline" className="gap-2" onClick={syncProducts}>
            <RefreshCcw className="h-4 w-4" />
            Sync
          </Button>
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home (Esc)
          </Button>
        </div>
      </div>

      <Card className="flex h-[calc(100vh-120px)] flex-col overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-muted/40 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <CardTitle className="text-base">Watchlist</CardTitle>
                <CardDescription className="text-xs">
                  Expired or within {windowDays} days. {summary.expiringSoon} ready for action.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {summary.expired} expired · {summary.expiringSoon} soon
            </Badge>
          </div>
          {promotionNotice ? (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              {promotionNotice}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-1 min-h-0 flex-col overflow-hidden p-4">
          {expiringEntries.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/70" />
              <p className="text-sm">No products near their expiration window.</p>
              <p className="text-xs text-muted-foreground">
                Adjust the timeframe or add expiration dates in the Product Builder.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="flex-1 overflow-auto rounded-xl border bg-card/60">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium">Expiration</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium text-right">Markdown</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {expiringEntries.map((entry) => {
                    const recommendedDiscount = getMarkdownPercent(entry.daysRemaining);
                    const hasQueuedPromotion = promotions.some(
                      (promotion) =>
                        promotion.sku === entry.product.sku && promotion.status === "Queued",
                    );
                    return (
                      <tr key={entry.product.id}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.product.name}</span>
                            <span className="text-xs text-muted-foreground">{entry.product.sku}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>
                              {entry.expiresAt.toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {entry.daysRemaining < 0
                                ? `${Math.abs(entry.daysRemaining)} day(s) overdue`
                                : `${entry.daysRemaining} day(s) left`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {entry.product.stockQty} {entry.product.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">
                          {recommendedDiscount}% off
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                            onClick={() => handleCreatePromotion(entry)}
                            disabled={hasQueuedPromotion}
                          >
                            {hasQueuedPromotion ? "Queued" : "Queue promo"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {expiringEntries.map((entry) => {
                  const recommendedDiscount = getMarkdownPercent(entry.daysRemaining);
                  const hasQueuedPromotion = promotions.some(
                    (promotion) =>
                      promotion.sku === entry.product.sku && promotion.status === "Queued",
                  );
                  return (
                    <Card key={entry.product.id} className="h-full">
                      <CardContent className="space-y-3 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{entry.product.name}</CardTitle>
                            <CardDescription className="text-xs">{entry.product.sku}</CardDescription>
                          </div>
                          <Badge
                            variant={entry.status === "expired" ? "destructive" : "secondary"}
                            className={
                              entry.status === "expired" ? "bg-red-500/15 text-red-600" : undefined
                            }
                          >
                            {entry.status === "expired" ? "Expired" : "Soon"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Expires</span>
                          <span className="text-right text-foreground">
                            {entry.expiresAt.toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span>Stock</span>
                          <span className="text-right font-semibold text-foreground">
                            {entry.product.stockQty} {entry.product.unit}
                          </span>
                          <span>Markdown</span>
                          <span className="text-right font-semibold text-amber-600">
                            {recommendedDiscount}%
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => handleCreatePromotion(entry)}
                          disabled={hasQueuedPromotion}
                        >
                          {hasQueuedPromotion ? "Queued" : "Queue promotion"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
