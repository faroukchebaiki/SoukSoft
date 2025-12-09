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
  Edit3,
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
import { createPortal } from "react-dom";

import { ReceiptPreview, type ReceiptPreviewItem } from "@/components/receipt/ReceiptPreview";
import { Button } from "@/components/ui/button";
import { FAVORITE_CATEGORIES_KEY, FAVORITE_PRODUCTS_KEY } from "@/constants/storageKeys";
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

type FavoriteCategory = { id: string; label: string; color: string };

const defaultFavoriteCategories: FavoriteCategory[] = [
  { id: "fav-1", label: "مشروبات", color: "#f59e0b" },
  { id: "fav-2", label: "FAV2", color: "#059669" },
  { id: "fav-3", label: "FAV3", color: "#0284c7" },
  { id: "fav-4", label: "FAV4", color: "#7f1d1d" },
  { id: "fav-5", label: "FAV5", color: "#ef4444" },
  { id: "fav-6", label: "FAV6", color: "#6b7280" },
  { id: "fav-7", label: "FAV7", color: "#65a30d" },
  { id: "fav-8", label: "FAV8", color: "#0e7490" },
  { id: "fav-9", label: "FAV9", color: "#6d28d9" },
  { id: "fav-10", label: "FAV10", color: "#ea580c" },
  { id: "fav-11", label: "FAV11", color: "#312e81" },
  { id: "fav-12", label: "FAV12", color: "#e5e7eb" },
  { id: "fav-13", label: "FAV13", color: "#e5e7eb" },
  { id: "fav-14", label: "FAV14", color: "#e5e7eb" },
  { id: "fav-15", label: "FAV15", color: "#e5e7eb" },
];
const FAVORITES_ALL_CATEGORY = "All favorites";
type FavoriteAssignments = Record<string, string[]>;

function pickReadableTextColor(backgroundColor?: string) {
  if (!backgroundColor || backgroundColor.startsWith("var(")) return "var(--foreground)";
  const hexMatch = backgroundColor.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!hexMatch) return "var(--foreground)";
  const raw = hexMatch[1];
  const normalized =
    raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

function readFavoriteCategories(): FavoriteCategory[] {
  if (typeof window === "undefined") return defaultFavoriteCategories;
  try {
    const raw = window.localStorage.getItem(FAVORITE_CATEGORIES_KEY);
    if (!raw) return defaultFavoriteCategories;
    const parsed = JSON.parse(raw) as FavoriteCategory[];
    if (!Array.isArray(parsed)) return defaultFavoriteCategories;
    const valid = parsed.filter((cat) => cat?.id && cat?.label && cat?.color);
    if (!valid.length) return defaultFavoriteCategories;
    return valid;
  } catch {
    return defaultFavoriteCategories;
  }
}

