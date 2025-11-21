import {
  Download,
  LayoutGrid,
  List,
  Home,
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
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct, UnitType } from "@/types";
import { logAuditEvent } from "@/lib/auditLog";
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
const DEFAULT_AUDIT_ACTOR = "Backoffice";

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

interface ImportHistoryEntry {
  fileName: string;
  appliedAt: number;
  summary: ImportSummary;
  previousProducts: CatalogProduct[];
}

interface ProductBuilderProps {
  onGoHome?: () => void;
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
  CSV_HEADERS.forEach((field) => {
    headerLookup.set(field.toLowerCase(), field);
  });
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

function cloneProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.map((product) => ({ ...product }));
}

function summarizeProductCreation(product: CatalogProduct) {
  return [
    `Initial stock ${product.stockQty} ${product.unit}`,
    `Sell price ${formatCurrency(product.sellPrice ?? product.price)}`,
  ];
}

function summarizeProductDiff(before: CatalogProduct, after: CatalogProduct) {
  const changes: string[] = [];
  if (before.name !== after.name) {
    changes.push(`Name: ${before.name} → ${after.name}`);
  }
  if (before.category !== after.category) {
    changes.push(`Category: ${before.category} → ${after.category}`);
  }
  const beforeSell = before.sellPrice ?? before.price;
  const afterSell = after.sellPrice ?? after.price;
  if (beforeSell !== afterSell) {
    changes.push(`Sell: ${formatCurrency(beforeSell)} → ${formatCurrency(afterSell)}`);
  }
  if ((before.buyPrice ?? null) !== (after.buyPrice ?? null)) {
    changes.push(
      `Buy: ${before.buyPrice !== undefined ? formatCurrency(before.buyPrice) : "—"} → ${
        after.buyPrice !== undefined ? formatCurrency(after.buyPrice) : "—"
      }`,
    );
  }
  if (before.stockQty !== after.stockQty) {
    changes.push(`Stock: ${before.stockQty} → ${after.stockQty}`);
  }
  if ((before.minQty ?? null) !== (after.minQty ?? null)) {
    changes.push(
      `Min qty: ${before.minQty ?? "—"} → ${after.minQty ?? "—"}`,
    );
  }
  if ((before.expirationDate ?? "") !== (after.expirationDate ?? "")) {
    changes.push(
      `Expiration: ${before.expirationDate ?? "—"} → ${after.expirationDate ?? "—"}`,
    );
  }
  return changes.length ? changes : ["No field-level differences recorded."];
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

export function ProductBuilder({ onGoHome }: ProductBuilderProps = {}) {
  const [products, setProducts] = useState<CatalogProduct[]>(() => getStoredProducts());
  const [form, setForm] = useState<ProductFormState>(() => readDraftForm() ?? emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [markupInput, setMarkupInput] = useState("5");
  const [minQtyInput, setMinQtyInput] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [lastImportSnapshot, setLastImportSnapshot] = useState<ImportHistoryEntry | null>(null);
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

  useEffect(() => {
    if (!onGoHome) return;
    const handleEscapeToHome = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onGoHome();
      }
    };

    window.addEventListener("keydown", handleEscapeToHome);
    return () => window.removeEventListener("keydown", handleEscapeToHome);
  }, [onGoHome]);

  const loadDraftOrEmpty = () => readDraftForm() ?? emptyForm;

  const parseNumberInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

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
    const buyPriceValue = parseNumberInput(form.buyPrice);
    const sellPriceValue = parseNumberInput(form.sellPrice) ?? 0;
    const stockQtyValue = parseNumberInput(form.stockQty) ?? 0;
    const minQtyValue = parseNumberInput(form.minQty);
    const existingProduct = editingId
      ? products.find((product) => product.id === editingId)
      : undefined;
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
      stockQty: stockQtyValue,
      minQty: minQtyValue,
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

    logAuditEvent({
      action: existingProduct ? "update" : "create",
      actor: DEFAULT_AUDIT_ACTOR,
      summary: `${existingProduct ? "Updated" : "Created"} ${nextProduct.name} (${nextProduct.sku})`,
      details: existingProduct
        ? summarizeProductDiff(existingProduct, nextProduct)
        : summarizeProductCreation(nextProduct),
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
    const targetProduct = products.find((product) => product.id === productId);
    if (!targetProduct) return;
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

    logAuditEvent({
      action: "delete",
      actor: DEFAULT_AUDIT_ACTOR,
      summary: `Deleted ${targetProduct.name} (${targetProduct.sku})`,
      details: [
        `Last sell price ${formatCurrency(targetProduct.sellPrice ?? targetProduct.price)}`,
        `Stock on removal ${targetProduct.stockQty}`,
      ],
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
    setLastImportSnapshot(null);
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
    const previousProducts = cloneProducts(products);
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
    logAuditEvent({
      action: "import",
      actor: DEFAULT_AUDIT_ACTOR,
      summary: `Imported ${importPreview.fileName}`,
      details: [
        `${summary.inserted.length} new SKU(s)`,
        `${summary.updated.length} updated`,
        `${summary.skipped} skipped`,
      ],
    });
    setLastImportSnapshot({
      fileName: importPreview.fileName,
      appliedAt: Date.now(),
      summary,
      previousProducts,
    });
    setImportPreview(null);
    setSelectedIds(new Set());
  };

  const handleCancelImportPreview = () => {
    setImportPreview(null);
    setImportFeedback("Import preview discarded.");
  };

  const handleUndoImport = () => {
    if (!lastImportSnapshot) return;
    const restored = cloneProducts(lastImportSnapshot.previousProducts);
    setProducts(restored);
    saveProducts(restored);
    setImportFeedback(
      `Undid import from ${new Date(lastImportSnapshot.appliedAt).toLocaleString()} (${lastImportSnapshot.summary.inserted.length} new / ${lastImportSnapshot.summary.updated.length} updated).`,
    );
    logAuditEvent({
      action: "undo",
      actor: DEFAULT_AUDIT_ACTOR,
      summary: `Undid import ${lastImportSnapshot.fileName}`,
      details: [
        `${lastImportSnapshot.summary.inserted.length} inserted reverted`,
        `${lastImportSnapshot.summary.updated.length} updates reverted`,
      ],
    });
    setLastImportSnapshot(null);
    setSelectedIds(new Set());
  };

  const handleDismissUndoSnapshot = () => {
    setLastImportSnapshot(null);
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
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Product builder</h1>
          <p className="text-sm text-muted-foreground">Focus on the list; zero wasted space.</p>
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
          <Button variant="outline" className="gap-2" onClick={handleReset}>
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleImportButtonClick}>
            <Download className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={exportDisabled}
          >
            <Upload className="h-4 w-4" />
            Export
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
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm lg:max-w-md"
              placeholder="Search by name, SKU, or barcode"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2" onClick={handleOpenNewProduct}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportCsv}
              />
            </div>
          </div>
          {importFeedback ? (
            <p className="mt-2 text-xs text-muted-foreground">{importFeedback}</p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden p-4">
          {lastImportSnapshot ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">
                  Undo available
                </p>
                <p className="font-semibold">{lastImportSnapshot.fileName}</p>
                <p className="text-xs">
                  Applied {new Date(lastImportSnapshot.appliedAt).toLocaleTimeString()} ·{" "}
                  {lastImportSnapshot.summary.inserted.length} new /{" "}
                  {lastImportSnapshot.summary.updated.length} updated
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                  onClick={handleUndoImport}
                >
                  Undo
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleDismissUndoSnapshot}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}

          {importPreview ? (
            <div className="space-y-3 rounded-xl border bg-card/70 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                    Import preview
                  </p>
                  <p className="text-sm font-semibold">{importPreview.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {importPreview.summary.inserted.length} new · {importPreview.summary.updated.length} updates ·{" "}
                    {importPreview.summary.skipped} skipped
                  </p>
                </div>
                <div className="flex gap-2">
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
            </div>
          ) : null}

          {hasSelection ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Batch edit</p>
                <p className="text-sm font-semibold">{selectedIds.size} selected</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <span>Markup (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                    value={markupInput}
                    onChange={(event) => setMarkupInput(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                  onClick={handleApplyMarkup}
                  disabled={!canApplyMarkup}
                >
                  Apply
                </Button>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <span>Min qty</span>
                  <input
                    type="number"
                    min="0"
                    className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                    value={minQtyInput}
                    onChange={(event) => setMinQtyInput(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={handleApplyMinQty}
                  disabled={!canApplyMinQty}
                >
                  Set
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleClearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card/60">
            {filteredProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
                Nothing matches your search.
              </div>
            ) : viewMode === "list" ? (
              <div className="h-full overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/50 text-xs uppercase text-muted-foreground">
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
                      <th className="px-3 py-2 text-left">Sell</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Expires</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {filteredProducts.map((product) => {
                      const minQty = product.minQty ?? 0;
                      const isLowStock = product.stockQty <= minQty;
                      return (
                        <tr key={product.id} className={isLowStock ? "bg-destructive/5" : undefined}>
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
                              <div className="h-10 w-10 overflow-hidden rounded-lg border bg-muted/40">
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
                                <p className="font-medium leading-tight">{product.name}</p>
                                <p className="text-[11px] text-muted-foreground">{product.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{product.sku}</td>
                          <td className="px-3 py-3">{formatCurrency(product.sellPrice ?? product.price)}</td>
                          <td className="px-3 py-3 text-right">
                            <span>{product.stockQty}</span>
                            {isLowStock ? (
                              <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
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
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDuplicate(product)}>
                                Copy
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
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-auto p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => {
                    const minQty = product.minQty ?? 0;
                    const isLowStock = product.stockQty <= minQty;
                    return (
                      <Card key={product.id} className="h-full">
                        <CardContent className="space-y-3 p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-lg border bg-muted/40">
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
                            <div className="flex-1">
                              <p className="font-semibold leading-tight">{product.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {product.category} · {product.sku}
                              </p>
                            </div>
                            {isLowStock ? (
                              <Badge variant="destructive" className="text-[11px]">
                                Low
                              </Badge>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>Sell</span>
                            <span className="text-right font-semibold text-foreground">
                              {formatCurrency(product.sellPrice ?? product.price)}
                            </span>
                            <span>Stock</span>
                            <span className="text-right font-semibold text-foreground">{product.stockQty}</span>
                            <span>Expires</span>
                            <span className="text-right text-foreground">
                              {product.expirationDate
                                ? new Date(product.expirationDate).toLocaleDateString("en-GB")
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDuplicate(product)}>
                              Copy
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
