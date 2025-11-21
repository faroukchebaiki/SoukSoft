import { Grid3X3, Home, List, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CatalogProduct } from "@/types";

interface AllItemsProps {
  products: CatalogProduct[];
  onGoHome?: () => void;
}

export function AllItems({ products, onGoHome }: AllItemsProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (!onGoHome) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onGoHome();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onGoHome]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((product) => product.category))).sort();
    return ["all", ...names];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery =
        query.length === 0 ||
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  const totalSkus = filteredProducts.length;
  const totalUnits = filteredProducts.reduce((sum, product) => sum + product.stockQty, 0);
  const lowStockSkus = filteredProducts.filter(
    (product) => product.minQty && product.stockQty <= product.minQty,
  ).length;

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">All items</h1>
          <p className="text-sm text-muted-foreground">
            Search every SKU, view quantities left, and monitor categories in one place.
          </p>
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
              <Grid3X3 className="h-4 w-4" />
              Grid
            </Button>
          </div>
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total SKUs</span>
            <span className="text-base font-semibold">{totalSkus}</span>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Units in stock</span>
            <span className="text-base font-semibold">{totalUnits}</span>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Low stock alerts</span>
            <span className="text-base font-semibold text-amber-500">{lowStockSkus}</span>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-muted/40 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-xl border bg-background px-3 py-2">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-48 bg-transparent text-sm outline-none"
                placeholder="Search by name or SKU"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border bg-card/70 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All categories" : value}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden rounded-2xl border bg-card/60 p-0">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
              No matching products found.
            </div>
          ) : viewMode === "list" ? (
            <div className="h-full overflow-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium text-right">Qty left</th>
                    <th className="px-4 py-2 font-medium text-right">Min level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredProducts.map((product) => {
                    const isLow = product.minQty !== undefined && product.stockQty <= product.minQty;
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{product.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {product.stockQty} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.minQty ? (
                            <span
                              className={isLow ? "font-semibold text-amber-500" : "text-muted-foreground"}
                            >
                              {product.minQty}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full overflow-auto p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const isLow = product.minQty !== undefined && product.stockQty <= product.minQty;
                  return (
                    <Card key={product.id} className="h-full">
                      <CardContent className="space-y-3 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{product.name}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {product.category} · {product.sku}
                            </CardDescription>
                          </div>
                          {isLow ? (
                            <Badge variant="destructive" className="text-[11px]">
                              Low
                            </Badge>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Qty</span>
                          <span className="text-right text-foreground font-semibold">
                            {product.stockQty} {product.unit}
                          </span>
                          <span>Min</span>
                          <span className="text-right text-foreground">
                            {product.minQty ?? "—"}
                          </span>
                        </div>
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
