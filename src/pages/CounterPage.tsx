import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Barcode,
  Bell,
  Calculator,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FolderCog,
  HandCoins,
  Home,
  LayoutGrid,
  PackagePlus,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import {
  type FormEvent,
  type MutableRefObject,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { CartItem, CatalogProduct, CheckoutTotals } from "@/types";

interface CounterPageProps {
  availableProducts: CatalogProduct[];
  onGoHome?: () => void;
}

type SelectionRange = { start: number; end: number };

const toolbarActions = [
  { label: "Produits", shortcut: "F1", icon: ShoppingBag },
  { label: "Facture Achat", shortcut: "F2", icon: PackagePlus },
  { label: "Réglage", shortcut: "F3", icon: FolderCog },
  { label: "Charges", shortcut: "F7", icon: CreditCard },
  { label: "Clôture", shortcut: "F9", icon: ClipboardList },
];

const topTabs = [
  { label: "Favoris", icon: Star },
  { label: "Stock" },
  { label: "Historique", icon: ClipboardList },
];

const favoriteButtons = [
  { label: "مشروبات", color: "bg-amber-500 text-white" },
  { label: "FAV2", color: "bg-emerald-600 text-white" },
  { label: "FAV3", color: "bg-sky-600 text-white" },
  { label: "FAV4", color: "bg-rose-900 text-white" },
  { label: "FAV5", color: "bg-red-500 text-white" },
  { label: "FAV6", color: "bg-gray-500 text-white" },
  { label: "FAV7", color: "bg-lime-600 text-white" },
  { label: "FAV8", color: "bg-cyan-700 text-white" },
  { label: "FAV9", color: "bg-purple-800 text-white" },
  { label: "FAV10", color: "bg-orange-600 text-white" },
  { label: "FAV11", color: "bg-indigo-900 text-white" },
  { label: "FAV12", color: "bg-slate-200 text-slate-600" },
  { label: "FAV13", color: "bg-slate-200 text-slate-600" },
  { label: "FAV14", color: "bg-slate-200 text-slate-600" },
  { label: "FAV15", color: "bg-slate-200 text-slate-600" },
];

const keypadRows = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["←", "0", "C"],
];

const MAX_BASKETS = 7;
const HOLD_SLOT_COUNT = 6;
const HOLD_SLOT_KEYS = ["hold-slot-a", "hold-slot-b", "hold-slot-c", "hold-slot-d", "hold-slot-e", "hold-slot-f"];

interface PendingBasket {
  id: string;
  items: CartItem[];
}

interface BasketHistoryEntry {
  id: string;
  createdAt: string;
  items: CartItem[];
  total: number;
}

