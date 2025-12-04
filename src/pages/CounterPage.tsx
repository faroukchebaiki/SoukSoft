import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Barcode,
  Bell,
  Boxes,
  ChevronDown,
  Contact,
  CheckCircle2,
  ClipboardList,
  HandCoins,
  Home,
  LayoutGrid,
  Pause,
  Play,
  Settings,
  Plus,
  Printer,
  RotateCcw,
  Search,
  UserPlus,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import {
  type FormEvent,
  type MutableRefObject,
  type SyntheticEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ReceiptPreview, type ReceiptPreviewItem } from "@/components/receipt/ReceiptPreview";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { printReceipt } from "@/lib/printer";
import type { CartItem, CatalogProduct, CheckoutTotals, ReceiptSettings } from "@/types";

interface CounterPageProps {
  availableProducts: CatalogProduct[];
  initialCartItems?: CartItem[];
  onGoHome?: () => void;
  cashierName?: string;
  receiptSettings: ReceiptSettings;
}

type SelectionRange = { start: number; end: number };

const topTabs = [
  { label: "Favoris", icon: Star },
  { label: "Tous produits", icon: Boxes },
  { label: "Clients", icon: Contact },
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
  clientName: string;
  cashierName: string;
  paymentMethod?: string;
}

interface ClientCard {
  id: string;
  name: string;
  phone: string;
  address?: string;
  sex?: "male" | "female";
  note?: string;
}

function createBasketId() {
  return crypto.randomUUID?.() ?? `basket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyBasket(items: CartItem[] = []): PendingBasket {
  return {
    id: createBasketId(),
    items: items.map((item) => ({
      ...item,
      sellPrice: item.sellPrice ?? item.price,
    })),
  };
}

function calculateTotals(items: CartItem[]): CheckoutTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discounts = items.reduce((sum, item) => sum + (item.discountValue ?? 0), 0);
  const taxable = subtotal - discounts;
  const vat = 0;
  const total = taxable;
  const produceWeight = items
    .filter((item) => item.unit === "kg")
    .reduce((sum, item) => sum + item.qty, 0);
  const pieceCount = items
    .filter((item) => item.unit === "pcs")
    .reduce((sum, item) => sum + item.qty, 0);

  return {
    subtotal,
    discounts,
    vat,
    total,
    lines: items.length,
    produceWeight,
    pieceCount,
  };
}

function formatTicketTotal(value: number) {
  const formatted = new Intl.NumberFormat("en-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} DA`;
}

