import {
  BadgePercent,
  Barcode,
  Bell,
  ClipboardList,
  CreditCard,
  History,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBasket,
  SquareTerminal,
  Store,
  Truck,
  Users2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type UnitType = "kg" | "pcs";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  qty: number;
  price: number;
  category: string;
  discountValue?: number;
  discountLabel?: string;
}

const VAT_RATE = 0.19;

const navigation = [
  { label: "Quick checkout", icon: SquareTerminal },
  { label: "Pending orders", icon: ClipboardList },
  { label: "Store inventory", icon: Package },
  { label: "Deliveries", icon: Truck },
  { label: "Loyalty customers", icon: Users2 },
  { label: "Settings", icon: Settings },
];

const cartItems: CartItem[] = [
  {
    id: "1",
    name: "Beefsteak tomatoes",
    sku: "PROD-TOM-01",
    unit: "kg",
    qty: 1.35,
    price: 220,
    category: "Produce",
    discountLabel: "Daily price",
  },
  {
    id: "2",
    name: "Kabylie olive oil 1L",
    sku: "PAN-OLI-11",
    unit: "pcs",
    qty: 2,
    price: 950,
    category: "Gourmet pantry",
  },
  {
    id: "3",
    name: "Plain yogurt 12x110g",
    sku: "CHL-YOG-32",
    unit: "pcs",
    qty: 1,
    price: 520,
    category: "Chilled foods",
    discountValue: 80,
    discountLabel: "Loyalty discount",
  },
  {
    id: "4",
    name: "Semolina couscous 5kg",
    sku: "DRY-COU-08",
    unit: "pcs",
    qty: 1,
    price: 1380,
    category: "Dry goods",
  },
];

const quickActions = [
  { label: "Item return", icon: History },
  { label: "Manual price", icon: BadgePercent },
  { label: "Open cash drawer", icon: Wallet },
  { label: "Provisional receipt", icon: Receipt },
];

const paymentMethods = [
  { label: "Cash (DZD)", icon: Wallet },
  { label: "CIB card", icon: CreditCard },
  { label: "Edahabia card", icon: CreditCard },
  { label: "Store voucher", icon: Receipt },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number, unit: UnitType) {
  if (unit === "kg") {
    return `${value.toFixed(2)} kg`;
  }
  return `${value} pcs`;
}

function BasketTotalPanel({
  totalDisplayValue,
  lineCount,
}: {
  totalDisplayValue: string;
  lineCount: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-5 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-200">
          Basket total
        </span>
        <span className="font-mono text-4xl tracking-[0.28em] leading-none sm:text-[2.75rem]">
          {totalDisplayValue}
        </span>
      </div>
      <Badge variant="secondary">
        {lineCount} lines
      </Badge>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState(navigation[0].label);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const discounts = cartItems.reduce(
      (sum, item) => sum + (item.discountValue ?? 0),
      0,
    );
    const taxable = subtotal - discounts;
    const vat = taxable * VAT_RATE;
    const total = taxable + vat;
    const produceWeight = cartItems
      .filter((item) => item.unit === "kg")
      .reduce((sum, item) => sum + item.qty, 0);
    const pieceCount = cartItems
      .filter((item) => item.unit === "pcs")
      .reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      discounts,
      vat,
      total,
      lines: cartItems.length,
      produceWeight,
      pieceCount,
    };
  }, []);

  const totalDisplayValue = useMemo(
    () => formatCurrency(totals.total),
    [totals.total],
  );

  return (
    <div className="flex min-h-screen min-w-[1200px] bg-background text-foreground">
      <aside className="flex w-80 shrink-0 border-r bg-card/30 flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs uppercase text-muted-foreground">SoukSoft</p>
            <h1 className="text-lg font-semibold">Generic Supermarket</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium",
                activeSection === label
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveSection(label)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t px-6 py-6">
          <p className="text-xs uppercase text-muted-foreground">
            Shift shortcuts
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="justify-start gap-2">
              <ShoppingBasket className="h-4 w-4" />
              Close register
            </Button>
            <Button variant="secondary" className="justify-start gap-2">
              <Receipt className="h-4 w-4" />
              Ticket history
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[3fr_2fr]">
          <section className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Add item</CardTitle>
                  <CardDescription>
                    Scan a barcode or search for a product from the aisle.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Barcode className="h-4 w-4" />
                    Scan
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-[2fr,1fr,1fr]">
                  <label className="flex flex-col">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Product lookup
                    </span>
                    <input
                      className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Name, internal code, aisle…"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Barcode
                    </span>
                    <input
                      className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Waiting for scan…"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Manual weight (kg)
                    </span>
                    <input
                      className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="0,000"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map(({ label, icon: Icon }) => (
                    <Button
                      key={label}
                      variant="secondary"
                      size="sm"
                      className="justify-start gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Active basket</CardTitle>
                  <CardDescription>
                    Review items and adjust quantities before checkout.
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {totals.lines} lines | {totals.pieceCount} items
                </Badge>
              </CardHeader>
              <CardContent className="rounded-md border p-0">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 font-medium">Qty</th>
                      <th className="px-4 py-2 font-medium">Unit price</th>
                      <th className="px-4 py-2 font-medium">Discount</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {cartItems.map((item) => {
                      const lineTotal = item.price * item.qty - (item.discountValue ?? 0);
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.sku}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[0.6rem] uppercase">
                                  {item.category}
                                </Badge>
                                {item.discountLabel ? (
                                  <Badge variant="secondary" className="text-[0.6rem] uppercase">
                                    {item.discountLabel}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                −
                              </Button>
                              <div className="min-w-[72px] text-center">
                                <p className="text-sm font-medium leading-tight">
                                  {formatQuantity(item.qty, item.unit)}
                                </p>
                                {item.unit === "kg" ? (
                                  <span className="text-[0.625rem] uppercase text-muted-foreground">
                                    Scale 3
                                  </span>
                                ) : null}
                              </div>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                +
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3">
                            {item.discountValue ? (
                              <span className="text-sm text-emerald-500">
                                −{formatCurrency(item.discountValue)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {totals.pieceCount} items | {totals.produceWeight.toFixed(2)} kg fresh
                  produce
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Suspend ticket</Button>
                  <Button variant="outline">Add note</Button>
                </div>
              </CardFooter>
            </Card>

          </section>

          <aside className="space-y-6">
            <BasketTotalPanel
              totalDisplayValue={totalDisplayValue}
              lineCount={totals.lines}
            />
            <Card>
              <CardHeader>
                <CardTitle>Register summary</CardTitle>
                <CardDescription>
                  Amounts calculated with VAT {VAT_RATE * 100}%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discounts > 0 ? (
                  <div className="flex items-center justify-between text-emerald-500">
                    <span>Discounts applied</span>
                    <span>−{formatCurrency(totals.discounts)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>VAT ({VAT_RATE * 100}%)</span>
                  <span>{formatCurrency(totals.vat)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Amount to collect</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ThemeToggle />
                    <Button variant="outline" className="gap-2">
                      <Bell className="h-4 w-4" />
                      Alerts
                    </Button>
                    <Button variant="outline">Suspend</Button>
                    <Button>Checkout</Button>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex uppercase">
                    Register 2 | Shift 08:00-16:00
                  </Badge>
                </div>
                {paymentMethods.map(({ label, icon: Icon }, index) => (
                  <Button key={label} className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      F{index + 1}
                    </span>
                  </Button>
                ))}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline">Split payment</Button>
                  <Button variant="outline">Print invoice</Button>
                </div>
              </CardFooter>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}