function createBasketId() {
  return crypto.randomUUID?.() ?? `basket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyBasket(): PendingBasket {
  return {
    id: createBasketId(),
    items: [],
  };
}

export function CounterPage({ availableProducts, onGoHome }: CounterPageProps) {
  const [baskets, setBaskets] = useState<PendingBasket[]>(() => [createEmptyBasket()]);
  const [activeBasketIndex, setActiveBasketIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [historyBaskets, setHistoryBaskets] = useState<BasketHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [scannerListening, setScannerListening] = useState(true);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerQty, setScannerQty] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState(topTabs[0].label);
  const [manualMode, setManualMode] = useState(false);
  const [manualProductId, setManualProductId] = useState(availableProducts[0]?.id ?? "");
  const [manualQty, setManualQty] = useState(1);
  const [isPricePanelOpen, setIsPricePanelOpen] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [totalInput, setTotalInput] = useState("");
  const [pricePanelFocus, setPricePanelFocus] = useState<"price" | "quantity" | "total">("price");
  const [priceModalItem, setPriceModalItem] = useState<CartItem | null>(null);
  const [basketNotice, setBasketNotice] = useState<string | null>(null);
  const [isBasketOverviewOpen, setBasketOverviewOpen] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const basketTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const priceSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const quantitySelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const totalSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const basketsRef = useRef<PendingBasket[]>(baskets);
  useEffect(() => {
    basketsRef.current = baskets;
  }, [baskets]);

  const activeBasket = baskets[activeBasketIndex] ?? baskets[0];
  const activeBasketId = activeBasket?.id ?? "";
  const basketItems = activeBasket?.items ?? [];
  const holdBasketEntries = useMemo(
    () =>
      baskets
        .map((basket, index) => ({ basket, index }))
        .filter(({ index }) => index !== activeBasketIndex)
        .slice(0, HOLD_SLOT_COUNT),
    [baskets, activeBasketIndex],
  );

  const updateActiveBasketItems = useCallback(
    (updater: (items: CartItem[]) => CartItem[]) => {
      setBaskets((prev) => {
        if (!prev.length) return prev;
        const index = Math.min(activeBasketIndex, prev.length - 1);
        const target = prev[index];
        if (!target) return prev;
        const next = [...prev];
        next[index] = { ...target, items: updater(target.items) };
        return next;
      });
    },
    [activeBasketIndex],
  );

  const handleSelectBasket = useCallback((index: number) => {
    setActiveBasketIndex((current) => {
      const count = basketsRef.current.length;
      if (index < 0 || index >= count) return current;
      return index;
    });
  }, []);

  const handleResumeBasket = useCallback(
    (index: number) => {
      handleSelectBasket(index);
      setBasketOverviewOpen(false);
    },
    [handleSelectBasket],
  );

  const handleAddBasket = useCallback(() => {
    setBaskets((prev) => {
      if (prev.length >= MAX_BASKETS) {
        setBasketNotice(`Limite de ${MAX_BASKETS} paniers atteinte.`);
        return prev;
      }
      const next = [...prev, createEmptyBasket()];
      setActiveBasketIndex(next.length - 1);
      setBasketNotice(null);
      return next;
    });
  }, []);

  const cycleBasket = useCallback((direction: 1 | -1) => {
    setActiveBasketIndex((current) => {
      const count = basketsRef.current.length;
      if (count <= 1) return current;
      const nextIndex = (current + direction + count) % count;
      return nextIndex;
    });
  }, []);

  const handlePriceSelection = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    priceSelectionRef.current = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? target.value.length,
    };
  }, []);
  const handleQuantitySelection = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    quantitySelectionRef.current = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? target.value.length,
    };
  }, []);
  const handleTotalSelection = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    totalSelectionRef.current = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? target.value.length,
    };
  }, []);

  useEffect(() => {
    if (scannerListening) {
      scannerInputRef.current?.focus();
    }
  }, [scannerListening]);

  useEffect(() => {
    if (!availableProducts.length) {
      setManualProductId("");
      return;
    }
    setManualProductId((current) => {
      if (current && availableProducts.some((product) => product.id === current)) {
        return current;
      }
      return availableProducts[0]?.id ?? "";
    });
  }, [availableProducts]);
  useEffect(() => {
    if (!selectedItemId) return;
    const stillExists = basketItems.some((item) => item.id === selectedItemId);
    if (!stillExists) {
      setSelectedItemId(null);
    }
  }, [basketItems, selectedItemId]);

  const selectedItem = useMemo(
    () => basketItems.find((item) => item.id === selectedItemId) ?? null,
    [basketItems, selectedItemId],
  );

  useEffect(() => {
    if (isPricePanelOpen && priceModalItem) {
      setPriceInput(String(priceModalItem.price));
      setQuantityInput(String(priceModalItem.qty));
      setTotalInput(String(priceModalItem.price * priceModalItem.qty));
      requestAnimationFrame(() => {
        if (pricePanelFocus === "price") {
          priceInputRef.current?.focus();
          priceInputRef.current?.select();
          const length = priceInputRef.current?.value.length ?? 0;
          priceSelectionRef.current = { start: 0, end: length };
        } else {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
          const length = quantityInputRef.current?.value.length ?? 0;
          quantitySelectionRef.current = { start: 0, end: length };
        }
      });
    }
  }, [isPricePanelOpen, priceModalItem, pricePanelFocus]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(availableProducts.map((product) => product.category)));
    return ["all", ...unique];
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLowerCase();
    return availableProducts.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const matchesQuery =
        normalized.length === 0 ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [availableProducts, productSearch, activeCategory]);

  const stockOverview = useMemo(() => {
    const categoryMap = new Map<string, { category: string; skuCount: number; totalQty: number; value: number }>();
    for (const product of availableProducts) {
      const entry =
        categoryMap.get(product.category) ?? {
          category: product.category,
          skuCount: 0,
          totalQty: 0,
          value: 0,
        };
      entry.skuCount += 1;
      const qty = Number(product.stockQty ?? 0);
      entry.totalQty += qty;
      const unitValue = Number(product.buyPrice ?? product.price);
      entry.value += unitValue * qty;
      categoryMap.set(product.category, entry);
    }
    return Array.from(categoryMap.values());
  }, [availableProducts]);

  const stockTotals = useMemo(() => {
    return stockOverview.reduce(
      (totals, entry) => {
        totals.skuCount += entry.skuCount;
        totals.totalQty += entry.totalQty;
        totals.value += entry.value;
        return totals;
      },
      { skuCount: 0, totalQty: 0, value: 0 },
    );
  }, [stockOverview]);

  const historyEntries = useMemo(() => historyBaskets, [historyBaskets]);


  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discounts = basketItems.reduce((sum, item) => sum + (item.discountValue ?? 0), 0);
    const taxable = subtotal - discounts;
    const vat = 0;
    const total = taxable;
    const produceWeight = basketItems
      .filter((item) => item.unit === "kg")
      .reduce((sum, item) => sum + item.qty, 0);
    const pieceCount = basketItems
      .filter((item) => item.unit === "pcs")
      .reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      discounts,
      vat,
      total,
      lines: basketItems.length,
      produceWeight,
      pieceCount,
    };
  }, [basketItems]);

  const totalDisplayValue = useMemo(() => {
    const value = new Intl.NumberFormat("en-DZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(totals.total);
    return `${value} DA`;
  }, [totals.total]);

  const activeHistoryEntry = useMemo(
    () => historyBaskets.find((entry) => entry.id === selectedHistoryId) ?? null,
    [historyBaskets, selectedHistoryId],
  );
  const displayedDate = activeHistoryEntry
    ? new Date(activeHistoryEntry.createdAt).toLocaleString("fr-DZ")
    : new Date().toLocaleDateString("fr-DZ");
  const displayedBasketLabel = activeHistoryEntry
    ? `Panier archivé`
    : `Panier ${activeBasketIndex + 1}/${Math.max(1, baskets.length)}`;
  const displayedItems = basketItems;
  const displayedArticles = displayedItems.length;
  const displayedTotalValue = totalDisplayValue;
  const isHistoryPreview = activeHistoryEntry !== null;

  useEffect(() => {
    if (!basketItems.length) return;
    const tbody = basketTableBodyRef.current;
    tbody?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [basketItems]);

  const focusScannerInput = useCallback(() => {
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!activeBasketId) return;
    setSelectedItemId(null);
    focusScannerInput();
  }, [activeBasketId, focusScannerInput]);

  const handleGoHome = useCallback(() => {
    if (onGoHome) {
      onGoHome();
    } else {
      focusScannerInput();
    }
  }, [focusScannerInput, onGoHome]);

  const upsertItem = useCallback(
    (product: CatalogProduct, quantity: number) => {
      if (Number.isNaN(quantity) || quantity <= 0) return;
      updateActiveBasketItems((items) => {
        const existingIndex = items.findIndex((entry) => entry.sku === product.sku);
        if (existingIndex >= 0) {
          const updated = [...items];
          const item = updated[existingIndex];
          updated[existingIndex] = { ...item, qty: item.qty + quantity };
          setTimeout(() => {
            const tbody = basketTableBodyRef.current;
            if (tbody) {
              tbody.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }, 0);
          return updated;
        }
        return [
          ...items,
          {
            id: product.id,
            barcode: product.barcode ?? product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            qty: quantity,
            price: product.price,
            category: product.category,
            imageData: product.imageData,
          },
        ];
      });
    },
    [updateActiveBasketItems],
  );

  const handleScanSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!scannerListening || !scannerInput.trim()) return;
      const product = availableProducts.find((item) => item.barcode === scannerInput.trim());
      if (!product) return;
      upsertItem(product, scannerQty);
      setScannerInput("");
      setScannerQty(1);
      focusScannerInput();
    },
    [availableProducts, scannerInput, scannerListening, scannerQty, upsertItem, focusScannerInput],
  );

  const handleProductCardClick = useCallback(
    (product: CatalogProduct) => {
      upsertItem(product, 1);
    },
    [upsertItem],
  );

  const handleManualAdd = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!manualProductId) return;
      const product = availableProducts.find((item) => item.id === manualProductId);
      if (!product) return;
      upsertItem(product, manualQty);
      setManualQty(1);
      setManualMode(false);
      scannerInputRef.current?.focus();
    },
    [availableProducts, manualProductId, manualQty, upsertItem],
  );

  const handleCancelBasket = useCallback(() => {
    updateActiveBasketItems(() => []);
    focusScannerInput();
    setSelectedItemId(null);
    setSelectedHistoryId(null);
  }, [focusScannerInput, updateActiveBasketItems]);

  const handleFinishBasket = useCallback(() => {
    if (!basketItems.length) return;
    const snapshotItems = basketItems.map((item) => ({ ...item }));
    const total = snapshotItems.reduce(
      (sum, item) => sum + item.qty * (item.sellPrice ?? item.price) - (item.discountValue ?? 0),
      0,
    );
    const entry: BasketHistoryEntry = {
      id: createBasketId(),
      createdAt: new Date().toISOString(),
      items: snapshotItems,
      total,
    };
    setHistoryBaskets((prev) => {
      const filtered = selectedHistoryId ? prev.filter((hist) => hist.id !== selectedHistoryId) : prev;
      return [entry, ...filtered];
    });
    setSelectedHistoryId(null);
    updateActiveBasketItems(() => []);
    focusScannerInput();
    setSelectedItemId(null);
  }, [basketItems, focusScannerInput, selectedHistoryId, updateActiveBasketItems]);

  const handleSelectHistoryEntry = useCallback(
    (entry: BasketHistoryEntry) => {
      setSelectedHistoryId(entry.id);
      updateActiveBasketItems(() => entry.items.map((item) => ({ ...item })));
      focusScannerInput();
      setSelectedItemId(null);
    },
    [focusScannerInput, updateActiveBasketItems],
  );

  const handlePrintReceipt = useCallback(() => {
    window.print();
  }, []);

  const handleDeleteLastItem = useCallback(() => {
    updateActiveBasketItems((prev) => {
      if (prev.length === 0) return prev;
      if (selectedItemId) {
        const exists = prev.some((item) => item.id === selectedItemId);
        if (exists) {
          setSelectedItemId(null);
          return prev.filter((item) => item.id !== selectedItemId);
        }
        setSelectedItemId(null);
      }
      return prev.slice(0, -1);
    });
  }, [selectedItemId, updateActiveBasketItems]);

  const handleOpenPricePanel = useCallback(
    (focusField: "price" | "quantity" = "price") => {
      const targetItem = selectedItem ?? basketItems[basketItems.length - 1] ?? null;
      if (!targetItem) return;
      if (!selectedItemId || selectedItemId !== targetItem.id) {
        setSelectedItemId(targetItem.id);
      }
      setPriceModalItem(targetItem);
      setPriceInput(String(targetItem.price));
      setQuantityInput(String(targetItem.qty));
      setTotalInput(String(targetItem.price * targetItem.qty));
      setPricePanelFocus(focusField);
      setIsPricePanelOpen(true);
    },
    [basketItems, selectedItem, selectedItemId],
  );

  const handleClosePricePanel = useCallback(() => {
    setIsPricePanelOpen(false);
    setPriceModalItem(null);
  }, []);

  const handleConfirmPriceUpdate = useCallback(() => {
    if (!priceModalItem) return;
    const nextPrice = Number(priceInput);
    const nextQty = Number(quantityInput);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) return;
    if (!Number.isFinite(nextQty) || nextQty <= 0) return;
    updateActiveBasketItems((prev) =>
      prev.map((item) =>
        item.id === priceModalItem.id ? { ...item, price: nextPrice, qty: nextQty } : item,
      ),
    );
    setIsPricePanelOpen(false);
    setPriceModalItem(null);
  }, [priceInput, quantityInput, priceModalItem, updateActiveBasketItems]);

  const handleCloseBasketOverview = useCallback(() => {
    setBasketOverviewOpen(false);
  }, []);

  const handlePriceInputChange = (value: string) => {
    setPriceInput(value);
    const priceValue = Number(value) || 0;
    const qtyValue = Number(quantityInput) || 0;
    setTotalInput(String(priceValue * qtyValue));
  };

  const handleQuantityInputChange = (value: string) => {
    setQuantityInput(value);
    const qtyValue = Number(value) || 0;
    const priceValue = Number(priceInput) || 0;
    setTotalInput(String(priceValue * qtyValue));
  };

  const handleTotalInputChange = (value: string) => {
    setTotalInput(value);
    const totalValue = Number(value) || 0;
    const qtyValue = Number(quantityInput) || 0;
    if (qtyValue > 0) {
      setPriceInput(String(totalValue / qtyValue));
    }
  };

  const handlePricePanelSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleConfirmPriceUpdate();
    },
    [handleConfirmPriceUpdate],
  );

  const handleKeypadInput = (key: string) => {
    const applyInput = (
      current: string,
      changeHandler: (value: string) => void,
      inputRef: RefObject<HTMLInputElement>,
      selectionRef: MutableRefObject<SelectionRange>,
    ) => {
      const target = inputRef.current;
      const selection = selectionRef.current;
      if (!target) {
        changeHandler(current);
        return;
      }
      if (key === "C") {
        changeHandler("");
        requestAnimationFrame(() => {
          target?.focus();
          target?.setSelectionRange(0, 0);
        });
        selectionRef.current = { start: 0, end: 0 };
        return;
      }
      if (key === "←") {
        const selectionStart = target.selectionStart ?? selection.start ?? target.value.length;
        const selectionEnd = target.selectionEnd ?? selection.end ?? target.value.length;
        let nextStart = selectionStart;
        let nextEnd = selectionStart;
        let nextValue: string;
        if (selectionStart !== selectionEnd) {
          nextValue = `${target.value.slice(0, selectionStart)}${target.value.slice(selectionEnd)}`;
        } else if (selectionStart > 0) {
          nextValue = `${target.value.slice(0, selectionStart - 1)}${target.value.slice(selectionEnd)}`;
          nextStart -= 1;
          nextEnd -= 1;
        } else {
          nextValue = target.value;
        }
        changeHandler(nextValue);
        selectionRef.current = { start: nextStart, end: nextEnd };
        requestAnimationFrame(() => {
          target.focus();
          target.setSelectionRange(nextStart, nextEnd);
        });
        return;
      }
      const insertValue = key;
      const value = target.value ?? current;
      const selectionStart = target.selectionStart ?? selection.start ?? value.length;
      const selectionEnd = target.selectionEnd ?? selection.end ?? value.length;
      const prefix = value.slice(0, selectionStart);
      const suffix = value.slice(selectionEnd);
      const nextValue = `${prefix}${insertValue}${suffix}`;
      changeHandler(nextValue);
      selectionRef.current = {
        start: selectionStart + insertValue.length,
        end: selectionStart + insertValue.length,
      };
      requestAnimationFrame(() => {
        const caret = selectionStart + insertValue.length;
        target?.focus();
        target?.setSelectionRange(caret, caret);
      });
    };

    switch (pricePanelFocus) {
      case "quantity":
        applyInput(
          quantityInput,
          handleQuantityInputChange,
          quantityInputRef,
          quantitySelectionRef,
        );
        break;
      case "total":
        applyInput(totalInput, handleTotalInputChange, totalInputRef, totalSelectionRef);
        break;
      default:
        applyInput(priceInput, handlePriceInputChange, priceInputRef, priceSelectionRef);
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      switch (key) {
        case "f1":
          event.preventDefault();
          focusScannerInput();
          break;
        case "f2":
          event.preventDefault();
          setManualMode((prev) => !prev);
          break;
        case "f3":
          event.preventDefault();
          setScannerListening((prev) => !prev);
          break;
        case "escape":
          event.preventDefault();
          if (isBasketOverviewOpen) {
            handleCloseBasketOverview();
          } else if (isPricePanelOpen) {
            handleClosePricePanel();
          } else {
            handleGoHome();
          }
          break;
        case "f10":
          event.preventDefault();
          handleCancelBasket();
          break;
        case "f9":
          event.preventDefault();
          handleFinishBasket();
          break;
        case "arrowup":
          event.preventDefault();
          cycleBasket(-1);
          break;
        case "arrowdown":
          event.preventDefault();
          cycleBasket(1);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cycleBasket,
    focusScannerInput,
    handleCancelBasket,
    handleCloseBasketOverview,
    handleClosePricePanel,
    handleFinishBasket,
    handleGoHome,
    isBasketOverviewOpen,
    isPricePanelOpen,
  ]);

  const isBasketEmpty = basketItems.length === 0;
  const holdCount = Math.min(HOLD_SLOT_COUNT, Math.max(0, baskets.length - 1));
  const canNavigateBaskets = baskets.length > 1;
  const canCreateBasket = baskets.length < MAX_BASKETS;
  const basketActionsDisabled = isHistoryPreview || isBasketEmpty;

  return (
    <div className="page-shell flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 md:p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex-shrink-0 rounded-2xl border border-strong bg-panel p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {toolbarActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-strong bg-panel-soft px-3 py-2 text-foreground shadow-sm transition hover:border-strong hover:text-emerald-600"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                    <span className="text-[10px] font-bold text-emerald-500">{action.shortcut}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-strong bg-panel-soft px-3 py-2 text-xs shadow-inner">
              <span className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                Le fond de la caisse
              </span>
              <form
                className="ml-auto flex flex-1 flex-wrap items-center gap-2 text-muted-foreground"
                onSubmit={handleScanSubmit}
              >
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-1 text-sm">
                  <Barcode className="h-4 w-4" />
                  <input
                    ref={scannerInputRef}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Scanner le code barre"
                    value={scannerInput}
                    onChange={(event) => setScannerInput(event.target.value)}
                    disabled={!scannerListening}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  value={scannerQty}
                  onChange={(event) => setScannerQty(Math.max(1, Number(event.target.value) || 1))}
                  className="w-16 rounded-2xl border border-strong bg-background px-2 py-1 text-center text-xs"
                />
                <Button size="sm" type="submit" disabled={!scannerListening}>
                  Ajouter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setScannerListening((prev) => !prev)}
                >
                  {scannerListening ? "Pause" : "Reprendre"}
                </Button>
              </form>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-strong bg-panel-soft px-2 py-1 text-[11px] shadow-inner">
              {topTabs.map((tab) => {
                const Icon = tab.icon ?? Bell;
                const isActive = activeTab === tab.label;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setActiveTab(tab.label)}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-1 border transition-colors ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500/20 text-foreground shadow-lg hover:bg-emerald-500/30"
                        : "border-transparent text-muted-foreground hover:border-strong hover:bg-foreground/10 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-1 text-muted-foreground">
                <ScanLine className="h-4 w-4" />
                <input
                  className="bg-transparent text-sm outline-none"
                  placeholder="Rechercher un produit"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            {activeTab === "Stock" ? (
              <section className="flex-1 rounded-2xl border border-strong bg-panel p-4 shadow-inner">
                <div className="grid gap-3 text-[11px] sm:grid-cols-3">
                  <div className="rounded-2xl border border-strong bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Catégories</p>
                    <p className="text-2xl font-semibold">{stockOverview.length}</p>
                  </div>
                  <div className="rounded-2xl border border-strong bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SKUs suivis</p>
                    <p className="text-2xl font-semibold">{stockTotals.skuCount}</p>
                  </div>
                  <div className="rounded-2xl border border-strong bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Valeur estimée</p>
                    <p className="text-2xl font-semibold">{formatCurrency(stockTotals.value)}</p>
                  </div>
                </div>
                <div className="mt-4 overflow-auto rounded-2xl border border-strong bg-background">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 border-b border-strong bg-panel text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                        <th className="px-3 py-2 text-right font-medium">Produits</th>
                        <th className="px-3 py-2 text-right font-medium">Stock total</th>
                        <th className="px-3 py-2 text-right font-medium">Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockOverview.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            Aucune donnée de stock.
                          </td>
                        </tr>
                      ) : (
                        stockOverview.map((entry) => (
                          <tr key={entry.category} className="border-b border-dashed border-border">
                            <td className="px-3 py-2 font-semibold">{entry.category}</td>
                            <td className="px-3 py-2 text-right">{entry.skuCount}</td>
                            <td className="px-3 py-2 text-right">{entry.totalQty}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.value)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : activeTab === "Historique" ? (
              <section className="flex-1 rounded-2xl border border-strong bg-panel p-4 shadow-inner">
                <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  <span>Paniers validés</span>
                  <span>{historyEntries.length} total</span>
                </div>
                <div className="space-y-3 overflow-auto">
                  {historyEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-strong bg-background px-4 py-8 text-center text-xs text-muted-foreground">
                      Aucun panier validé aujourd&apos;hui.
                    </div>
                  ) : (
                    historyEntries.map((entry, index) => {
                      const entryDate = new Date(entry.createdAt);
                      const isSelected = entry.id === selectedHistoryId;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => handleSelectHistoryEntry(entry)}
                          className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left text-[11px] transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                              : "border-strong bg-background text-muted-foreground hover:border-emerald-500 hover:text-foreground"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                            <span>Panier {historyEntries.length - index}</span>
                            <span>Articles : {entry.items.length}</span>
                            <span>{entryDate.toLocaleString("fr-DZ")}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-foreground">{formatCurrency(entry.total)}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {entry.items
                                .slice(0, 2)
                                .map((item) => item.name)
                                .join(", ")}
                              {entry.items.length > 2 ? ` +${entry.items.length - 2}` : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            ) : (
              <>
                <aside className="flex w-48 flex-col rounded-2xl border border-strong bg-panel p-3 text-xs shadow-inner">
                  <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                    Favoris
                  </p>
                  <div className="flex-1 space-y-2 overflow-auto">
                    {favoriteButtons.map((fav, index) => (
                      <button
                        key={fav.label}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-wide ${fav.color} shadow-sm`}
                        onClick={() => setActiveCategory(categories[index] ?? "all")}
                      >
                        <span>{fav.label}</span>
                      </button>
                    ))}
                  </div>
                </aside>

                <section className="flex-1 rounded-2xl border border-strong bg-panel p-4 shadow-inner min-h-0">
                  <div className="grid h-full grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex h-40 flex-col rounded-2xl border border-strong bg-background p-3 text-left text-xs shadow hover:border-strong hover:shadow-lg"
                        onClick={() => handleProductCardClick(product)}
                      >
                        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-strong bg-panel-soft text-[10px] uppercase text-muted-foreground">
                          Illustration
                        </div>
                        <div className="mt-3 space-y-1 text-muted-foreground">
                          <p className="text-sm font-semibold text-foreground">{product.name}</p>
                          <p className="text-xs">{product.sku}</p>
                          <p className="text-[13px] font-semibold text-emerald-600">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-strong text-xs text-muted-foreground">
                        Aucun produit trouvé.
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <aside className="flex w-full max-w-lg gap-3 overflow-hidden">
          <div className="flex w-24 flex-col gap-2 rounded-2xl border border-strong bg-panel-soft p-2 text-[11px] shadow-inner">
            <Button
              className="flex-[0.5] flex-col gap-1 rounded-2xl bg-teal-500 text-xs text-white hover:bg-teal-400"
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4" />
              Home
              <span className="text-[10px]">ESC</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-indigo-500 text-xs text-white hover:bg-indigo-400"
              onClick={handleAddBasket}
              disabled={!canCreateBasket}
            >
              <Plus className="h-4 w-4" />
              Nouv. panier
              <span className="text-[10px]">2e client</span>
            </Button>
            {basketNotice ? (
              <p className="text-center text-[10px] font-medium text-red-500">{basketNotice}</p>
            ) : null}
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-red-500 text-xs text-white hover:bg-red-400 disabled:opacity-60"
              onClick={handleCancelBasket}
              disabled={basketActionsDisabled}
            >
              <RotateCcw className="h-4 w-4" />
              Annuler
              <span className="text-[10px]">F10</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-amber-500 text-xs text-white hover:bg-amber-400 disabled:opacity-60"
              onClick={handleDeleteLastItem}
              disabled={basketActionsDisabled}
            >
              <Trash2 className="h-4 w-4" />
              Suppr
              <span className="text-[10px]">SUPPR</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-blue-500 text-xs text-white hover:bg-blue-400 disabled:opacity-60"
              onClick={() => handleOpenPricePanel("price")}
              disabled={basketActionsDisabled}
            >
              <Tag className="h-4 w-4" />
              Prix
              <span className="text-[10px]">F4</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-slate-500 text-xs text-white hover:bg-slate-400 disabled:opacity-60"
              onClick={() => handleOpenPricePanel("quantity")}
              disabled={basketActionsDisabled}
            >
              <HandCoins className="h-4 w-4" />
              Qté
              <span className="text-[10px]">F3</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-emerald-600 text-xs text-white hover:bg-emerald-500 disabled:opacity-60"
              onClick={handleFinishBasket}
              disabled={basketActionsDisabled}
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider
              <span className="text-[10px]">F11</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-purple-500 text-xs text-white hover:bg-purple-400 disabled:opacity-60"
              onClick={handlePrintReceipt}
              disabled={displayedItems.length === 0}
            >
              <Printer className="h-4 w-4" />
              Reçu
            </Button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-strong bg-panel p-4 shadow-2xl">
            <div className="rounded-2xl border border-border bg-foreground/90 p-4 text-background">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
                <span className="mr-auto">{isHistoryPreview ? "Panier archivé" : "FirstLastName"}</span>
                <span>Articles : {displayedArticles}</span>
                <span>{displayedBasketLabel}</span>
                <span>Date : {displayedDate}</span>
                {isHistoryPreview ? (
                  <Button size="sm" variant="secondary" onClick={() => setSelectedHistoryId(null)}>
                    Revenir au panier actif
                  </Button>
                ) : null}
              </div>
              <p className="mt-6 text-6xl font-semibold tracking-tight">{displayedTotalValue}</p>
            </div>

            <div className="mt-3 flex-1 overflow-hidden rounded-2xl border border-strong bg-background">
              <div className="h-full overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 z-10 border-b border-strong bg-panel text-muted-foreground shadow">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">N°</th>
                      <th className="px-3 py-2 text-left font-medium">Désignation</th>
                      <th className="px-3 py-2 text-right font-medium">Prix U</th>
                      <th className="px-3 py-2 text-right font-medium">Qté</th>
                      <th className="px-3 py-2 text-right font-medium">Totale</th>
                    </tr>
                  </thead>
                    <tbody ref={basketTableBodyRef}>
                      {displayedItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          Ajoutez un article pour démarrer.
                        </td>
                      </tr>
                      ) : (
                        displayedItems.map((item, index) => {
                          const lineTotal = item.price * item.qty - (item.discountValue ?? 0);
                          const isSelected = !isHistoryPreview && selectedItemId === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={
                                isHistoryPreview
                                  ? undefined
                                  : () =>
                                      setSelectedItemId((current) => (current === item.id ? null : item.id))
                              }
                              className={`${
                                isHistoryPreview ? "cursor-default" : "cursor-pointer"
                              } border-b border-dashed border-strong transition ${
                                isSelected
                                  ? "bg-emerald-100/50 dark:bg-emerald-500/10"
                                  : index === 0
                                    ? "bg-muted/40 hover:bg-muted/50"
                                    : "hover:bg-muted/40"
                              }`}
                            >
                            <td className="px-3 py-2 font-semibold">{index + 1}</td>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                            <td className="px-3 py-2 text-right">{formatQuantity(item.qty, item.unit)}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-strong bg-panel-soft p-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-2xl border border-emerald-500 bg-background px-3 py-1">
                  <ScanLine className="h-4 w-4 text-emerald-500" />
                  <input className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher client" />
                </div>
                <Button size="sm" variant="secondary">
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  Livreur
                  <select className="rounded-xl border border-strong bg-background px-2 py-1">
                    <option>sahiheha</option>
                    <option>khadeeja</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Client
                  <select className="rounded-xl border border-strong bg-background px-2 py-1">
                    <option>Standard client</option>
                    <option>VIP</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  + Client
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setManualMode((prev) => !prev)}>
                  {manualMode ? "Masquer manuel" : "Ajouter manuel"}
                </Button>
              </div>
              {manualMode ? (
                <form className="mt-3 grid gap-2 text-[11px]" onSubmit={handleManualAdd}>
                  <label className="flex flex-col gap-1">
                    Produit
                    <select
                      value={manualProductId}
                      onChange={(event) => setManualProductId(event.target.value)}
                      className="rounded-xl border border-strong bg-background px-2 py-1"
                    >
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    Quantité
                    <input
                      type="number"
                      min={1}
                      value={manualQty}
                      onChange={(event) => setManualQty(Math.max(1, Number(event.target.value) || 1))}
                      className="rounded-xl border border-strong bg-background px-2 py-1"
                    />
                  </label>
                  <Button type="submit" size="sm" className="w-full">
                    Ajouter au ticket
                  </Button>
                </form>
              ) : null}
            </div>

            <div className="mt-3 rounded-2xl border border-strong bg-panel-soft p-4">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Navigation paniers
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <button
                  type="button"
                  className="flex h-14 items-center justify-center rounded-2xl border border-strong bg-background text-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  onClick={() => cycleBasket(-1)}
                  disabled={!canNavigateBaskets}
                  aria-label="Panier précédent"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <div />
                <button
                  type="button"
                  className="flex h-14 items-center justify-center rounded-2xl border border-strong bg-background text-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  onClick={() => cycleBasket(-1)}
                  disabled={!canNavigateBaskets}
                  aria-label="Panier précédent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-20 flex-col items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-500 text-xs font-semibold uppercase tracking-wide text-white shadow-inner transition hover:bg-emerald-400"
                  onClick={() => setBasketOverviewOpen(true)}
                >
                  <LayoutGrid className="h-5 w-5" />
                  Voir paniers
                  <span className="text-[9px] opacity-80">{holdCount} en attente</span>
                </button>
                <button
                  type="button"
                  className="flex h-14 items-center justify-center rounded-2xl border border-strong bg-background text-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  onClick={() => cycleBasket(1)}
                  disabled={!canNavigateBaskets}
                  aria-label="Panier suivant"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
                <div />
                <button
                  type="button"
                  className="flex h-14 items-center justify-center rounded-2xl border border-strong bg-background text-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  onClick={() => cycleBasket(1)}
                  disabled={!canNavigateBaskets}
                  aria-label="Panier suivant"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
                <div />
              </div>
            </div>
          </div>
        </aside>
      </div>
      {isBasketOverviewOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-5xl rounded-[2rem] border border-strong bg-panel p-6 text-foreground shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Paniers en attente</p>
                <p className="text-2xl font-semibold">
                  {holdCount} sur {HOLD_SLOT_COUNT}
                </p>
              </div>
              <Button variant="outline" onClick={handleCloseBasketOverview}>
                Fermer
              </Button>
            </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {HOLD_SLOT_KEYS.map((slotKey, slotIndex) => {
                  const entry = holdBasketEntries[slotIndex];
                  if (!entry) {
                    return (
                      <div
                        key={slotKey}
                        className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-strong bg-panel-soft p-6 text-center text-xs text-muted-foreground shadow-inner"
                      >
                        <p>Emplacement libre</p>
                        <p>Ajoutez un panier pour l&apos;occuper.</p>
                    </div>
                  );
                }
                const { basket, index } = entry;
                const basketTotal = basket.items.reduce(
                  (sum, item) => sum + item.price * item.qty - (item.discountValue ?? 0),
                  0,
                );
                const previewItems = basket.items.slice(0, 6);
                return (
                  <button
                    key={`basket-slot-${basket.id}`}
                    type="button"
                    onClick={() => handleResumeBasket(index)}
                    className={`flex min-h-[220px] w-full flex-col rounded-[1.75rem] border border-strong bg-background text-left text-foreground shadow-lg transition hover:shadow-xl focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      index === activeBasketIndex ? "ring-2 ring-emerald-500" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3 rounded-t-[1.75rem] border-b border-strong bg-foreground/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-background">
                      <span className="text-sm">Panier {index + 1}</span>
                      <span>{basket.items.length} article(s)</span>
                      <span className="ml-auto text-sm font-semibold">{formatCurrency(basketTotal)}</span>
                    </div>
                    <div className="flex-1 overflow-hidden rounded-b-[1.75rem]">
                      {previewItems.length ? (
                        <div className="max-h-48 overflow-auto border-t border-strong bg-background">
                          <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-panel text-[10px] uppercase text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">N°</th>
                                <th className="px-3 py-2 text-left font-medium">Désignation</th>
                                <th className="px-3 py-2 text-right font-medium">Prix U</th>
                                <th className="px-3 py-2 text-right font-medium">Qté</th>
                                <th className="px-3 py-2 text-right font-medium">Totale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewItems.map((item, idx) => {
                                const lineTotal = item.price * item.qty - (item.discountValue ?? 0);
                                return (
                                  <tr key={`${basket.id}-${item.id}`} className="border-b border-dashed border-border text-foreground">
                                    <td className="px-3 py-1 font-semibold">{idx + 1}</td>
                                    <td className="px-3 py-1">
                                      <p className="font-semibold">{item.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                                    </td>
                                    <td className="px-3 py-1 text-right">{formatCurrency(item.price)}</td>
                                    <td className="px-3 py-1 text-right">{formatQuantity(item.qty, item.unit)}</td>
                                    <td className="px-3 py-1 text-right font-semibold">{formatCurrency(lineTotal)}</td>
                                  </tr>
                                );
                              })}
                              {basket.items.length > previewItems.length ? (
                                <tr>
                                  <td className="px-3 py-1 text-[10px] text-muted-foreground" colSpan={5}>
                                    +{basket.items.length - previewItems.length} article(s)
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-strong bg-panel-soft p-4 text-muted-foreground">
                          Aucun article dans ce panier.
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {isPricePanelOpen && priceModalItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            className="w-full max-w-lg rounded-[2rem] border border-strong bg-panel text-foreground shadow-[0_30px_60px_rgba(0,0,0,0.45)] p-6"
            onSubmit={handlePricePanelSubmit}
          >
            <div className="flex items-center gap-4">
              {priceModalItem.imageData ? (
                <img
                  src={priceModalItem.imageData}
                  alt={priceModalItem.name}
                  className="h-20 w-20 rounded-2xl border border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-2xl font-semibold">
                  {priceModalItem.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Produit sélectionné</p>
                <p className="text-lg font-semibold">{priceModalItem.name}</p>
                <p className="text-xs text-muted-foreground">{priceModalItem.sku}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex-1 space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Prix unitaire
                  <input
                    ref={priceInputRef}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-strong bg-background px-3 py-2 text-sm text-foreground"
                    value={priceInput}
                    onFocus={() => setPricePanelFocus("price")}
                    onChange={(event) => handlePriceInputChange(event.target.value)}
                    onSelect={handlePriceSelection}
                    onKeyUp={handlePriceSelection}
                    onMouseUp={handlePriceSelection}
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Quantité
                  <input
                    ref={quantityInputRef}
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full rounded-xl border border-strong bg-background px-3 py-2 text-sm text-foreground"
                    value={quantityInput}
                    onFocus={() => setPricePanelFocus("quantity")}
                    onChange={(event) => handleQuantityInputChange(event.target.value)}
                    onSelect={handleQuantitySelection}
                    onKeyUp={handleQuantitySelection}
                    onMouseUp={handleQuantitySelection}
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Total
                  <input
                    ref={totalInputRef}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-strong bg-background px-3 py-2 text-sm text-foreground"
                    value={totalInput}
                    onFocus={() => setPricePanelFocus("total")}
                    onChange={(event) => handleTotalInputChange(event.target.value)}
                    onSelect={handleTotalSelection}
                    onKeyUp={handleTotalSelection}
                    onMouseUp={handleTotalSelection}
                  />
                </label>
              </div>
              <div className="w-full max-w-[220px] space-y-2 rounded-2xl border border-strong bg-background/80 p-4">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Pavé numérique
                </p>
                {keypadRows.map((row) => (
                  <div key={`modal-keypad-${row.join("-")}`} className="grid grid-cols-3 gap-2">
                    {row.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="rounded-xl border border-strong bg-panel-soft py-3 text-sm font-semibold shadow-inner transition hover:bg-panel"
                        onClick={() => handleKeypadInput(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClosePricePanel}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
