import {
  Copy,
  Download,
  ImagePlus,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
const CSV_HEADERS = [
  "name",
  "sku",
  "barcode",
  "category",
  "unit",
  "buyPrice",
  "sellPrice",
  "stockQty",
  "minQty",
  "expirationDate",
] as const;
const IMPORT_PREVIEW_LIMIT = 5;

type CsvField = (typeof CSV_HEADERS)[number];
type CsvRecord = Record<CsvField, string>;

interface ImportSummary {
  inserted: CatalogProduct[];
  updated: Array<{ previous: CatalogProduct; next: CatalogProduct }>;
  skipped: number;
  totalRows: number;
}

interface ImportPreviewState {
  fileName: string;
  records: CsvRecord[];
  summary: ImportSummary;
}

function createProductId() {
  return crypto.randomUUID?.() ?? `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function escapeCsvValue(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseCsvRecords(text: string): CsvRecord[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headerCells = splitCsvLine(headerLine);
  const headerLookup = new Map<string, CsvField>();
  CSV_HEADERS.forEach((field) => headerLookup.set(field.toLowerCase(), field));
  const columnIndexes = new Map<CsvField, number>();
  headerCells.forEach((cell, index) => {
    const key = cell.trim().toLowerCase();
    const field = headerLookup.get(key);
    if (field) {
      columnIndexes.set(field, index);
    }
  });
  const records: CsvRecord[] = [];
  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const record: Partial<CsvRecord> = {};
    for (const field of CSV_HEADERS) {
      const columnIndex = columnIndexes.get(field);
      const value = columnIndex !== undefined ? values[columnIndex] ?? "" : "";
      record[field] = value.trim();
    }
    records.push(record as CsvRecord);
  }
  return records;
}

function normalizeUnit(value: string | undefined, fallback: UnitType): UnitType {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  return normalized === "kg" ? "kg" : normalized === "pcs" ? "pcs" : fallback;
}

function buildProductFromRecord(record: CsvRecord, existing?: CatalogProduct): CatalogProduct | null {
  const name = record.name?.trim() || existing?.name;
  const sku = record.sku?.trim() || existing?.sku;
  if (!name || !sku) return null;

  const parseNumber = (value: string) => {
    if (!value?.trim()) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const buyPrice = parseNumber(record.buyPrice) ?? existing?.buyPrice;
  const parsedSell = parseNumber(record.sellPrice);
  const fallbackSell = existing?.sellPrice ?? existing?.price ?? buyPrice ?? 0;
  const sellPrice = parsedSell ?? fallbackSell;

  const stockQty = parseNumber(record.stockQty) ?? existing?.stockQty ?? 0;
  const minQty = parseNumber(record.minQty) ?? existing?.minQty;
  const expirationDate = record.expirationDate?.trim() || existing?.expirationDate;
  const barcode = record.barcode?.trim() || existing?.barcode;
  const unit = normalizeUnit(record.unit, existing?.unit ?? "pcs");

  return {
    id: existing?.id ?? createProductId(),
    name,
    sku,
    barcode,
    category: record.category?.trim() || existing?.category || "General",
    unit,
    buyPrice: buyPrice ?? undefined,
    sellPrice,
    price: sellPrice,
    stockQty,
    minQty,
    expirationDate,
    imageData: existing?.imageData,
  };
}

function productToCsvRecord(product: CatalogProduct): CsvRecord {
  return {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? "",
    category: product.category,
    unit: product.unit,
    buyPrice: product.buyPrice !== undefined ? String(product.buyPrice) : "",
    sellPrice: product.sellPrice !== undefined ? String(product.sellPrice) : String(product.price),
    stockQty: String(product.stockQty ?? 0),
    minQty: product.minQty !== undefined ? String(product.minQty) : "",
    expirationDate: product.expirationDate ?? "",
  };
}

function areProductsSame(a: CatalogProduct, b: CatalogProduct) {
  return (
    a.name === b.name &&
    a.sku === b.sku &&
    (a.barcode ?? "") === (b.barcode ?? "") &&
    a.category === b.category &&
    a.unit === b.unit &&
    (a.buyPrice ?? null) === (b.buyPrice ?? null) &&
    (a.sellPrice ?? a.price) === (b.sellPrice ?? b.price) &&
    a.price === b.price &&
    a.stockQty === b.stockQty &&
    (a.minQty ?? null) === (b.minQty ?? null) &&
    (a.expirationDate ?? "") === (b.expirationDate ?? "") &&
    (a.imageData ?? "") === (b.imageData ?? "")
  );
}

function applyImportRecords(records: CsvRecord[], baseProducts: CatalogProduct[]) {
  const nextProducts = [...baseProducts];
  const skuIndex = new Map(baseProducts.map((product, index) => [product.sku, index]));
  const summary: ImportSummary = {
    inserted: [],
    updated: [],
    skipped: 0,
    totalRows: records.length,
  };

  for (const record of records) {
    const sku = record.sku?.trim();
    if (!sku) {
      summary.skipped += 1;
      continue;
    }
    const existingIndex = skuIndex.get(sku);
    const existingProduct = existingIndex !== undefined ? nextProducts[existingIndex] : undefined;
    const nextProduct = buildProductFromRecord(record, existingProduct);
    if (!nextProduct) {
      summary.skipped += 1;
      continue;
    }
    if (existingIndex !== undefined) {
      const previousProduct = nextProducts[existingIndex];
      if (!previousProduct) {
        summary.skipped += 1;
        continue;
      }
      if (areProductsSame(previousProduct, nextProduct)) {
        summary.skipped += 1;
        continue;
      }
      nextProducts[existingIndex] = nextProduct;
      summary.updated.push({
        previous: previousProduct,
        next: nextProduct,
      });
    } else {
      nextProducts.push(nextProduct);
      skuIndex.set(sku, nextProducts.length - 1);
      summary.inserted.push(nextProduct);
    }
  }

  return { nextProducts, summary };
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [markupInput, setMarkupInput] = useState("5");
  const [minQtyInput, setMinQtyInput] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  const selectedProducts = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return products.filter((product) => selectedIds.has(product.id));
  }, [products, selectedIds]);

  const isAllFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedIds.has(product.id));
  const someFilteredSelected = filteredProducts.some((product) => selectedIds.has(product.id));
  const hasSelection = selectedIds.size > 0;
  const parsedMarkupInput = Number(markupInput);
  const parsedMinQtyInput = Number(minQtyInput);
  const canApplyMarkup =
    hasSelection && markupInput.trim().length > 0 && !Number.isNaN(parsedMarkupInput);
  const canApplyMinQty =
    hasSelection &&
    minQtyInput.trim().length > 0 &&
    !Number.isNaN(parsedMinQtyInput) &&
    parsedMinQtyInput >= 0;
  const exportDisabled = selectedProducts.length === 0 && filteredProducts.length === 0;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = !isAllFilteredSelected && someFilteredSelected;
  }, [isAllFilteredSelected, someFilteredSelected]);

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
      id: editingId ?? createProductId(),
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

  const handleToggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (!filteredProducts.length) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !filteredProducts.every((product) => next.has(product.id));
      filteredProducts.forEach((product) => {
        if (shouldSelectAll) {
          next.add(product.id);
        } else {
          next.delete(product.id);
        }
      });
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
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
    setSelectedIds((prev) => {
      if (!prev.has(productId)) return prev;
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleReset = () => {
    const defaults = resetProducts();
    setProducts(defaults);
    setForm(loadDraftOrEmpty());
    setEditingId(null);
    setIsFormOpen(false);
    setFilter("");
    setSelectedIds(new Set());
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

  const handleExportCsv = () => {
    if (!isBrowser()) return;
    const target = selectedProducts.length > 0 ? selectedProducts : filteredProducts;
    if (!target.length) return;
    const rows = target.map((product) => {
      const csvRecord = productToCsvRecord(product);
      return CSV_HEADERS.map((field) => escapeCsvValue(csvRecord[field] ?? "")).join(",");
    });
    const csvContent = [CSV_HEADERS.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset to allow uploading the same file twice in a row.
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setImportFeedback("Unable to read the CSV file.");
        return;
      }
      let records: CsvRecord[] = [];
      try {
        records = parseCsvRecords(reader.result);
      } catch {
        setImportFeedback("Unable to parse the CSV file.");
        return;
      }
      if (!records.length) {
        setImportFeedback("No rows detected in the CSV file.");
        return;
      }
      const { summary } = applyImportRecords(records, products);
      if (!summary.inserted.length && !summary.updated.length) {
        setImportFeedback("No new or updated rows detected.");
        setImportPreview(null);
        return;
      }
      setImportFeedback(
        `Reviewing ${file.name}: ${summary.inserted.length} new, ${summary.updated.length} updates, ${summary.skipped} skipped.`,
      );
      setImportPreview({
        fileName: file.name,
        records,
        summary,
      });
    };
    reader.onerror = () => {
      setImportFeedback("Failed to read the CSV file.");
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const { nextProducts, summary } = applyImportRecords(importPreview.records, products);
    if (!summary.inserted.length && !summary.updated.length) {
      setImportFeedback("No changes detected in the selected file.");
      setImportPreview(null);
      return;
    }
    setProducts(nextProducts);
    saveProducts(nextProducts);
    setImportFeedback(
      `Imported ${summary.inserted.length} new, updated ${summary.updated.length}, skipped ${summary.skipped}.`,
    );
    setImportPreview(null);
    setSelectedIds(new Set());
  };

  const handleCancelImportPreview = () => {
    setImportPreview(null);
    setImportFeedback("Import preview discarded.");
  };

  const handleApplyMarkup = () => {
    if (!hasSelection) return;
    const percent = Number(markupInput);
    if (Number.isNaN(percent)) return;
    setProducts((prev) => {
      const next = prev.map((product) => {
        if (!selectedIds.has(product.id)) return product;
        const baseSell = product.sellPrice ?? product.price;
        const updatedSell = Number((baseSell * (1 + percent / 100)).toFixed(2));
        return {
          ...product,
          sellPrice: updatedSell,
          price: updatedSell,
        };
      });
      saveProducts(next);
      return next;
    });
  };

  const handleApplyMinQty = () => {
    if (!hasSelection) return;
    const qty = Number(minQtyInput);
    if (Number.isNaN(qty) || qty < 0) return;
    setProducts((prev) => {
      const next = prev.map((product) =>
        selectedIds.has(product.id) ? { ...product, minQty: qty } : product,
      );
      saveProducts(next);
      return next;
    });
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm lg:max-w-sm"
                placeholder="Search by name, SKU, or barcode"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleImportButtonClick}
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleExportCsv}
                  disabled={exportDisabled}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
            {importFeedback ? (
              <p className="text-xs text-muted-foreground">{importFeedback}</p>
            ) : null}
            {importPreview ? (
              <div className="space-y-3 rounded-2xl border bg-card/60 p-4 text-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Import preview
                    </p>
                    <p className="text-sm font-semibold">{importPreview.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {importPreview.summary.inserted.length} new ·{" "}
                      {importPreview.summary.updated.length} updates ·{" "}
                      {importPreview.summary.skipped} skipped
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="gap-2 bg-green-600 text-white hover:bg-green-500"
                      onClick={handleConfirmImport}
                    >
                      Apply changes
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelImportPreview}>
                      Discard
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      New SKUs
                    </p>
                    {importPreview.summary.inserted.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No new rows.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-xs">
                        {importPreview.summary.inserted.slice(0, IMPORT_PREVIEW_LIMIT).map((product) => (
                          <li key={product.sku} className="rounded-lg border px-3 py-2">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-muted-foreground">SKU: {product.sku}</p>
                          </li>
                        ))}
                        {importPreview.summary.inserted.length > IMPORT_PREVIEW_LIMIT ? (
                          <p className="text-[11px] text-muted-foreground">
                            +{importPreview.summary.inserted.length - IMPORT_PREVIEW_LIMIT} more
                          </p>
                        ) : null}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      Updates
                    </p>
                    {importPreview.summary.updated.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No changes detected.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-xs">
                        {importPreview.summary.updated.slice(0, IMPORT_PREVIEW_LIMIT).map((entry) => {
                          const priceBefore = entry.previous.sellPrice ?? entry.previous.price;
                          const priceAfter = entry.next.sellPrice ?? entry.next.price;
                          const priceChanged = priceBefore !== priceAfter;
                          return (
                            <li key={entry.next.id} className="rounded-lg border px-3 py-2">
                              <p className="font-medium">{entry.next.name}</p>
                              <p className="text-muted-foreground">SKU: {entry.next.sku}</p>
                              {priceChanged ? (
                                <p className="mt-1 font-mono text-[11px]">
                                  Price {formatCurrency(priceBefore)} → {formatCurrency(priceAfter)}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                        {importPreview.summary.updated.length > IMPORT_PREVIEW_LIMIT ? (
                          <p className="text-[11px] text-muted-foreground">
                            +{importPreview.summary.updated.length - IMPORT_PREVIEW_LIMIT} more
                          </p>
                        ) : null}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            {hasSelection ? (
              <div className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-4 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Batch edit</p>
                  <p className="text-sm font-semibold">{selectedIds.size} selected</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium">Markup (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                      value={markupInput}
                      onChange={(event) => setMarkupInput(event.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                      onClick={handleApplyMarkup}
                      disabled={!canApplyMarkup}
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium">Min qty</label>
                    <input
                      type="number"
                      min="0"
                      className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                      value={minQtyInput}
                      onChange={(event) => setMinQtyInput(event.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={handleApplyMinQty}
                      disabled={!canApplyMinQty}
                    >
                      Set
                    </Button>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={handleClearSelection}>
                    Clear selection
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="max-h-[420px] overflow-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2 text-left">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="size-4 rounded border"
                        checked={isAllFilteredSelected && filteredProducts.length > 0}
                        onChange={handleToggleSelectAll}
                        aria-checked={
                          !isAllFilteredSelected && someFilteredSelected ? "mixed" : undefined
                        }
                      />
                    </th>
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
                      <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
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
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              className="size-4 rounded border"
                              checked={selectedIds.has(product.id)}
                              onChange={() => handleToggleSelect(product.id)}
                            />
                          </td>
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
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDuplicate(product)}
                              >
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
