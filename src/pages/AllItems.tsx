import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalogProduct } from "@/types";

interface AllItemsProps {
  products: CatalogProduct[];
}

export function AllItems({ products }: AllItemsProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All items</h1>
          <p className="text-muted-foreground">
            Search every SKU, view quantities left, and monitor categories in one place.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <div className="flex items-center rounded-md border bg-background px-3 py-2">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search by name or SKU"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total SKUs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalSkus}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Units in stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalUnits}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-500">
            {lowStockSkus}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Catalog overview</CardTitle>
        </CardHeader>
        <CardContent className="rounded-md border p-0">
          <div className="max-h-[65vh] overflow-auto">
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
                            className={
                              isLow
                                ? "font-semibold text-amber-500"
                                : "text-muted-foreground"
                            }
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
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No matching products found.
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
