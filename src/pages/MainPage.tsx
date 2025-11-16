import {
  Barcode,
  Bell,
  Calculator,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FolderCog,
  HandCoins,
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
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { VAT_RATE } from "@/data/mockData";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { CartItem, CatalogProduct, CheckoutTotals } from "@/types";

interface MainPageProps {
  initialCartItems: CartItem[];
  availableProducts: CatalogProduct[];
}

interface ActivityLogEntry {
  id: string;
  message: string;
}

const toolbarActions = [
  { label: "Produits", shortcut: "F1", icon: ShoppingBag },
  { label: "Facture Achat", shortcut: "F2", icon: PackagePlus },
  { label: "Réglage", shortcut: "F3", icon: FolderCog },
  { label: "Charges", shortcut: "F7", icon: CreditCard },
  { label: "Clôture", shortcut: "F9", icon: ClipboardList },
];

const topTabs = [
  { label: "Les chambres" },
  { label: "Favoris", icon: Star },
  { label: "Stock" },
  { label: "Factures des ventes" },
  { label: "Tous les produits vendus" },
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
  ["0", "00", "C"],
];

export function MainPage({ initialCartItems, availableProducts }: MainPageProps) {
  const [basketItems, setBasketItems] = useState<CartItem[]>(() => initialCartItems);
  const [scannerListening, setScannerListening] = useState(true);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerQty, setScannerQty] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState(topTabs[0].label);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualProductId, setManualProductId] = useState(availableProducts[0]?.id ?? "");
  const [manualQty, setManualQty] = useState(1);
  const scannerInputRef = useRef<HTMLInputElement>(null);

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

  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discounts = basketItems.reduce((sum, item) => sum + (item.discountValue ?? 0), 0);
    const taxable = subtotal - discounts;
    const vat = taxable * VAT_RATE;
    const total = taxable + vat;
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

  const appendActivity = useCallback((line: string) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID?.() ?? `log-${Date.now()}-${Math.random()}`,
      message: line,
    };
    setActivityLog((log) => [entry, ...log].slice(0, 6));
  }, []);

  const upsertItem = useCallback(
    (product: CatalogProduct, quantity: number) => {
      if (Number.isNaN(quantity) || quantity <= 0) return;
      setBasketItems((items) => {
        const existingIndex = items.findIndex((entry) => entry.sku === product.sku);
        if (existingIndex >= 0) {
          const updated = [...items];
          const item = updated[existingIndex];
          updated[existingIndex] = { ...item, qty: item.qty + quantity };
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
          },
        ];
      });
      appendActivity(`Ajouté ${product.name} ×${quantity}`);
    },
    [appendActivity],
  );

  const focusScannerInput = useCallback(() => {
    scannerInputRef.current?.focus();
  }, []);

  const handleScanSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!scannerListening || !scannerInput.trim()) return;
      const product = availableProducts.find(
        (item) => item.barcode === scannerInput.trim(),
      );
      if (!product) {
        appendActivity(`Code inconnu ${scannerInput.trim()}`);
        return;
      }
      upsertItem(product, scannerQty);
      setScannerInput("");
      setScannerQty(1);
      focusScannerInput();
    },
    [
      appendActivity,
      availableProducts,
      scannerInput,
      scannerListening,
      scannerQty,
      upsertItem,
      focusScannerInput,
    ],
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
    setBasketItems(initialCartItems);
    appendActivity("Panier restauré");
    focusScannerInput();
  }, [appendActivity, focusScannerInput, initialCartItems]);

  const handleFinishBasket = useCallback(() => {
    appendActivity(
      `Panier validé à ${new Intl.DateTimeFormat("fr-DZ", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date())}`,
    );
    setBasketItems([]);
    focusScannerInput();
  }, [appendActivity, focusScannerInput]);

  const handlePrintReceipt = useCallback(() => {
    appendActivity("Reçu imprimé");
    window.print();
  }, [appendActivity]);

  const handleDeleteLastItem = useCallback(() => {
    setBasketItems((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      appendActivity("Dernière ligne supprimée");
      return next;
    });
  }, [appendActivity]);

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
        case "f4":
          event.preventDefault();
          appendActivity("Module prix rapide ouvert");
          break;
        case "f10":
          event.preventDefault();
          handleCancelBasket();
          break;
        case "f9":
          event.preventDefault();
          handleFinishBasket();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appendActivity, focusScannerInput, handleCancelBasket, handleFinishBasket]);

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
                    className={`flex items-center gap-2 rounded-2xl px-3 py-1 ${
                      isActive ? "bg-background text-foreground shadow" : "text-muted-foreground"
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
          </div>
          {activityLog.length > 0 ? (
            <div className="max-h-28 overflow-auto rounded-2xl border border-strong bg-panel p-3 text-xs text-muted-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em]">Activité récente</p>
              <ul className="mt-2 space-y-1">
                {activityLog.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-emerald-500" />
                    {entry.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="flex w-full max-w-lg gap-3 overflow-hidden">
          <div className="flex w-24 flex-col gap-2 rounded-2xl border border-strong bg-panel-soft p-2 text-[11px] shadow-inner">
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-red-500 text-xs text-white hover:bg-red-400"
              onClick={handleCancelBasket}
            >
              <RotateCcw className="h-4 w-4" />
              Annuler
              <span className="text-[10px]">F10</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-amber-500 text-xs text-white hover:bg-amber-400"
              onClick={handleDeleteLastItem}
            >
              <Trash2 className="h-4 w-4" />
              Suppr
              <span className="text-[10px]">SUPPR</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-blue-500 text-xs text-white hover:bg-blue-400"
              onClick={() => appendActivity("Mode prix rapide")}
            >
              <Tag className="h-4 w-4" />
              Prix
              <span className="text-[10px]">F4</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-slate-500 text-xs text-white hover:bg-slate-400"
              onClick={() => appendActivity("Ajustement quantité")}
            >
              <HandCoins className="h-4 w-4" />
              Qté
              <span className="text-[10px]">F3</span>
            </Button>
            <Button
              className="flex-1 flex-col gap-1 rounded-2xl bg-emerald-600 text-xs text-white hover:bg-emerald-500"
              onClick={handleFinishBasket}
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider
              <span className="text-[10px]">F11</span>
            </Button>
            <Button variant="outline" className="flex-1 flex-col gap-1 rounded-2xl text-xs" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4" />
              Reçu
            </Button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-strong bg-panel p-4 shadow-2xl">
            <div className="rounded-2xl border border-border bg-foreground/90 p-4 text-background">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider opacity-80">
                <span>Prix 2</span>
                <span>Bon : 8</span>
                <span>Date : {new Date().toLocaleDateString("fr-DZ")}</span>
              </div>
              <div className="mt-2 text-xs">
                Vendeur : <span className="font-semibold">sahiheha</span>
              </div>
              <div className="text-xs">
                État : <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-100">Nouveau</span>
              </div>
              <p className="mt-3 text-4xl font-semibold">{totalDisplayValue}</p>
            </div>

            <div className="mt-3 flex-1 overflow-hidden rounded-2xl border border-strong bg-background">
              <div className="h-full overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="border-b border-strong bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">N°</th>
                      <th className="px-3 py-2 text-left font-medium">Désignation</th>
                      <th className="px-3 py-2 text-right font-medium">Prix U</th>
                      <th className="px-3 py-2 text-right font-medium">Qté</th>
                      <th className="px-3 py-2 text-right font-medium">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {basketItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          Ajoutez un article pour démarrer.
                        </td>
                      </tr>
                    ) : (
                      basketItems.map((item, index) => {
                        const lineTotal = item.price * item.qty - (item.discountValue ?? 0);
                        return (
                          <tr key={item.id} className="border-b border-dashed border-strong">
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

            <div className="mt-3 rounded-2xl border border-strong bg-panel-soft p-3">
              <div className="grid grid-cols-3 gap-2">
                {keypadRows.map((row) =>
                  row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded-xl border border-strong bg-background py-3 text-sm font-semibold shadow-inner"
                  >
                    {key}
                  </button>
                )),
              )}
                <button
                  type="button"
                  className="col-span-3 rounded-xl border border-emerald-500 bg-emerald-500 py-3 text-sm font-semibold text-white shadow-inner"
                  onClick={handleFinishBasket}
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
