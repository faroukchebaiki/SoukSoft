import {
  Barcode,
  CheckCircle2,
  Minus,
  Plus,
  PlusCircle,
  Printer,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckoutSummaryPanel } from "@/components/CheckoutSummaryPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function MainPage({ initialCartItems, availableProducts }: MainPageProps) {
  const [basketItems, setBasketItems] = useState<CartItem[]>(() => initialCartItems);
  const [scannerListening, setScannerListening] = useState(true);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerQty, setScannerQty] = useState(1);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualProductId, setManualProductId] = useState(
    availableProducts[0]?.id ?? "",
  );
  const [manualQty, setManualQty] = useState(1);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scannerListening) {
      scannerInputRef.current?.focus();
    }
  }, [scannerListening]);

  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discounts = basketItems.reduce(
      (sum, item) => sum + (item.discountValue ?? 0),
      0,
    );
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
    setActivityLog((log) => [entry, ...log].slice(0, 4));
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
      appendActivity(`Added ${product.name} ×${quantity}`);
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
        appendActivity(`Unknown barcode ${scannerInput.trim()}`);
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

  const handleQuantityChange = useCallback((itemId: string, delta: number) => {
    setBasketItems((items) =>
      items
        .map((item) =>
          item.id === itemId ? { ...item, qty: Math.max(item.qty + delta, 0) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setBasketItems((items) => items.filter((item) => item.id !== itemId));
  }, []);

  const handleCancelBasket = useCallback(() => {
    setBasketItems(initialCartItems);
    appendActivity("Basket restored to saved state");
    focusScannerInput();
  }, [appendActivity, focusScannerInput, initialCartItems]);

  const handleFinishBasket = useCallback(() => {
    appendActivity(
      `Basket validated at ${new Intl.DateTimeFormat("en-DZ", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date())}`,
    );
    setBasketItems([]);
    focusScannerInput();
  }, [appendActivity, focusScannerInput]);

  const handlePrintReceipt = useCallback(() => {
    appendActivity("Receipt printed");
    window.print();
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
          handlePrintReceipt();
          break;
        case "f5":
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
  }, [focusScannerInput, handleCancelBasket, handleFinishBasket, handlePrintReceipt]);


  return (
    <div className="page-shell flex h-full flex-col">
      <main className="grid flex-1 gap-6 overflow-hidden px-8 py-8 lg:grid-cols-[3fr_2fr]">
        <section className="flex min-h-0 flex-col gap-6 overflow-hidden">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-emerald-500" />
                  Barcode capture
                </CardTitle>
                <CardDescription>
                  Scanning a code instantly adds the item to the active basket.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3 lg:flex-row"
                onSubmit={handleScanSubmit}
              >
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Barcode
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                    <input
                      ref={scannerInputRef}
                      className="w-full bg-transparent text-base outline-none"
                      placeholder="Scan or type barcode"
                      value={scannerInput}
                      onChange={(event) => setScannerInput(event.target.value)}
                      disabled={!scannerListening}
                    />
                  </div>
                </label>
                <label className="flex w-full max-w-[140px] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Qty
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={scannerQty}
                    onChange={(event) =>
                      setScannerQty(Math.max(1, Number(event.target.value) || 1))
                    }
                    className="rounded-md border bg-background px-3 py-2 text-base"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <Button
                    type="submit"
                    className="w-full lg:w-auto"
                    disabled={!scannerListening}
                  >
                    Add via scan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScannerListening((prev) => !prev)}
                  >
                    {scannerListening ? "Pause" : "Resume"}
                  </Button>
                </div>
              </form>
              {activityLog.length > 0 ? (
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {activityLog.map((entry) => (
                    <p key={entry.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {entry.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>


          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Active basket</CardTitle>
                <CardDescription>
                  Add items, adjust quantities, or remove lines before validation.
                </CardDescription>
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <Badge variant="secondary" className="justify-center">
                  {totals.lines} lines · {totals.pieceCount} items
                </Badge>
                <Button
                  variant={manualMode ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setManualMode((prev) => !prev)}
                >
                  <PlusCircle className="h-4 w-4" />
                  {manualMode ? "Hide manual add" : "Add item"}
                </Button>
              </div>
            </CardHeader>
            {manualMode ? (
              <CardContent className="border-t bg-muted/30">
                <form
                  onSubmit={handleManualAdd}
                  className="flex flex-col gap-3 lg:flex-row"
                >
                  <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                    <select
                      value={manualProductId}
                      onChange={(event) => setManualProductId(event.target.value)}
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex w-full max-w-[120px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty
                    <input
                      type="number"
                      min={1}
                      value={manualQty}
                      onChange={(event) =>
                        setManualQty(Math.max(1, Number(event.target.value) || 1))
                      }
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <Button type="submit" className="w-full lg:w-auto">
                    Add to basket
                  </Button>
                </form>
              </CardContent>
            ) : null}
            <CardContent className="flex-1 overflow-hidden rounded-md border p-0">
              <div className="h-full overflow-y-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/70 text-left text-xs uppercase text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 font-medium">Qty</th>
                      <th className="px-4 py-2 font-medium">Unit price</th>
                      <th className="px-4 py-2 font-medium text-right">Line total</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {basketItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Scan or add an item to start the basket.
                        </td>
                      </tr>
                    ) : (
                      basketItems.map((item) => {
                        const lineTotal =
                          item.price * item.qty - (item.discountValue ?? 0);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.sku}
                                </span>
                                <Badge variant="outline" className="w-fit text-[0.6rem] uppercase">
                                  {item.category}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleQuantityChange(item.id, item.unit === "kg" ? -0.1 : -1)}
                                  aria-label={`Decrease ${item.name}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="min-w-[72px] text-center">
                                  <p className="text-sm font-medium leading-tight">
                                    {formatQuantity(item.qty, item.unit)}
                                  </p>
                                  {item.unit === "kg" ? (
                                    <span className="text-[0.625rem] uppercase text-muted-foreground">
                                      Scale ready
                                    </span>
                                  ) : null}
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleQuantityChange(item.id, item.unit === "kg" ? 0.1 : 1)}
                                  aria-label={`Increase ${item.name}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveItem(item.id)}
                                  aria-label={`Remove ${item.name}`}
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
        </section>

        <aside className="flex min-h-0 flex-col gap-6">
          <CheckoutSummaryPanel totals={totals} totalDisplayValue={totalDisplayValue} />
          <Card>
            <CardHeader>
              <CardTitle>Keyboard shortcuts</CardTitle>
              <CardDescription>Use function keys to stay off the touchscreen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { combo: "F1", action: "Focus barcode input", handler: focusScannerInput },
                { combo: "F2", action: "Toggle manual add", handler: () => setManualMode((prev) => !prev) },
                { combo: "F3", action: "Pause / resume scanner", handler: () => setScannerListening((prev) => !prev) },
                { combo: "F4", action: "Print receipt", handler: handlePrintReceipt },
                { combo: "F5", action: "Cancel basket", handler: handleCancelBasket },
                { combo: "F9", action: "Validate & next basket", handler: handleFinishBasket },
              ].map(({ combo, action, handler }) => (
                <button
                  key={combo}
                  type="button"
                  onClick={handler}
                  className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm"
                >
                  <span className="text-muted-foreground">{action}</span>
                  <span className="rounded-md bg-muted px-3 py-1 font-mono text-xs">{combo}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </main>
      <footer className="border-t bg-card/80 px-6 py-4 shadow-[0_-8px_20px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Register 2 · Shift 08:00-16:00
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-destructive/60 text-destructive"
              onClick={handleCancelBasket}
            >
              <RotateCcw className="h-4 w-4" />
              Cancel basket
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4" />
              Print receipt
            </Button>
            <Button className="gap-2" onClick={handleFinishBasket}>
              <CheckCircle2 className="h-4 w-4" />
              Validate & new basket
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
