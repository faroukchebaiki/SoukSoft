import { ImagePlus, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CatalogProduct, UnitType } from "@/types";
import { getStoredProducts, resetProducts, saveProducts } from "@/lib/productStorage";
import { formatCurrency } from "@/lib/format";

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: UnitType;
  buyPrice: string;
  sellPrice: string;
  stockQty: string;
  expirationDate: string;
  imageData: string;
}

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  unit: "pcs",
  buyPrice: "",
  sellPrice: "",
  stockQty: "",
  expirationDate: "",
  imageData: "",
};

const DRAFT_STORAGE_KEY = "product-builder-form-draft";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readDraftForm(): ProductFormState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProductFormState>;
    return { ...emptyForm, ...parsed };
  } catch {
    return null;
  }
}

function persistDraftForm(value: ProductFormState | null) {
  if (!isBrowser()) return;
  if (!value) {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
}

export function ProductBuilder() {
  const [products, setProducts] = useState<CatalogProduct[]>(() => getStoredProducts());
  const [form, setForm] = useState<ProductFormState>(() => readDraftForm() ?? emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const loadDraftOrEmpty = () => readDraftForm() ?? emptyForm;

  const handleFormChange = (key: keyof ProductFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      handleFormChange("imageData", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleFormChange("imageData", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.sku || !form.barcode) return;

    const buyPriceValue = Number(form.buyPrice) || 0;
    const sellPriceValue = Number(form.sellPrice) || 0;
    const nextProduct: CatalogProduct = {
      id: editingId ?? crypto.randomUUID?.() ?? `PROD-${Date.now()}`,
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      category: form.category || "General",
      unit: form.unit,
      price: sellPriceValue,
      sellPrice: sellPriceValue,
      buyPrice: buyPriceValue,
      stockQty: Number(form.stockQty) || 0,
      expirationDate: form.expirationDate || undefined,
      imageData: form.imageData || undefined,
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
    setIsFormOpen(false);
    persistDraftForm(null);
  };

  const handleEdit = (product: CatalogProduct) => {
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      category: product.category,
      unit: product.unit,
      buyPrice: product.buyPrice !== undefined ? String(product.buyPrice) : "",
      sellPrice: String(product.sellPrice ?? product.price),
      stockQty: String(product.stockQty),
      expirationDate: product.expirationDate ?? "",
      imageData: product.imageData ?? "",
    });
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  const handleDelete = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter((product) => product.id !== productId);
      saveProducts(updated);
      return updated;
    });
    if (editingId === productId) {
      setEditingId(null);
      setForm(loadDraftOrEmpty());
      setIsFormOpen(false);
    }
  };

  const handleReset = () => {
    const defaults = resetProducts();
    setProducts(defaults);
    setForm(loadDraftOrEmpty());
    setEditingId(null);
    setIsFormOpen(false);
    setFilter("");
    persistDraftForm(null);
  };

  const handleOpenNewProduct = () => {
    setForm(loadDraftOrEmpty());
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(loadDraftOrEmpty());
  };

  const handleSaveDraft = () => {
    persistDraftForm(form);
    setIsFormOpen(false);
    setEditingId(null);
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
          <Button className="gap-2" onClick={handleOpenNewProduct}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
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
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-right">Buy</th>
                    <th className="px-3 py-2 text-right">Sell</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2 text-right">Expires</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                        Nothing matches your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-xl border bg-muted/40">
                              {product.imageData ? (
                                <img
                                  src={product.imageData}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <ImagePlus className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{product.sku}</td>
                        <td className="px-3 py-3 text-muted-foreground">{product.barcode}</td>
                        <td className="px-3 py-3 text-right">
                          {formatCurrency(product.buyPrice ?? product.price)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {formatCurrency(product.sellPrice ?? product.price)}
                        </td>
                        <td className="px-3 py-3 text-right">{product.stockQty}</td>
                        <td className="px-3 py-3 text-right">
                          {product.expirationDate
                            ? new Date(product.expirationDate).toLocaleDateString("en-GB")
                            : "—"}
                        </td>
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

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-5xl">
            <Card className="rounded-[2rem]">
              <CardHeader className="pb-0">
                <CardTitle>{editingId ? "Edit product" : "Create product"}</CardTitle>
                <CardDescription>
                  Fill in the required data. Barcodes are mandatory so the register scanners can pick
                  up the item.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border bg-card/60 p-4">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                          General
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reference data for scanners and supplier catalogs.
                        </p>
                      </div>
                      <div className="grid gap-4">
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
                      </div>
                    </section>

                    <section className="space-y-6 rounded-2xl border bg-card/60 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                          Pricing
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="flex flex-col text-sm font-medium">
                            Buying price (DA)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                              value={form.buyPrice}
                              onChange={(event) => handleFormChange("buyPrice", event.target.value)}
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium">
                            Selling price (DA)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                              value={form.sellPrice}
                              onChange={(event) =>
                                handleFormChange("sellPrice", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                          Inventory & expiration
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="flex flex-col text-sm font-medium">
                            Stock on hand
                            <input
                              type="number"
                              min="0"
                              className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                              value={form.stockQty}
                              onChange={(event) => handleFormChange("stockQty", event.target.value)}
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium">
                            Expiration date
                            <input
                              type="date"
                              className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                              value={form.expirationDate}
                              onChange={(event) =>
                                handleFormChange("expirationDate", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-4 md:flex-row md:items-center">
                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border bg-muted/40 md:w-40">
                      {form.imageData ? (
                        <img
                          src={form.imageData}
                          alt={form.name || "Product preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <ImagePlus className="mb-1 h-6 w-6" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 text-sm">
                      <div>
                        <p className="font-medium">Product image</p>
                        <p className="text-muted-foreground">
                          Optional reference shot to help the register team identify packaging.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-background px-4 py-2 font-medium">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageUpload}
                          />
                          Upload image
                        </label>
                        {form.imageData ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleFormChange("imageData", "")}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleCancelForm}>
                      Cancel
                    </Button>
                    {!editingId ? (
                      <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                        Save as draft
                      </Button>
                    ) : null}
                    <Button type="submit" className="gap-2">
                      <Save className="h-4 w-4" />
                      {editingId ? "Update product" : "Save product"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </main>
  );
}
