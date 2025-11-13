import { Copy, ImagePlus, Plus, Printer, RefreshCcw, Save, Trash2, Wand2 } from "lucide-react";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

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
  minQty: string;
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
  minQty: "",
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

  const inventoryStats = useMemo(() => {
    const summary = {
      skuCount: products.length,
      stockValue: 0,
      potentialRevenue: 0,
    };
    for (const product of products) {
      const qty = Number(product.stockQty) || 0;
      const buy = Number(product.buyPrice ?? product.price) || 0;
      const sell = Number(product.sellPrice ?? product.price) || 0;
      summary.stockValue += buy * qty;
      summary.potentialRevenue += sell * qty;
    }
    return summary;
  }, [products]);

  const profitStats = useMemo(() => {
    const buy = Number(form.buyPrice) || 0;
    const sell = Number(form.sellPrice) || 0;
    const marginValue = sell - buy;
    const marginPercent = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
    return {
      marginValue,
      marginPercent,
    };
  }, [form.buyPrice, form.sellPrice]);

  const barcodeEntries = useMemo(() => {
    if (!form.barcode.trim()) return [];
    return [form.barcode.trim()];
  }, [form.barcode]);

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

  const handleSaveProduct = (closeAfterSave: boolean) => {
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
      minQty: Number(form.minQty) || undefined,
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
    persistDraftForm(null);
    if (closeAfterSave) {
      setIsFormOpen(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSaveProduct(true);
  };

  const handleSaveAndContinue = () => {
    handleSaveProduct(false);
  };

  const handleAutoBarcode = () => {
    const generated = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("");
    handleFormChange("barcode", generated);
  };

  const handlePrintBarcode = () => {
    if (!form.barcode) return;
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleClearBarcode = () => {
    handleFormChange("barcode", "");
  };

  const productToFormState = (product: CatalogProduct): ProductFormState => ({
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? "",
    category: product.category,
    unit: product.unit,
    buyPrice: product.buyPrice !== undefined ? String(product.buyPrice) : "",
    sellPrice: String(product.sellPrice ?? product.price),
    stockQty: String(product.stockQty),
    minQty: product.minQty !== undefined ? String(product.minQty) : "",
    expirationDate: product.expirationDate ?? "",
    imageData: product.imageData ?? "",
  });

  const handleEdit = (product: CatalogProduct) => {
    setForm(productToFormState(product));
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  const handleDuplicate = (product: CatalogProduct) => {
    const duplicateForm = productToFormState(product);
    duplicateForm.sku = "";
    duplicateForm.barcode = "";
    setForm(duplicateForm);
    setEditingId(null);
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
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SKUs</p>
                <p className="text-2xl font-semibold">{inventoryStats.skuCount}</p>
                <p className="text-xs text-muted-foreground">Tracked products</p>
              </div>
              <div className="rounded-2xl border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Stock value</p>
                <p className="text-xl font-semibold">{formatCurrency(inventoryStats.stockValue)}</p>
                <p className="text-xs text-muted-foreground">Based on buy price</p>
              </div>
              <div className="rounded-2xl border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Potential revenue
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(inventoryStats.potentialRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Sell price × stock</p>
              </div>
            </div>
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
                    filteredProducts.map((product) => {
                      const minQty = product.minQty ?? 0;
                      const isLowStock = product.stockQty <= minQty;
                      return (
                        <tr
                          key={product.id}
                          className={`transition-colors ${
                            isLowStock ? "bg-destructive/5" : ""
                          }`}
                        >
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
                        <td className="px-3 py-3 text-right">
                          <span>{product.stockQty}</span>
                          {isLowStock ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              Low
                            </span>
                          ) : null}
                        </td>
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
                            <Button variant="secondary" size="sm" onClick={() => handleDuplicate(product)}>
                              <Copy className="h-4 w-4" />
                              Duplicate
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
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="flex h-[90vh] w-[90vw] max-w-[1200px] flex-col overflow-hidden rounded-[2rem]">
            <CardHeader className="shrink-0 pb-0 pt-6">
              <CardTitle>{editingId ? "Edit product" : "Create product"}</CardTitle>
              <CardDescription>
                Fill in the required data. Barcodes are mandatory so the register scanners can pick
                up the item.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden px-6 pb-6 pt-4">
              <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
                <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <section className="grid grid-cols-2 gap-3 rounded-2xl border bg-card/60 p-4 text-sm">
                    <div className="col-span-2">
                      <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                        Fiche produit
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Infos utilisées par les caisses et les inventaires.
                      </p>
                    </div>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Désignation
                      <input
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        placeholder="Ex: Couscous semoule 1kg"
                        value={form.name}
                        onChange={(event) => handleFormChange("name", event.target.value)}
                        required
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Référence
                      <input
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        placeholder="SKU interne"
                        value={form.sku}
                        onChange={(event) => handleFormChange("sku", event.target.value)}
                        required
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Famille
                      <input
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        placeholder="Rayon / catégorie"
                        value={form.category}
                        onChange={(event) => handleFormChange("category", event.target.value)}
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Unité
                      <select
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        value={form.unit}
                        onChange={(event) => handleFormChange("unit", event.target.value)}
                      >
                        <option value="pcs">Pièces</option>
                        <option value="kg">Kilogrammes</option>
                      </select>
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Quantité
                      <input
                        type="number"
                        min="0"
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        value={form.stockQty}
                        onChange={(event) => handleFormChange("stockQty", event.target.value)}
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Quantité minimale
                      <input
                        type="number"
                        min="0"
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        value={form.minQty}
                        onChange={(event) => handleFormChange("minQty", event.target.value)}
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Prix d&apos;achat (DA)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        value={form.buyPrice}
                        onChange={(event) => handleFormChange("buyPrice", event.target.value)}
                      />
                    </label>
                    <label className="col-span-2 flex flex-col text-xs font-medium md:col-span-1">
                      Prix de vente (DA)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                        value={form.sellPrice}
                        onChange={(event) => handleFormChange("sellPrice", event.target.value)}
                      />
                    </label>
                    <div className="col-span-2 grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col text-xs font-medium">
                        % de bénéfice
                        <input
                          readOnly
                          className="mt-1 rounded-xl border bg-muted/50 px-3 py-2 text-sm font-semibold"
                          value={`${Math.max(profitStats.marginPercent, 0).toFixed(2)} %`}
                        />
                      </label>
                      <label className="flex flex-col text-xs font-medium">
                        Marge bénéficaire
                        <input
                          readOnly
                          className="mt-1 rounded-xl border bg-muted/50 px-3 py-2 text-sm font-semibold"
                          value={formatCurrency(Math.max(profitStats.marginValue, 0))}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="grid grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border bg-card/60 p-4 text-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col text-xs font-medium">
                        Péremption
                        <input
                          type="date"
                          className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                          value={form.expirationDate}
                          onChange={(event) => handleFormChange("expirationDate", event.target.value)}
                        />
                      </label>
                      <label className="flex flex-col text-xs font-medium">
                        Code barre principal
                        <input
                          className="mt-1 rounded-xl border bg-background px-3 py-2 text-sm"
                          placeholder="6151234567890"
                          value={form.barcode}
                          onChange={(event) => handleFormChange("barcode", event.target.value)}
                          required
                        />
                      </label>
                    </div>
                    <div className="grid flex-1 min-h-0 gap-3 md:grid-cols-[1fr_auto]">
                      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-background/80 p-4">
                        <div
                          className="h-16 w-32 rounded bg-white shadow-inner"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(90deg,#1f1f1f,#1f1f1f 2px,transparent 2px,transparent 4px)",
                          }}
                        />
                        <span className="text-xs font-mono tracking-[0.3em] text-muted-foreground">
                          {form.barcode || "0000000000000"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                          onClick={handleAutoBarcode}
                        >
                          <Wand2 className="h-4 w-4" />
                          Auto
                        </Button>
                        <Button
                          type="button"
                          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
                          onClick={handlePrintBarcode}
                          disabled={!form.barcode}
                        >
                          <Printer className="h-4 w-4" />
                          Imprimer
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="gap-2"
                          onClick={handleClearBarcode}
                          disabled={!form.barcode}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_0.9fr]">
                      <div className="rounded-2xl border">
                        <table className="min-w-full text-xs">
                          <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left">Code barre</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {barcodeEntries.length ? (
                              barcodeEntries.map((code) => (
                                <tr key={code}>
                                  <td className="px-3 py-2 font-mono text-sm">{code}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-4 text-center text-muted-foreground">
                                  Aucun code enregistré.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="rounded-2xl border bg-card/40 p-3">
                        <p className="text-xs font-medium">Image produit</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                            {form.imageData ? (
                              <img
                                src={form.imageData}
                                alt={form.name || "Product preview"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2 text-xs">
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-background px-3 py-1.5 font-medium">
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleImageUpload}
                              />
                              Importer
                            </label>
                            {form.imageData ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFormChange("imageData", "")}
                              >
                                Retirer
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {!editingId ? (
                    <Button type="button" variant="ghost" className="gap-2" onClick={handleSaveDraft}>
                      <Save className="h-4 w-4" />
                      Enregistrer brouillon
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Modification en cours : {form.name || editingId}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                      onClick={handleSaveAndContinue}
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer & continuer
                    </Button>
                    <Button
                      type="submit"
                      className="gap-2 bg-green-600 text-white hover:bg-green-500"
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer & fermer
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 text-white hover:bg-red-500"
                      onClick={handleCancelForm}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
