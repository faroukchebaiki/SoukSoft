import { Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CatalogProduct, UnitType } from "@/types";
import { getStoredProducts, resetProducts, saveProducts } from "@/lib/productStorage";

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: UnitType;
  price: string;
  stockQty: string;
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  unit: "pcs",
  price: "",
  stockQty: "",
};

export function ProductBuilder() {
  const [products, setProducts] = useState<CatalogProduct[]>(() => getStoredProducts());
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filteredProducts = useMemo(() => {
    if (!filter.trim()) return products;
    const value = filter.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(value) ||
        product.sku.toLowerCase().includes(value) ||
        product.barcode?.toLowerCase().includes(value),
    );
  }, [filter, products]);

  const handleFormChange = (key: keyof ProductFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.sku || !form.barcode) return;

    const nextProduct: CatalogProduct = {
      id: editingId ?? crypto.randomUUID?.() ?? `PROD-${Date.now()}`,
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      category: form.category || "General",
      unit: form.unit,
      price: Number(form.price) || 0,
      stockQty: Number(form.stockQty) || 0,
    };

    setProducts((prev) => {
      const exists = prev.some((product) => product.id === nextProduct.id);
      const updated = exists
        ? prev.map((product) => (product.id === nextProduct.id ? nextProduct : product))
        : [...prev, nextProduct];
      saveProducts(updated);
      return updated;
    });

    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (product: CatalogProduct) => {
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      stockQty: String(product.stockQty),
    });
    setEditingId(product.id);
  };

  const handleDelete = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter((product) => product.id !== productId);
      saveProducts(updated);
      return updated;
    });
    if (editingId === productId) {
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  const handleReset = () => {
    const defaults = resetProducts();
    setProducts(defaults);
    setForm(emptyForm);
    setEditingId(null);
    setFilter("");
  };

  return (
    <main className="page-shell flex-1 overflow-y-auto px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Product builder</h1>
          <p className="text-muted-foreground">
            Manage the private product registry for special accounts. Changes sync to local storage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleReset}>
            <RefreshCcw className="h-4 w-4" />
            Reset to defaults
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
            }}
          >
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit product" : "Create product"}</CardTitle>
            <CardDescription>
              Fill in the details and save. A barcode entry is required for register scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium">
                  Name
                  <input
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(event) => handleFormChange("name", event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col text-sm font-medium">
                  SKU
                  <input
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.sku}
                    onChange={(event) => handleFormChange("sku", event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium">
                  Barcode / QR code
                  <input
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.barcode}
                    onChange={(event) => handleFormChange("barcode", event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col text-sm font-medium">
                  Category
                  <input
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.category}
                    onChange={(event) => handleFormChange("category", event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col text-sm font-medium">
                  Unit
                  <select
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.unit}
                    onChange={(event) => handleFormChange("unit", event.target.value)}
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium">
                  Price (DA)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.price}
                    onChange={(event) => handleFormChange("price", event.target.value)}
                  />
                </label>
                <label className="flex flex-col text-sm font-medium">
                  Quantity
                  <input
                    type="number"
                    min="0"
                    className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                    value={form.stockQty}
                    onChange={(event) => handleFormChange("stockQty", event.target.value)}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full gap-2">
                <Save className="h-4 w-4" />
                {editingId ? "Update product" : "Save product"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle>Registered products</CardTitle>
            <CardDescription>
              Only special accounts can see and edit these entries. Data lives in the browser for now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              placeholder="Search by name, SKU, or barcode"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="max-h-[420px] overflow-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        Nothing matches your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-3 font-medium">{product.name}</td>
                        <td className="px-3 py-3">{product.sku}</td>
                        <td className="px-3 py-3 text-muted-foreground">{product.barcode}</td>
                        <td className="px-3 py-3 text-right">{product.stockQty}</td>
                        <td className="px-3 py-3 text-right">{product.price.toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