function readFavoriteAssignments(categoryIds: string[]): FavoriteAssignments {
  if (typeof window === "undefined") {
    return Object.fromEntries(categoryIds.map((id) => [id, []]));
  }
  try {
    const raw = window.localStorage.getItem(FAVORITE_PRODUCTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<FavoriteAssignments>) : {};
    const base: FavoriteAssignments = {};
    categoryIds.forEach((id) => {
      const list = parsed?.[id];
      base[id] = Array.isArray(list) ? list.filter((val): val is string => typeof val === "string") : [];
    });
    return base;
  } catch {
    return Object.fromEntries(categoryIds.map((id) => [id, []]));
  }
}

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
  clientId?: string;
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
  const [scannerListening, setScannerListening] = useState(true);
  const [scannerInput, setScannerInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [productSort, setProductSort] = useState<"name-asc" | "price-asc" | "price-desc">("name-asc");
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>(() => readFavoriteCategories());
  const [favoriteAssignments, setFavoriteAssignments] = useState<FavoriteAssignments>(() =>
    readFavoriteAssignments(readFavoriteCategories().map((cat) => cat.id)),
  );
  const [activeFavoriteCategory, setActiveFavoriteCategory] = useState<string>(FAVORITES_ALL_CATEGORY);
  const [favoriteMenuOpenId, setFavoriteMenuOpenId] = useState<string | null>(null);
  const [favoriteMenuStyle, setFavoriteMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [bulkFavoritesMenuOpen, setBulkFavoritesMenuOpen] = useState(false);
  const [bulkFavoritesMenuStyle, setBulkFavoritesMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [isManagingFavorites, setIsManagingFavorites] = useState(false);
  const [newFavoriteName, setNewFavoriteName] = useState("");
  const [newFavoriteColor, setNewFavoriteColor] = useState<string>("");
  const [renameFavoriteId, setRenameFavoriteId] = useState<string | null>(null);
  const [renameDraftName, setRenameDraftName] = useState("");
  const [deleteFavoriteId, setDeleteFavoriteId] = useState<string | null>(null);
  const [showBasketNavigation, setShowBasketNavigation] = useState(true);
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
  const initialClientsRef = useRef<ClientCard[] | null>(null);
  if (!initialClientsRef.current) {
    initialClientsRef.current = [
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
    ];
  }
  const defaultClientId = initialClientsRef.current[0].id;
  const [clientDirectory, setClientDirectory] = useState<ClientCard[]>(() => initialClientsRef.current ?? []);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => defaultClientId);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tabVisibility, setTabVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(topTabs.map((tab) => [tab.label, true])),
  );
  const [actionVisibility, setActionVisibility] = useState({
    showPrice: true,
    showQuantity: true,
    showValidate: true,
    showPrint: true,
    mergeValidateAndPrint: false,
  });
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const basketTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);
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

  const resetClientForm = useCallback(() => {
    setClientFormError(null);
    setClientFirstName("");
    setClientLastName("");
    setClientPrimaryPhone("");
    setClientAddress("");
    setClientNote("");
    setClientSex("male");
    setEditingClientId(null);
  }, []);

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

  const favoriteProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const category of favoriteCategories) {
      for (const id of favoriteAssignments[category.id] ?? []) {
        ids.add(id);
      }
    }
    return ids;
  }, [favoriteAssignments, favoriteCategories]);

  const favoriteCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { [FAVORITES_ALL_CATEGORY]: 0 };
    favoriteCategories.forEach((category) => {
      const list = (favoriteAssignments[category.id] ?? []).filter((id) => favoriteProductIds.has(id));
      counts[category.id] = list.length;
      counts[FAVORITES_ALL_CATEGORY] += list.length;
    });
    counts[FAVORITES_ALL_CATEGORY] = favoriteProductIds.size;
    return counts;
  }, [favoriteAssignments, favoriteCategories, favoriteProductIds]);

  const favoritesForActiveCategory = useMemo(() => {
    if (activeFavoriteCategory === FAVORITES_ALL_CATEGORY) {
      return availableProducts.filter((product) => favoriteProductIds.has(product.id));
    }
    const ids = new Set(favoriteAssignments[activeFavoriteCategory] ?? []);
    return availableProducts.filter((product) => ids.has(product.id));
  }, [activeFavoriteCategory, availableProducts, favoriteAssignments, favoriteProductIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITE_PRODUCTS_KEY, JSON.stringify(favoriteAssignments));
  }, [favoriteAssignments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITE_CATEGORIES_KEY, JSON.stringify(favoriteCategories));
  }, [favoriteCategories]);

  useEffect(() => {
    setFavoriteAssignments((prev) => {
      const next: FavoriteAssignments = {};
      favoriteCategories.forEach((category) => {
        next[category.id] = prev[category.id] ?? [];
      });
      return next;
    });
  }, [favoriteCategories]);

  const favoritesSeededRef = useRef(false);
  useEffect(() => {
    if (favoritesSeededRef.current) return;
    if (!favoriteCategories.length || !availableProducts.length) return;
    const hasExisting = Object.values(favoriteAssignments ?? {}).some((list) => list && list.length > 0);
    if (hasExisting) {
      favoritesSeededRef.current = true;
      return;
    }
    const sampleProducts = availableProducts.slice(0, 30).map((product) => product.id);
    const seeded: FavoriteAssignments = {};
    favoriteCategories.forEach((category) => {
      seeded[category.id] = [];
    });
    sampleProducts.forEach((id, index) => {
      const category = favoriteCategories[index % favoriteCategories.length];
      if (category) {
        seeded[category.id].push(id);
      }
    });
    setFavoriteAssignments(seeded);
    favoritesSeededRef.current = true;
  }, [availableProducts, favoriteAssignments, favoriteCategories]);

  useEffect(() => {
    if (
      activeFavoriteCategory !== FAVORITES_ALL_CATEGORY &&
      !favoriteCategories.some((category) => category.id === activeFavoriteCategory)
    ) {
      setActiveFavoriteCategory(FAVORITES_ALL_CATEGORY);
    }
  }, [activeFavoriteCategory, favoriteCategories]);

  useEffect(() => {
    if (!favoriteMenuOpenId) return;
    const handleClose = () => setFavoriteMenuOpenId(null);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [favoriteMenuOpenId]);

  useEffect(() => {
    if (!bulkFavoritesMenuOpen) return;
    const handleClose = () => setBulkFavoritesMenuOpen(false);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [bulkFavoritesMenuOpen]);

  const toggleFavorite = useCallback(
    (productId: string, categoryId: string) => {
      if (!favoriteCategories.some((cat) => cat.id === categoryId)) return;
      setFavoriteAssignments((prev) => {
        const current = prev[categoryId] ?? [];
        const exists = current.includes(productId);
        const nextCategoryItems = exists ? current.filter((id) => id !== productId) : [...current, productId];
        return { ...prev, [categoryId]: nextCategoryItems };
      });
    },
    [favoriteCategories],
  );

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedProductIds(new Set()), []);

  const handleBulkAddToFavorite = useCallback(
    (categoryId: string) => {
      if (!favoriteCategories.some((cat) => cat.id === categoryId) || selectedProductIds.size === 0) return;
      setFavoriteAssignments((prev) => {
        const existing = prev[categoryId] ?? [];
        const merged = new Set(existing);
        for (const id of selectedProductIds) {
          merged.add(id);
        }
        return { ...prev, [categoryId]: Array.from(merged) };
      });
      clearSelection();
    },
    [clearSelection, favoriteCategories, selectedProductIds],
  );

  const handleAddFavoriteCategory = useCallback(() => {
    const trimmed = newFavoriteName.trim();
    const label = trimmed || `Favori ${favoriteCategories.length + 1}`;
    const id = crypto.randomUUID?.() ?? `fav-${Date.now()}`;
    const color = newFavoriteColor || "";
    setFavoriteCategories((prev) => [...prev, { id, label, color }]);
    setFavoriteAssignments((prev) => ({ ...prev, [id]: [] }));
    setNewFavoriteName("");
  }, [favoriteCategories.length, newFavoriteColor, newFavoriteName]);

  const handleDeleteFavoriteCategory = useCallback((categoryId: string) => {
    setDeleteFavoriteId(categoryId);
  }, []);

  const confirmDeleteFavoriteCategory = useCallback(() => {
    if (!deleteFavoriteId) return;
    setFavoriteCategories((prev) => prev.filter((category) => category.id !== deleteFavoriteId));
    setFavoriteAssignments((prev) => {
      const next = { ...prev };
      delete next[deleteFavoriteId];
      return next;
    });
    if (activeFavoriteCategory === deleteFavoriteId) {
      setActiveFavoriteCategory(FAVORITES_ALL_CATEGORY);
    }
    setDeleteFavoriteId(null);
  }, [activeFavoriteCategory, deleteFavoriteId]);

  const handleRenameFavoriteCategory = useCallback(
    (categoryId: string) => {
      const target = favoriteCategories.find((category) => category.id === categoryId);
      if (!target) return;
      setRenameFavoriteId(categoryId);
      setRenameDraftName(target.label);
    },
    [favoriteCategories],
  );

  const confirmRenameFavoriteCategory = useCallback(() => {
    if (!renameFavoriteId) return;
    const label = renameDraftName.trim();
    if (!label) return;
    setFavoriteCategories((prev) =>
      prev.map((category) => (category.id === renameFavoriteId ? { ...category, label } : category)),
    );
    setRenameFavoriteId(null);
    setRenameDraftName("");
  }, [renameDraftName, renameFavoriteId]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(availableProducts.map((product) => product.category)));
    return ["all", ...unique];
  }, [availableProducts]);

  const filteredProducts = useMemo(() => {
    const isFavoritesTab = activeTab === "Favoris";
    const baseProducts = isFavoritesTab ? favoritesForActiveCategory : availableProducts;
    const normalized = productSearch.trim().toLowerCase();
    const filtered = baseProducts.filter((product) => {
      const matchesCategory =
        isFavoritesTab || activeCategory === "all" || product.category === activeCategory;
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
  }, [activeTab, availableProducts, favoritesForActiveCategory, activeCategory, productSearch, productSort]);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      for (const product of filteredProducts) {
        next.add(product.id);
      }
      return next;
    });
  }, [filteredProducts]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear selection whenever tab changes.
  useEffect(() => {
    clearSelection();
  }, [activeTab]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ensure selection resets when switching favorite category view.
  useEffect(() => {
    if (activeTab === "Favoris") {
      clearSelection();
    }
  }, [activeFavoriteCategory, activeTab]);

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
  const visibleTabs = useMemo(() => {
    const filtered = topTabs.filter((tab) => tabVisibility[tab.label] !== false);
    return filtered.length ? filtered : [topTabs[0]];
  }, [tabVisibility]);
  const selectedClientEntry = useMemo(
    () => clientDirectory.find((client) => client.id === selectedClientId) ?? clientDirectory[0] ?? null,
    [clientDirectory, selectedClientId],
  );
  const selectedClientName = selectedClientEntry?.name ?? "Standard client";
  const clientHistoryEntries = useMemo(() => {
    if (!selectedClientEntry) return [];
    const nameLower = selectedClientEntry.name.toLowerCase();
    return historyBaskets.filter(
      (entry) =>
        (entry.clientId && entry.clientId === selectedClientEntry.id) ||
        entry.clientName.toLowerCase() === nameLower,
    );
  }, [historyBaskets, selectedClientEntry]);

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.label === activeTab)) return;
    setActiveTab(visibleTabs[0]?.label ?? topTabs[0].label);
  }, [activeTab, visibleTabs]);
  const displayedDate = activeHistoryEntry
    ? new Date(activeHistoryEntry.createdAt).toLocaleDateString("fr-DZ")
    : new Date().toLocaleDateString("fr-DZ");
  const displayedBasketLabel = activeHistoryEntry
    ? `Panier archivé`
    : `Panier ${activeBasketIndex + 1}/${Math.max(1, baskets.length)}`;
  const displayedItems = activeHistoryEntry ? activeHistoryEntry.items : basketItems;
  const displayedTotals = historyTotals ?? totals;
  const displayedArticles = displayedItems.length;
  const displayedClientName = activeHistoryEntry?.clientName ?? selectedClientName;
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

  const renderProductCard = (product: CatalogProduct) => {
    const isFavorited = favoriteProductIds.has(product.id);
    const isSelected = selectedProductIds.has(product.id);
    const favoriteTags = favoriteCategories.filter((category) =>
      (favoriteAssignments[category.id] ?? []).includes(product.id),
    );

    return (
      <button
        key={product.id}
        type="button"
        className={`relative flex h-60 w-full flex-col rounded-2xl border bg-background p-4 text-left text-xs shadow transition hover:border-strong hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          isSelected ? "border-emerald-500 ring-1 ring-emerald-200" : "border-strong"
        }`}
        onClick={() => handleProductCardClick(product)}
      >
        <div className="absolute left-2 top-2">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded border border-strong bg-background shadow-sm transition hover:border-emerald-500"
            onClick={(event) => {
              event.stopPropagation();
              toggleProductSelection(product.id);
            }}
          >
            <div className={`h-3 w-3 rounded-sm ${isSelected ? "bg-emerald-500" : "bg-transparent"}`} />
          </button>
        </div>
        <div className="mb-3 h-24 w-full rounded-xl border border-dashed border-strong bg-panel-soft text-[11px] uppercase text-muted-foreground">
          <div className="flex h-full items-center justify-center">Illustration</div>
        </div>
        <div className="flex flex-1 flex-col space-y-1 text-muted-foreground">
          <p
            className="text-sm font-semibold text-foreground"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            title={product.name}
          >
            {product.name}
          </p>
          <p className="text-xs text-muted-foreground">{product.sku}</p>
          <p className="text-[13px] font-semibold text-emerald-600">{formatCurrency(product.price)}</p>
          {favoriteTags.length ? (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {favoriteTags.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center rounded-full border px-2 py-[3px] font-semibold shadow-sm"
                  style={{
                    backgroundColor: category.color,
                    borderColor: category.color,
                    color: pickReadableTextColor(category.color),
                  }}
                >
                  {category.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-auto flex items-center justify-end">
            <div className="group relative">
              <button
                type="button"
                className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
                  isFavorited
                    ? "border-amber-400 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-100"
                    : "border-strong bg-panel-soft text-muted-foreground hover:border-emerald-500 hover:text-emerald-600"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  setFavoriteMenuOpenId((previous) => (previous === product.id ? null : product.id));
                  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                  const viewportHeight = window.innerHeight;
                  const spaceBelow = viewportHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const availableBelow = spaceBelow - 20;
                  const availableAbove = spaceAbove - 20;
                  let placement: "top" | "bottom" = availableBelow >= availableAbove ? "bottom" : "top";
                  let available = placement === "bottom" ? availableBelow : availableAbove;
                  if (available < 140 && availableBelow > available) {
                    placement = "bottom";
                    available = availableBelow;
                  } else if (available < 140 && availableAbove > available) {
                    placement = "top";
                    available = availableAbove;
                  }
                  const maxHeight = Math.max(140, Math.min(320, available));
                  const width = 224;
                  const left = Math.min(
                    Math.max(rect.left + window.scrollX - 8, 8),
                    window.innerWidth - width - 8,
                  );
                  const top =
                    placement === "bottom"
                      ? rect.bottom + 6 + window.scrollY
                      : rect.top - maxHeight - 6 + window.scrollY;
                  setFavoriteMenuStyle({ top, left, width, maxHeight });
                }}
                aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              </button>
              <span className="pointer-events-none absolute right-full top-1/2 mr-2 w-max -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background opacity-0 shadow-sm transition group-hover:opacity-100">
                {isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
              </span>
              {favoriteMenuOpenId === product.id && favoriteMenuStyle
                ? createPortal(
                    <div
                      role="menu"
                      tabIndex={-1}
                      className="fixed z-40 w-56 overflow-auto rounded-xl border border-border bg-card text-sm shadow-2xl backdrop-blur-md"
                      style={{
                        top: favoriteMenuStyle.top,
                        left: favoriteMenuStyle.left,
                        maxHeight: favoriteMenuStyle.maxHeight,
                      }}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.stopPropagation();
                          setFavoriteMenuOpenId(null);
                        }
                      }}
                    >
                      {favoriteCategories.map((category) => {
                        const selected = (favoriteAssignments[category.id] ?? []).includes(product.id);
                        return (
                          <button
                            key={category.id}
                            type="button"
                            className={`flex w-full items-center justify-between px-3 py-2 text-left transition ${
                              selected
                                ? "bg-emerald-500/10 text-foreground"
                                : "text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              toggleFavorite(product.id, category.id);
                              setFavoriteMenuOpenId(null);
                            }}
                          >
                            <span>{category.label}</span>
                            {selected ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                          </button>
                        );
                      })}
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </div>
        </div>
      </button>
    );
  };

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
    resetClientForm();
    setClientModalOpen(true);
  }, [resetClientForm]);

  const handleCloseClientModal = useCallback(() => {
    setClientModalOpen(false);
    resetClientForm();
  }, [resetClientForm]);

  const toggleTab = (label: string) => {
    setTabVisibility((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      const enabled = Object.values(next).some(Boolean);
      if (!enabled) {
        next[label] = true;
      }
      return next;
    });
  };

  const toggleAction = (key: keyof typeof actionVisibility) => {
    setActionVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "mergeValidateAndPrint" && !next.mergeValidateAndPrint) {
        return next;
      }
      return next;
    });
  };

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
      const clientPayload: ClientCard = {
        id: editingClientId ?? createBasketId(),
        name: fullName,
        phone: phoneA,
        address: clientAddress || undefined,
        sex: clientSex,
        note: clientNote || undefined,
      };
      setClientDirectory((prev) => {
        if (editingClientId) {
          return prev.map((client) => (client.id === editingClientId ? clientPayload : client));
        }
        return [clientPayload, ...prev];
      });
      setSelectedClientId(clientPayload.id);
      setClientFormError(null);
      setClientModalOpen(false);
      resetClientForm();
    },
    [
      clientAddress,
      clientFirstName,
      clientLastName,
      clientNote,
      clientPrimaryPhone,
      clientSex,
      editingClientId,
      resetClientForm,
    ],
  );

  const handleSelectClient = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  const handleEditClient = useCallback(
    (client: ClientCard) => {
      const [first, ...rest] = client.name.split(" ");
      setEditingClientId(client.id);
      setClientFirstName(first ?? "");
      setClientLastName(rest.join(" ").trim());
      setClientPrimaryPhone(client.phone ?? "");
      setClientAddress(client.address ?? "");
      setClientNote(client.note ?? "");
      setClientSex(client.sex ?? "male");
      setClientFormError(null);
      setClientModalOpen(true);
    },
    [],
  );

  const handleDeleteClient = useCallback(
    (clientId: string) => {
      if (clientId === defaultClientId) return;
      const confirmed = window.confirm("Supprimer ce client ? Cette action est définitive.");
      if (!confirmed) return;
      setClientDirectory((prev) => {
        const next = prev.filter((client) => client.id !== clientId);
        if (!next.length) return prev;
        if (clientId === selectedClientId) {
          setSelectedClientId(next[0].id);
        }
        return next;
      });
    },
    [defaultClientId, selectedClientId],
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
      clientId: selectedClientEntry?.id,
      clientName: selectedClientName,
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
    selectedClientEntry?.id,
    selectedClientName,
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

  const handleValidateAndPrint = useCallback(() => {
    if (receiptPreviewItems.length === 0) return;
    handlePrintReceipt();
    handleFinishBasket();
  }, [handleFinishBasket, handlePrintReceipt, receiptPreviewItems.length]);

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
  const isEditingClient = Boolean(editingClientId);
  const { showPrice, showQuantity, showValidate, showPrint, mergeValidateAndPrint } = actionVisibility;
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
                  onClick={() => setIsSettingsOpen(true)}
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
              {visibleTabs.map((tab) => {
                const Icon = tab.icon ?? Bell;
                const isActive = activeTab === tab.label;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.label);
                      if (tab.label === "Clients") {
                        requestAnimationFrame(() => clientSearchInputRef.current?.focus());
                      }
                    }}
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
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-strong bg-panel-soft px-3 py-2 text-xs">
                  <span className="rounded-full bg-background px-3 py-1 font-semibold text-foreground">
                    Sélection : {selectedProductIds.size}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3"
                    disabled={filteredProducts.length === 0}
                    onClick={handleSelectAllFiltered}
                  >
                    Tout sélectionner (vue)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full px-3"
                    disabled={selectedProductIds.size === 0}
                    onClick={clearSelection}
                  >
                    Effacer la sélection
                  </Button>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={selectedProductIds.size === 0}
                      className="flex h-9 min-w-[180px] items-center justify-between rounded-full border border-strong bg-background px-3 text-sm font-medium text-foreground shadow-inner transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (selectedProductIds.size === 0) return;
                        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceBelow = viewportHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        const availableBelow = spaceBelow - 20;
                        const availableAbove = spaceAbove - 20;
                        const width = rect.width;
                        const available = Math.max(availableBelow, availableAbove);
                        const maxHeight = Math.max(140, Math.min(320, available));
                        const top =
                          availableBelow >= availableAbove
                            ? rect.bottom + 6 + window.scrollY
                            : rect.top - maxHeight - 6 + window.scrollY;
                        const left = Math.min(
                          Math.max(rect.left + window.scrollX, 8),
                          window.innerWidth - width - 8,
                        );
                        setBulkFavoritesMenuStyle({ top, left, width, maxHeight });
                        setBulkFavoritesMenuOpen(true);
                      }}
                    >
                      Ajouter aux favoris…
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="pointer-events-none absolute inset-0 rounded-full border border-border/60 shadow-inner" />
                  </div>
                </div>
                <div className="mt-3 flex-1 overflow-auto">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => renderProductCard(product))}
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
                          ref={clientSearchInputRef}
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
                <div className="mt-3 flex-1 overflow-hidden rounded-2xl border border-strong bg-background">
                  <div className="h-full overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 border-b border-strong bg-panel text-left text-[11px] uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Client</th>
                          <th className="px-3 py-2 font-medium">Téléphone</th>
                          <th className="px-3 py-2 font-medium">Adresse</th>
                          <th className="px-3 py-2 font-medium">Notes</th>
                          <th className="px-3 py-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-strong">
                        {filteredClients.map((client) => {
                          const isSelected = client.id === selectedClientId;
                          return (
                            <tr
                              key={client.id}
                              className={`cursor-pointer transition ${isSelected ? "bg-emerald-500/10" : "hover:bg-panel-soft"}`}
                              onClick={() => handleSelectClient(client.id)}
                            >
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-muted-foreground"}`}
                                  />
                                  <div>
                                    <div className="font-semibold">{client.name}</div>
                                    <div className="text-[11px] uppercase text-muted-foreground">
                                      {client.id === defaultClientId ? "Par défaut" : client.sex === "female" ? "Femme" : "Homme"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-muted-foreground">{client.phone}</td>
                              <td className="px-3 py-3 text-muted-foreground">{client.address ?? "—"}</td>
                              <td className="px-3 py-3 text-muted-foreground">
                                {client.note ? (
                                  <span className="line-clamp-2 text-xs">{client.note}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full px-3"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleEditClient(client);
                                    }}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Modifier
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full text-destructive hover:bg-destructive/10"
                                    disabled={client.id === defaultClientId}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteClient(client.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredClients.length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                              Aucun client trouvé.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-strong bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Tickets du client</p>
                      <p className="text-sm font-semibold">{selectedClientName}</p>
                    </div>
                    <span className="rounded-full border border-strong bg-panel-soft px-3 py-1 text-[11px] font-semibold">
                      {clientHistoryEntries.length} ticket(s)
                    </span>
                  </div>
                  <div className="mt-2 max-h-64 overflow-auto">
                    {clientHistoryEntries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-strong bg-panel-soft px-3 py-4 text-sm text-muted-foreground">
                        Aucun ticket pour ce client pour l&apos;instant.
                      </div>
                    ) : (
                      <ul className="divide-y divide-strong">
                        {clientHistoryEntries.map((entry) => {
                          const created = new Date(entry.createdAt);
                          const timeLabel = created.toLocaleTimeString("fr-DZ", { hour12: false });
                          const dateLabel = created.toLocaleDateString("fr-DZ");
                          const isSelectedHistory = entry.id === selectedHistoryId;
                          return (
                            <li key={entry.id} className="py-1">
                              <button
                                type="button"
                                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition ${
                                  isSelectedHistory
                                    ? "border border-emerald-500 bg-emerald-500/10 text-foreground"
                                    : "border border-transparent hover:border-emerald-500 hover:bg-panel-soft text-muted-foreground hover:text-foreground"
                                } cursor-pointer`}
                                onClick={() => {
                                  handleSelectHistoryEntry(entry);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold">#{entry.id.slice(-6)}</span>
                                  <span className="text-[11px] text-muted-foreground">{dateLabel} · {timeLabel}</span>
                                </div>
                                <div className="ml-auto text-right">
                                  <p className="font-semibold text-emerald-600">{formatCurrency(entry.total)}</p>
                                  <p className="text-[11px] text-muted-foreground">{entry.items.length} article(s)</p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
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
                <aside className="flex w-52 min-h-0 max-h-[calc(100vh-220px)] flex-col rounded-2xl border border-strong bg-panel p-3 text-xs shadow-inner">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                      Favoris
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full px-2 text-[11px]"
                      onClick={() => setIsManagingFavorites((prev) => !prev)}
                    >
                      {isManagingFavorites ? "Terminer" : "Gérer"}
                    </Button>
                  </div>
                  {isManagingFavorites ? (
                    <div className="mb-2 space-y-2 rounded-xl border border-strong bg-panel-soft p-2">
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-lg border border-strong bg-background px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Nom du favori"
                          value={newFavoriteName}
                          onChange={(event) => setNewFavoriteName(event.target.value)}
                        />
                        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          Couleur
                          <input
                            type="color"
                            className="h-9 w-14 cursor-pointer rounded border border-strong bg-background p-1"
                            value={newFavoriteColor}
                            onChange={(event) => setNewFavoriteColor(event.target.value)}
                          />
                        </label>
                        <Button size="sm" className="w-full rounded-full" onClick={handleAddFavoriteCategory}>
                          <Plus className="h-4 w-4" />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex-1 space-y-2 overflow-auto pr-1">
                    {[{ id: FAVORITES_ALL_CATEGORY, label: "Tous les favoris", color: "var(--card)" }, ...favoriteCategories].map((entry) => {
                      const isAll = entry.id === FAVORITES_ALL_CATEGORY;
                      const textColor = "var(--foreground)";
                      const isActive = activeFavoriteCategory === entry.id;
                      const count = favoriteCountByCategory[entry.id] ?? (isAll ? favoriteProductIds.size : 0);
                      return (
                        <div key={entry.id} className="group relative">
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide shadow-sm transition ${
                              isActive ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background" : ""
                            }`}
                            style={{
                              backgroundColor: entry.color,
                              color: isAll ? "var(--foreground)" : textColor,
                              borderColor: entry.id === FAVORITES_ALL_CATEGORY ? "var(--border)" : entry.color,
                            }}
                            onClick={() => setActiveFavoriteCategory(entry.id)}
                          >
                            <span>{entry.label}</span>
                            <span
                              className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                              style={{
                                backgroundColor: "rgba(0,0,0,0.12)",
                                color: isAll ? "var(--foreground)" : textColor,
                              }}
                            >
                              {count}
                            </span>
                          </button>
                          {!isAll && isManagingFavorites ? (
                            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full bg-background/70"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRenameFavoriteCategory(entry.id);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full bg-background/70 text-destructive hover:bg-destructive/10"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteFavoriteCategory(entry.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-strong bg-panel p-4 shadow-inner">
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-strong bg-panel-soft px-3 py-2 text-xs">
                    <span className="rounded-full bg-background px-3 py-1 font-semibold text-foreground">
                      Sélection : {selectedProductIds.size}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-3"
                      disabled={filteredProducts.length === 0}
                      onClick={handleSelectAllFiltered}
                    >
                      Tout sélectionner (vue)
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full px-3"
                      disabled={selectedProductIds.size === 0}
                      onClick={clearSelection}
                    >
                      Effacer la sélection
                    </Button>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={selectedProductIds.size === 0}
                        className="flex h-9 min-w-[180px] items-center justify-between rounded-full border border-strong bg-background px-3 text-sm font-medium text-foreground shadow-inner transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (selectedProductIds.size === 0) return;
                          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const spaceBelow = viewportHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          const availableBelow = spaceBelow - 20;
                          const availableAbove = spaceAbove - 20;
                          const width = rect.width;
                          const available = Math.max(availableBelow, availableAbove);
                          const maxHeight = Math.max(140, Math.min(320, available));
                          const top =
                            availableBelow >= availableAbove
                              ? rect.bottom + 6 + window.scrollY
                              : rect.top - maxHeight - 6 + window.scrollY;
                          const left = Math.min(
                            Math.max(rect.left + window.scrollX, 8),
                            window.innerWidth - width - 8,
                          );
                          setBulkFavoritesMenuStyle({ top, left, width, maxHeight });
                          setBulkFavoritesMenuOpen(true);
                        }}
                      >
                        Ajouter aux favoris…
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <div className="pointer-events-none absolute inset-0 rounded-full border border-border/60 shadow-inner" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-1 gap-4 content-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredProducts.map((product) => renderProductCard(product))}
                      {filteredProducts.length === 0 ? (
                        <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-strong text-xs text-muted-foreground">
                          Aucun produit favori pour cette catégorie.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {bulkFavoritesMenuOpen && bulkFavoritesMenuStyle
          ? createPortal(
              <div
                role="menu"
                tabIndex={-1}
                className="fixed z-40 w-[min(240px,90vw)] overflow-auto rounded-xl border border-border bg-card text-sm shadow-2xl backdrop-blur-md"
                style={{
                  top: bulkFavoritesMenuStyle.top,
                  left: bulkFavoritesMenuStyle.left,
                  maxHeight: bulkFavoritesMenuStyle.maxHeight,
                }}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setBulkFavoritesMenuOpen(false);
                  }
                }}
              >
                {favoriteCategories.map((category) => {
                  const selected =
                    selectedProductIds.size > 0 &&
                    Array.from(selectedProductIds).every((id) =>
                      (favoriteAssignments[category.id] ?? []).includes(id),
                    );
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition ${
                        selected
                          ? "bg-emerald-500/10 text-foreground"
                          : "text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleBulkAddToFavorite(category.id);
                        setBulkFavoritesMenuOpen(false);
                      }}
                    >
                      <span>{category.label}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}

        {(renameFavoriteId || deleteFavoriteId) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
            <div className="w-[min(420px,96vw)] rounded-2xl border border-strong bg-background p-4 shadow-2xl">
              {renameFavoriteId ? (
                <>
                  <h3 className="text-lg font-semibold">Renommer le favori</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Modifiez le nom de cette catégorie.</p>
                  <input
                    className="mt-3 w-full rounded-lg border border-strong bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={renameDraftName}
                    onChange={(event) => setRenameDraftName(event.target.value)}
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" className="rounded-full" onClick={() => setRenameFavoriteId(null)}>
                      Annuler
                    </Button>
                    <Button className="rounded-full" onClick={confirmRenameFavoriteCategory} disabled={!renameDraftName.trim()}>
                      Enregistrer
                    </Button>
                  </div>
                </>
              ) : null}
              {deleteFavoriteId ? (
                <>
                  <h3 className="text-lg font-semibold">Supprimer le favori</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cette catégorie sera supprimée, mais les produits resteront dans l&apos;inventaire.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" className="rounded-full" onClick={() => setDeleteFavoriteId(null)}>
                      Annuler
                    </Button>
                    <Button
                      className="rounded-full bg-red-500 text-white hover:bg-red-600"
                      onClick={confirmDeleteFavoriteCategory}
                    >
                      Supprimer
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

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
            {showPrice ? (
              <Button
                className="flex-1 flex-col gap-1 rounded-2xl bg-blue-500 text-xs text-white hover:bg-blue-400 disabled:opacity-60"
                onClick={() => handleOpenPricePanel("price")}
                disabled={basketActionsDisabled}
              >
                <Tag className="h-4 w-4" />
                Prix
                <span className="text-[10px]">F4</span>
              </Button>
            ) : null}
            {showQuantity ? (
              <Button
                className="flex-1 flex-col gap-1 rounded-2xl bg-slate-500 text-xs text-white hover:bg-slate-400 disabled:opacity-60"
                onClick={() => handleOpenPricePanel("quantity")}
                disabled={basketActionsDisabled}
              >
                <HandCoins className="h-4 w-4" />
                Qté
                <span className="text-[10px]">F3</span>
              </Button>
            ) : null}
            {mergeValidateAndPrint ? (
              <Button
                className="flex-1 flex-col gap-1 rounded-2xl bg-emerald-700 text-xs text-white hover:bg-emerald-600 disabled:opacity-60"
                onClick={handleValidateAndPrint}
                disabled={basketActionsDisabled}
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider + Reçu
              </Button>
            ) : (
              <>
                {showValidate ? (
                  <Button
                    className="flex-1 flex-col gap-1 rounded-2xl bg-emerald-600 text-xs text-white hover:bg-emerald-500 disabled:opacity-60"
                    onClick={handleFinishBasket}
                    disabled={basketActionsDisabled}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider
                    <span className="text-[10px]">F11</span>
                  </Button>
                ) : null}
                {showPrint ? (
                  <Button
                    className="flex-1 flex-col gap-1 rounded-2xl bg-purple-500 text-xs text-white hover:bg-purple-400 disabled:opacity-60"
                    onClick={handlePrintReceipt}
                    disabled={displayedItems.length === 0}
                  >
                    <Printer className="h-4 w-4" />
                    Reçu
                  </Button>
                ) : null}
              </>
            )}
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

            {showBasketNavigation ? (
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
            ) : null}
          </div>
        </aside>
      </div>
      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-[min(780px,96vw)] rounded-[1.5rem] border border-border bg-panel p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Réglages rapides</p>
                <p className="text-lg font-semibold">Personnaliser le comptoir</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(false)}>
                Fermer
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-strong bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Onglets visibles</p>
                    <p className="text-sm text-muted-foreground">Choisissez les sections dans la barre du haut.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {topTabs.map((tab) => {
                    const enabled = tabVisibility[tab.label] !== false;
                    return (
                      <button
                        key={tab.label}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                          enabled
                            ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                            : "border-border bg-panel-soft text-muted-foreground hover:border-strong"
                        }`}
                        onClick={() => toggleTab(tab.label)}
                      >
                        <span className="flex items-center gap-2">
                          <tab.icon className="h-4 w-4" />
                          {tab.label}
                        </span>
                        <span className="text-[11px] font-semibold">
                          {enabled ? "Actif" : "Masqué"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-strong bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Actions rapides</p>
                    <p className="text-sm text-muted-foreground">Activer/désactiver les boutons (Home toujours présent).</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      showBasketNavigation
                        ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                        : "border-border bg-panel-soft text-muted-foreground hover:border-strong"
                    }`}
                    onClick={() => setShowBasketNavigation((prev) => !prev)}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Navigation paniers
                    </span>
                    <span className="text-[11px] font-semibold">{showBasketNavigation ? "Visible" : "Masquée"}</span>
                  </button>
                  {(
                    [
                      { key: "showPrice", label: "Bouton Prix" },
                      { key: "showQuantity", label: "Bouton Quantité" },
                      { key: "showValidate", label: "Valider ticket" },
                      { key: "showPrint", label: "Imprimer reçu" },
                      { key: "mergeValidateAndPrint", label: "Fusionner valider + reçu" },
                    ] as Array<{ key: keyof typeof actionVisibility; label: string }>
                  ).map((entry) => {
                    const enabled = actionVisibility[entry.key];
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                          enabled
                            ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                            : "border-border bg-panel-soft text-muted-foreground hover:border-strong"
                        }`}
                        onClick={() => toggleAction(entry.key)}
                      >
                        <span>{entry.label}</span>
                        <span className="text-[11px] font-semibold">{enabled ? "Actif" : "Masqué"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Quand fusionné, le bouton exécute l&apos;impression puis la validation.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {isEditingClient ? "Modifier un client" : "Nouveau client"}
                </p>
                <p className="text-lg font-semibold">
                  {isEditingClient ? "Mettre à jour le profil" : "Ajouter un client"}
                </p>
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