export function CounterPage({
  availableProducts,
  initialCartItems = [],
  onGoHome,
  cashierName = "FirstLastName",
  receiptSettings,
}: CounterPageProps) {
  const [baskets, setBaskets] = useState<PendingBasket[]>(() => [
    createEmptyBasket(initialCartItems),
  ]);
  const [activeBasketIndex, setActiveBasketIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [historyBaskets, setHistoryBaskets] = useState<BasketHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState("Standard client");
  const [scannerListening, setScannerListening] = useState(true);
  const [scannerInput, setScannerInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [productSort, setProductSort] = useState<"name-asc" | "price-asc" | "price-desc">("name-asc");
  const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isSortMenuOpen, setSortMenuOpen] = useState(false);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientSex, setClientSex] = useState<"male" | "female">("male");
  const [clientPrimaryPhone, setClientPrimaryPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [clientDirectory, setClientDirectory] = useState<ClientCard[]>([
    {
      id: createBasketId(),
      name: "Standard client",
      phone: "0000000000",
      sex: "male",
      note: "Client par défaut",
    },
    {
      id: createBasketId(),
      name: "Amel B.",
      phone: "0550 000 111",
      address: "Centre ville",
      sex: "female",
    },
    {
      id: createBasketId(),
      name: "Karim L.",
      phone: "0661 222 333",
      address: "Bab Ezzouar",
      sex: "male",
    },
  ]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilterSex, setClientFilterSex] = useState<"all" | "male" | "female">("all");
  const [isClientFilterMenuOpen, setClientFilterMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(topTabs[0].label);
  const [isPricePanelOpen, setIsPricePanelOpen] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [totalInput, setTotalInput] = useState("");
  const [pricePanelFocus, setPricePanelFocus] = useState<"price" | "quantity" | "total">("price");
  const [showNavigationKeypad, setShowNavigationKeypad] = useState(false);
  const [priceModalItem, setPriceModalItem] = useState<CartItem | null>(null);
  const [basketNotice, setBasketNotice] = useState<string | null>(null);
  const [isBasketOverviewOpen, setBasketOverviewOpen] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const basketTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const priceSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const quantitySelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const totalSelectionRef = useRef<SelectionRange>({ start: 0, end: 0 });
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const clientFilterMenuRef = useRef<HTMLDivElement>(null);
  const clientFirstNameRef = useRef<HTMLInputElement>(null);
  const clientModalOpenRef = useRef(false);
  const basketsRef = useRef<PendingBasket[]>(baskets);
  useEffect(() => {
    basketsRef.current = baskets;
  }, [baskets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCategoryMenuOpen && categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setCategoryMenuOpen(false);
      }
      if (isSortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
      if (
        isClientFilterMenuOpen &&
        clientFilterMenuRef.current &&
        !clientFilterMenuRef.current.contains(event.target as Node)
      ) {
        setClientFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryMenuOpen, isClientFilterMenuOpen, isSortMenuOpen]);

  useEffect(() => {
    if (isClientModalOpen) {
      requestAnimationFrame(() => {
        clientFirstNameRef.current?.focus();
      });
    } else {
      setClientFormError(null);
    }
  }, [isClientModalOpen]);

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
    const filtered = availableProducts.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const matchesQuery =
        normalized.length === 0 ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        product.barcode?.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (productSort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [availableProducts, activeCategory, productSearch, productSort]);

  const historyEntries = useMemo(() => historyBaskets, [historyBaskets]);

  const totals = useMemo<CheckoutTotals>(() => calculateTotals(basketItems), [basketItems]);

  const activeHistoryEntry = useMemo(
    () => historyBaskets.find((entry) => entry.id === selectedHistoryId) ?? null,
    [historyBaskets, selectedHistoryId],
  );
  const historyTotals = useMemo(
    () => (activeHistoryEntry ? calculateTotals(activeHistoryEntry.items) : null),
    [activeHistoryEntry],
  );
  const displayedDate = activeHistoryEntry
    ? new Date(activeHistoryEntry.createdAt).toLocaleDateString("fr-DZ")
    : new Date().toLocaleDateString("fr-DZ");
  const displayedBasketLabel = activeHistoryEntry
    ? `Panier archivé`
    : `Panier ${activeBasketIndex + 1}/${Math.max(1, baskets.length)}`;
  const displayedItems = activeHistoryEntry ? activeHistoryEntry.items : basketItems;
  const displayedTotals = historyTotals ?? totals;
  const displayedArticles = displayedItems.length;
  const displayedClientName = activeHistoryEntry?.clientName ?? selectedClient ?? "Standard client";
  const displayedCashierName = cashierName || "FirstLastName";
  const displayedTotalValue = useMemo(
    () => formatTicketTotal(displayedTotals.total),
    [displayedTotals.total],
  );
  const isHistoryPreview = activeHistoryEntry !== null;
  const basketPositionLabel = isHistoryPreview ? displayedBasketLabel : "Panier";
  const basketPositionValue = isHistoryPreview ? "" : `${activeBasketIndex + 1}/${Math.max(1, baskets.length)}`;
  const receiptPreviewItems = useMemo<ReceiptPreviewItem[]>(
    () =>
      displayedItems.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.sellPrice ?? item.price,
        discountValue: item.discountValue,
        sku: item.sku,
      })),
    [displayedItems],
  );
  const receiptMeta = useMemo(
    () => ({
      receiptId: activeHistoryEntry?.id ?? activeBasketId,
      cashier: activeHistoryEntry?.cashierName ?? displayedCashierName,
      customer: displayedClientName,
      paymentMethod: "Cash",
      completedAt: activeHistoryEntry
        ? new Date(activeHistoryEntry.createdAt).toLocaleString("fr-DZ")
        : new Date().toLocaleString("fr-DZ"),
    }),
    [activeBasketId, activeHistoryEntry, displayedCashierName, displayedClientName],
  );

  const buildReceiptHtml = useCallback(() => {
    const content = printAreaRef.current?.innerHTML ?? "";
    const inlineStyles = Array.from(document.querySelectorAll("style"))
      .map((style) => style.innerHTML)
      .join("\n");
    const receiptStyles = `
      @page { size: ${receiptSettings.paperWidth ?? 80}mm auto; margin: 4mm; }
      body { margin: 0; padding: 0; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    `;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${inlineStyles}${receiptStyles}</style></head><body>${content}</body></html>`;
  }, [receiptSettings.paperWidth]);

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
        const unitPrice = product.sellPrice ?? product.price;
        return [
          ...items,
          {
            id: product.id,
            barcode: product.barcode ?? product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            qty: quantity,
            price: unitPrice,
            sellPrice: unitPrice,
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
      upsertItem(product, 1);
      setScannerInput("");
      focusScannerInput();
    },
    [availableProducts, scannerInput, scannerListening, upsertItem, focusScannerInput],
  );

  const handleProductCardClick = useCallback(
    (product: CatalogProduct) => {
      upsertItem(product, 1);
    },
    [upsertItem],
  );

  const handleCancelBasket = useCallback(() => {
    if (selectedHistoryId) {
      setSelectedHistoryId(null);
      setSelectedItemId(null);
      focusScannerInput();
      return;
    }
    updateActiveBasketItems(() => []);
    focusScannerInput();
    setSelectedItemId(null);
    setSelectedHistoryId(null);
  }, [focusScannerInput, selectedHistoryId, updateActiveBasketItems]);

  const handleOpenClientModal = useCallback(() => {
    setClientFormError(null);
    setClientModalOpen(true);
  }, []);

  const handleCloseClientModal = useCallback(() => {
    setClientModalOpen(false);
    setClientFormError(null);
  }, []);

  useEffect(() => {
    if (!isClientModalOpen) return;
    clientModalOpenRef.current = true;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        handleCloseClientModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clientModalOpenRef.current = false;
    };
  }, [handleCloseClientModal, isClientModalOpen]);

  const handleClientSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const first = clientFirstName.trim();
      const last = clientLastName.trim();
      const phoneA = clientPrimaryPhone.trim();
      if (!first || !last) {
        setClientFormError("Prénom et nom sont requis.");
        return;
      }
      if (!phoneA) {
        setClientFormError("Ajoutez au moins un numéro de téléphone.");
        return;
      }
      const fullName = `${first} ${last}`.trim();
      setSelectedClient(fullName);
      setClientFormError(null);
      setClientModalOpen(false);
      setClientFirstName("");
      setClientLastName("");
      setClientPrimaryPhone("");
      setClientAddress("");
      setClientNote("");
      setClientSex("male");
      setClientDirectory((prev) => {
        const exists = prev.find((entry) => entry.name.toLowerCase() === fullName.toLowerCase());
        if (exists) return prev;
        return [
          {
            id: createBasketId(),
            name: fullName,
            phone: phoneA,
            address: clientAddress || undefined,
            sex: clientSex,
            note: clientNote || undefined,
          },
          ...prev,
        ];
      });
    },
    [clientFirstName, clientLastName, clientPrimaryPhone, clientAddress, clientSex, clientNote],
  );

  const handleFinishBasket = useCallback(() => {
    if (!basketItems.length || selectedHistoryId) return;
    const snapshotItems = basketItems.map((item) => ({ ...item }));
    const total = calculateTotals(snapshotItems).total;
    const entry: BasketHistoryEntry = {
      id: createBasketId(),
      createdAt: new Date().toISOString(),
      items: snapshotItems,
      total,
      clientName: selectedClient || "Standard client",
      cashierName: cashierName || "FirstLastName",
      paymentMethod: "Cash",
    };
    setHistoryBaskets((prev) => {
      const filtered = selectedHistoryId ? prev.filter((hist) => hist.id !== selectedHistoryId) : prev;
      return [entry, ...filtered];
    });
    setSelectedHistoryId(null);
    updateActiveBasketItems(() => []);
    focusScannerInput();
    setSelectedItemId(null);
  }, [
    basketItems,
    cashierName,
    focusScannerInput,
    selectedClient,
    selectedHistoryId,
    updateActiveBasketItems,
  ]);

  const handleSelectHistoryEntry = useCallback(
    (entry: BasketHistoryEntry) => {
      setSelectedHistoryId(entry.id);
      setSelectedItemId(null);
    },
    [],
  );

  const handlePrintReceipt = useCallback(async () => {
    if (receiptPreviewItems.length === 0) return;
    const html = buildReceiptHtml();
    const preview = receiptSettings.showPrintPreview !== false;
    try {
      await printReceipt(html, {
        preview,
        paperWidth: receiptSettings.paperWidth,
        printerName: receiptSettings.printerName,
      });
    } catch (error) {
      console.error("Print failed", error);
      if (!preview) {
        window.print();
      }
    }
  }, [
    buildReceiptHtml,
    receiptPreviewItems.length,
    receiptSettings.paperWidth,
    receiptSettings.printerName,
    receiptSettings.showPrintPreview,
  ]);

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
        item.id === priceModalItem.id
          ? { ...item, price: nextPrice, sellPrice: nextPrice, qty: nextQty }
          : item,
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

  const handleNavigateHistory = useCallback(
    (direction: 1 | -1) => {
      if (historyEntries.length === 0) return;
      const currentIndex = selectedHistoryId
        ? historyEntries.findIndex((entry) => entry.id === selectedHistoryId)
        : -1;
      const delta = direction === -1 ? 1 : -1;
      let nextIndex = currentIndex + delta;
      if (nextIndex < 0) {
        setSelectedHistoryId(null);
        setSelectedItemId(null);
        focusScannerInput();
        return;
      }
      if (nextIndex >= historyEntries.length) {
        nextIndex = historyEntries.length - 1;
      }
      const nextEntry = historyEntries[nextIndex];
      if (nextEntry) {
        setSelectedHistoryId(nextEntry.id);
        setSelectedItemId(null);
      }
    },
    [focusScannerInput, historyEntries, selectedHistoryId],
  );

  const handleKeypadInput = (key: string) => {
    const applyInput = (
      current: string,
      changeHandler: (value: string) => void,
      inputRef: MutableRefObject<HTMLInputElement | null>,
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
      if (clientModalOpenRef.current) {
        return;
      }
      const key = event.key.toLowerCase();
      switch (key) {
        case "f1":
          event.preventDefault();
          focusScannerInput();
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
        case "arrowleft":
          event.preventDefault();
          handleNavigateHistory(-1);
          break;
        case "arrowright":
          event.preventDefault();
          handleNavigateHistory(1);
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
    handleNavigateHistory,
    handleGoHome,
    isBasketOverviewOpen,
    isPricePanelOpen,
  ]);

  const isBasketEmpty = basketItems.length === 0;
  const holdCount = Math.min(HOLD_SLOT_COUNT, Math.max(0, baskets.length - 1));
  const canNavigateBaskets = baskets.length > 1;
  const canCreateBasket = baskets.length < MAX_BASKETS;
  const basketActionsDisabled = isHistoryPreview || isBasketEmpty;
  const cancelButtonDisabled = isHistoryPreview ? false : isBasketEmpty;
  const canNavigateHistory = historyEntries.length > 0;
  const filteredClients = useMemo(() => {
    const normalized = clientSearch.trim().toLowerCase();
    return clientDirectory.filter((client) => {
      const matchesSex = clientFilterSex === "all" || client.sex === clientFilterSex;
      const matchesQuery =
        normalized.length === 0 ||
        client.name.toLowerCase().includes(normalized) ||
        client.phone.toLowerCase().includes(normalized) ||
        (client.address?.toLowerCase().includes(normalized) ?? false);
      return matchesSex && matchesQuery;
    });
  }, [clientDirectory, clientFilterSex, clientSearch]);

  return (
    <div className="page-shell flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="print-area" ref={printAreaRef}>
        <ReceiptPreview
          settings={receiptSettings}
          items={receiptPreviewItems}
          receiptId={receiptMeta.receiptId}
          cashier={receiptMeta.cashier}
          customer={receiptMeta.customer}
          paymentMethod={receiptMeta.paymentMethod}
          completedAt={receiptMeta.completedAt}
        />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 md:p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex-shrink-0 rounded-2xl border border-strong bg-panel p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                className="rounded-2xl border-strong bg-panel-soft px-3 py-2 hover:border-emerald-500"
                aria-label="Ouvrir les réglages"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-2xl border-strong bg-panel-soft px-4 py-2 text-sm font-semibold hover:border-emerald-500"
                onClick={handleOpenClientModal}
              >
                <UserPlus className="h-4 w-4" />
                Ajouter un client
              </Button>
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
              <form
                className="ml-auto flex flex-wrap items-center gap-2 text-muted-foreground"
                onSubmit={handleScanSubmit}
              >
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500 bg-background px-3 py-1 text-sm shadow-inner">
                  <Barcode className="h-4 w-4 text-emerald-500" />
                  <input
                    ref={scannerInputRef}
                    className="w-48 bg-transparent text-sm outline-none"
                    placeholder="Scannez un code-barres ici"
                    value={scannerInput}
                    onChange={(event) => setScannerInput(event.target.value)}
                    disabled={!scannerListening}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={() => setScannerListening((prev) => !prev)}
                  aria-label={scannerListening ? "Mettre en pause le scanner" : "Relancer le scanner"}
                >
                  {scannerListening ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            {activeTab === "Tous produits" ? (
              <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-strong bg-panel p-4 shadow-inner">
                <div className="-mx-4 -mt-4 flex flex-wrap items-center gap-3 border-b border-strong bg-panel px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground sticky top-0 z-10">
                  <span className="text-muted-foreground">Tous les produits</span>
                  <span className="rounded-xl border border-strong bg-panel-soft px-3 py-1 text-[10px] font-semibold text-foreground">
                    {filteredProducts.length} / {availableProducts.length} article(s)
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2 text-xs font-normal normal-case tracking-normal">
                    <div className="flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-2 text-sm text-muted-foreground">
                      <Search className="h-4 w-4" />
                      <input
                        className="w-52 bg-transparent text-sm outline-none"
                        placeholder="Rechercher par nom, SKU ou code-barres"
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                      />
                    </div>
                    <div ref={categoryMenuRef} className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-2 pr-9 text-sm font-semibold text-foreground shadow-inner transition hover:border-emerald-500"
                        onClick={() => setCategoryMenuOpen((prev) => !prev)}
                      >
                        {activeCategory === "all" ? "Toutes les catégories" : activeCategory}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {isCategoryMenuOpen ? (
                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-strong bg-panel-soft p-1 shadow-2xl">
                          {categories.map((category) => {
                            const isActive = activeCategory === category;
                            return (
                              <button
                                key={category}
                                type="button"
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                                  isActive
                                    ? "bg-emerald-500/15 text-foreground"
                                    : "text-muted-foreground hover:bg-background"
                                }`}
                                onClick={() => {
                                  setActiveCategory(category);
                                  setCategoryMenuOpen(false);
                                }}
                              >
                                <span>{category === "all" ? "Toutes les catégories" : category}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <div ref={sortMenuRef} className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-2 pr-9 text-sm font-semibold text-foreground shadow-inner transition hover:border-emerald-500"
                        onClick={() => setSortMenuOpen((prev) => !prev)}
                      >
                        {productSort === "name-asc"
                          ? "Nom A → Z"
                          : productSort === "price-asc"
                            ? "Prix croissant"
                            : "Prix décroissant"}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {isSortMenuOpen ? (
                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-strong bg-panel-soft p-1 shadow-2xl">
                          {[
                            { value: "name-asc", label: "Nom A → Z" },
                            { value: "price-asc", label: "Prix croissant" },
                            { value: "price-desc", label: "Prix décroissant" },
                          ].map((option) => {
                            const isActive = productSort === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                                  isActive
                                    ? "bg-emerald-500/15 text-foreground"
                                    : "text-muted-foreground hover:bg-background"
                                }`}
                                onClick={() => {
                                  setProductSort(option.value as typeof productSort);
                                  setSortMenuOpen(false);
                                }}
                              >
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex-1 overflow-auto">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        Aucun produit disponible.
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : activeTab === "Clients" ? (
              <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-strong bg-panel p-4 shadow-inner">
                <div className="-mx-4 -mt-4 flex flex-wrap items-center gap-3 border-b border-strong bg-panel px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground sticky top-0 z-10">
                  <span className="text-muted-foreground">Clients</span>
                  <span className="rounded-xl border border-strong bg-panel-soft px-3 py-1 text-[10px] font-semibold text-foreground">
                    {filteredClients.length} / {clientDirectory.length} client(s)
                  </span>
                    <div className="ml-auto flex flex-wrap items-center gap-2 text-xs font-normal normal-case tracking-normal">
                      <div className="flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-2 text-sm text-muted-foreground">
                        <Search className="h-4 w-4" />
                        <input
                          className="w-48 bg-transparent text-sm outline-none"
                        placeholder="Rechercher un client"
                        value={clientSearch}
                        onChange={(event) => setClientSearch(event.target.value)}
                      />
                    </div>
                    <div ref={clientFilterMenuRef} className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-2xl border border-strong bg-background px-3 py-2 pr-9 text-sm font-semibold text-foreground shadow-inner transition hover:border-emerald-500"
                        onClick={() => setClientFilterMenuOpen((prev) => !prev)}
                      >
                        {clientFilterSex === "all"
                          ? "Tous"
                          : clientFilterSex === "male"
                            ? "Homme"
                            : "Femme"}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {isClientFilterMenuOpen ? (
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-strong bg-panel-soft p-1 shadow-2xl">
                          {[
                            { value: "all", label: "Tous" },
                            { value: "male", label: "Homme" },
                            { value: "female", label: "Femme" },
                          ].map((option) => {
                            const isActive = clientFilterSex === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                                  isActive
                                    ? "bg-emerald-500/15 text-foreground"
                                    : "text-muted-foreground hover:bg-background"
                                }`}
                                onClick={() => {
                                  setClientFilterSex(option.value as typeof clientFilterSex);
                                  setClientFilterMenuOpen(false);
                                }}
                              >
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex-1 overflow-auto">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex h-40 flex-col rounded-2xl border border-strong bg-background p-3 text-left text-xs shadow hover:border-emerald-500 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{client.name}</p>
                          <span className="rounded-full bg-panel-soft px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                            {client.sex === "female" ? "Femme" : "Homme"}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <p className="text-sm font-semibold text-emerald-600">{client.phone}</p>
                          {client.address ? <p className="text-xs">{client.address}</p> : null}
                          {client.note ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{client.note}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {filteredClients.length === 0 ? (
                      <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-strong text-xs text-muted-foreground">
                        Aucun client trouvé.
                      </div>
                    ) : null}
                  </div>
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
                    (() => {
                      let lastDayLabel: string | null = null;
                      return historyEntries.map((entry, index) => {
                      const entryDate = new Date(entry.createdAt);
                      const isSelected = entry.id === selectedHistoryId;
                      const clientLabel = entry.clientName || "Standard client";
                      const dayLabel = entryDate.toLocaleDateString("fr-DZ");
                      const timeLabel = entryDate.toLocaleTimeString("fr-DZ", { hour12: false });
                        const showDateDivider = dayLabel !== lastDayLabel;
                        lastDayLabel = dayLabel;
                        return (
                          <Fragment key={entry.id}>
                            {showDateDivider ? (
                              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                                <div className="h-px flex-1 bg-strong" />
                                <span className="text-[11px] font-semibold text-foreground">{dayLabel}</span>
                                <div className="h-px flex-1 bg-strong" />
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleSelectHistoryEntry(entry)}
                              className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left text-[11px] transition ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                                  : "border-strong bg-background text-muted-foreground hover:border-emerald-500 hover:text-foreground"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
                                <span>Panier {historyEntries.length - index}</span>
                                <span>Articles : {entry.items.length}</span>
                                <span>Client : {clientLabel}</span>
                                <span className="ml-auto text-foreground">{timeLabel}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-start text-sm">
                                <span className="text-2xl font-bold text-foreground">{formatCurrency(entry.total)}</span>
                              </div>
                            </button>
                          </Fragment>
                        );
                      });
                    })()
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
              disabled={cancelButtonDisabled}
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
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider opacity-80">
                <span className="font-semibold text-foreground">Caissier : {displayedCashierName}</span>
                <span className="ml-auto">Date : {displayedDate}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider opacity-80">
                <span>
                  Articles : <span className="font-semibold text-foreground">{displayedArticles}</span>
                </span>
                <span>
                  {basketPositionLabel}
                  {basketPositionValue ? (
                    <>
                      {" "}
                      <span className="font-semibold text-foreground">{basketPositionValue}</span>
                    </>
                  ) : null}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <span>Client : {displayedClientName}</span>
                </div>
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

            <div className="mt-3 rounded-2xl border border-strong bg-panel-soft p-4 min-h-[200px]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Navigation paniers
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                  onClick={() => setShowNavigationKeypad((current) => !current)}
                >
                  {showNavigationKeypad ? "Afficher navigation" : "Pavé numérique"}
                </Button>
              </div>
              {showNavigationKeypad ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {keypadRows.map((row) => (
                      <div key={`nav-keypad-${row.join("-")}`} className="grid grid-cols-3 gap-2">
                        {row.map((key) => (
                          <button
                            key={key}
                            type="button"
                            className="h-10 rounded-xl border border-strong bg-panel-soft text-xs font-semibold shadow-inner transition hover:bg-panel"
                            onClick={() => handleKeypadInput(key)}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
                    onClick={() => handleNavigateHistory(-1)}
                    disabled={!canNavigateHistory}
                    aria-label="Panier validé précédent"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="flex h-14 flex-col items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-500 text-xs font-semibold uppercase tracking-wide text-white shadow-inner transition hover:bg-emerald-400"
                    onClick={() => setBasketOverviewOpen(true)}
                  >
                    <LayoutGrid className="h-5 w-5" />
                    Voir paniers
                    <span className="text-[9px] opacity-80">{holdCount} en attente</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-14 items-center justify-center rounded-2xl border border-strong bg-background text-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                    onClick={() => handleNavigateHistory(1)}
                    disabled={!canNavigateHistory}
                    aria-label="Panier validé suivant"
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
              )}
            </div>
          </div>
        </aside>
      </div>
      {isClientModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            className="w-full max-w-lg rounded-[1.75rem] border border-strong bg-panel p-6 text-foreground shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            onSubmit={handleClientSubmit}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                handleCloseClientModal();
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Nouveau client</p>
                <p className="text-lg font-semibold">Ajouter un client</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCloseClientModal} type="button">
                Fermer
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Nom *
                  <input
                    ref={clientFirstNameRef}
                    className="rounded-xl border border-strong bg-background px-3 py-2 text-sm"
                    value={clientLastName}
                    onChange={(event) => setClientLastName(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Prénom *
                  <input
                    className="rounded-xl border border-strong bg-background px-3 py-2 text-sm"
                    value={clientFirstName}
                    onChange={(event) => setClientFirstName(event.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Sexe
                  <div className="relative">
                    <select
                      className="appearance-none w-full rounded-xl border border-strong bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-inner focus:border-emerald-500 focus:outline-none"
                      value={clientSex}
                      onChange={(event) => setClientSex(event.target.value as typeof clientSex)}
                    >
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Téléphone *
                  <input
                    className="rounded-xl border border-strong bg-background px-3 py-2 text-sm"
                    value={clientPrimaryPhone}
                    onChange={(event) => setClientPrimaryPhone(event.target.value)}
                    type="tel"
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Adresse (optionnel)
                <input
                  className="rounded-xl border border-strong bg-background px-3 py-2 text-sm"
                  value={clientAddress}
                  onChange={(event) => setClientAddress(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Note
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-strong bg-background px-3 py-2 text-sm"
                  value={clientNote}
                  onChange={(event) => setClientNote(event.target.value)}
                />
              </label>
            </div>
            {clientFormError ? (
              <p className="mt-3 text-sm font-semibold text-red-500">{clientFormError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={handleCloseClientModal}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </div>
      ) : null}
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
