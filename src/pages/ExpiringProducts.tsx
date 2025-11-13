import { AlertTriangle, CalendarClock, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalogProduct, Promotion } from "@/types";
import { STORAGE_KEY, getStoredProducts } from "@/lib/productStorage";
import { formatCurrency } from "@/lib/format";
import { addPromotion, getPromotions } from "@/lib/promotionStorage";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface ExpiringEntry {
  product: CatalogProduct;
  expiresAt: Date;
  status: "expiring" | "expired";
  daysRemaining: number;
}

function getMarkdownPercent(daysRemaining: number) {
  if (daysRemaining < 0) return 50;
  if (daysRemaining <= 2) return 40;
  if (daysRemaining <= 5) return 25;
  if (daysRemaining <= 10) return 15;
  return 10;
}

export function ExpiringProducts() {
  const [windowDays, setWindowDays] = useState(30);
  const [products, setProducts] = useState<CatalogProduct[]>(() => getStoredProducts());
  const [promotions, setPromotions] = useState<Promotion[]>(() => getPromotions());
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);

  const syncProducts = () => {
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncProducts();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const expiringEntries = useMemo<ExpiringEntry[]>(() => {
    const now = Date.now();
    return products
      .map((product) => {
        if (!product.expirationDate) return null;
        const expiresAt = new Date(product.expirationDate);
        if (Number.isNaN(expiresAt.getTime())) return null;
        const diffDays = Math.ceil((expiresAt.getTime() - now) / MS_PER_DAY);
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

  const summary = useMemo(() => {
    const expired = expiringEntries.filter((entry) => entry.status === "expired");
    const expiringSoon = expiringEntries.filter((entry) => entry.status === "expiring");
    const valueAtRisk = expiringEntries.reduce((sum, entry) => {
      const unitValue = entry.product.sellPrice ?? entry.product.price;
      return sum + unitValue * entry.product.stockQty;
    }, 0);
    return {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      valueAtRisk,
    };
  }, [expiringEntries]);

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
    };
    addPromotion(promotion);
    setPromotions((prev) => [promotion, ...prev]);
    setPromotionNotice(
      `Promotion queued for ${entry.product.name} at ${discountPercent}% off.`,
    );
  };

  return (
    <main className="page-shell flex-1 overflow-y-auto px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expiring items</h1>
          <p className="text-muted-foreground">
            Track products approaching their shelf-life and plan markdowns or pullbacks in time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-xl border bg-background px-3 py-2 text-sm"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
          >
            {thresholdOptions.map((days) => (
              <option key={days} value={days}>
                {days} day window
              </option>
            ))}
          </select>
          <Button variant="outline" className="gap-2" onClick={syncProducts}>
            <RefreshCcw className="h-4 w-4" />
            Sync list
          </Button>
      </div>
    </div>

    {promotionNotice ? (
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        {promotionNotice}
      </div>
    ) : null}

    <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expiring soon</CardTitle>
            <CardDescription>Within the selected window</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-500">
            {summary.expiringSoon}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expired</CardTitle>
            <CardDescription>Already past due</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-red-500">
            {summary.expired}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Value at risk</CardTitle>
            <CardDescription>Retail value of flagged stock</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {formatCurrency(summary.valueAtRisk)}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <CardTitle>Expiry watchlist</CardTitle>
            <CardDescription>
              Showing products that are expired or will expire within {windowDays} days.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Expiration</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Value</th>
                  <th className="px-4 py-2 font-medium text-right">Markdown</th>
                  <th className="px-4 py-2 font-medium text-right">Promotion</th>
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
                      <td className="px-4 py-3">
                        <Badge
                          variant={entry.status === "expired" ? "destructive" : "secondary"}
                          className={
                            entry.status === "expired" ? "bg-red-500/15 text-red-600" : undefined
                          }
                        >
                          {entry.status === "expired" ? "Expired" : "Expiring soon"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {entry.product.stockQty} {entry.product.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(
                          (entry.product.sellPrice ?? entry.product.price) * entry.product.stockQty,
                        )}
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
                          {hasQueuedPromotion ? "Queued" : "Create promotion"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {expiringEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarClock className="h-10 w-10 text-muted-foreground/70" />
                        <p className="text-sm">No products are near their expiration window.</p>
                        <p className="text-xs">
                          Adjust the timeframe or add expiration dates in the Product Builder.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
