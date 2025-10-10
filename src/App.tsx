import {
  BadgeDollarSign,
  BadgePercent,
  Barcode,
  Bell,
  CreditCard,
  History,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBasket,
  SquareTerminal,
  Store,
  Users2,
  Wallet,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

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

const navigation = [
  { label: "Register", icon: SquareTerminal },
  { label: "Sales history", icon: Receipt },
  { label: "Inventory", icon: Package },
  { label: "Customers", icon: Users2 },
  { label: "Promotions", icon: BadgePercent },
  { label: "Settings", icon: Settings },
];

const cartItems = [
  {
    id: "1",
    name: "Premium Dark Roast Coffee Beans 1kg",
    sku: "SKU-10024",
    qty: 2,
    price: 18.5,
    discount: "Buy 1 get 2nd -20%",
  },
  {
    id: "2",
    name: "Reusable Insulated Bottle 750ml",
    sku: "SKU-11091",
    qty: 1,
    price: 24.0,
  },
  {
    id: "3",
    name: "Artisan Chocolate Bar Collection",
    sku: "SKU-98213",
    qty: 3,
    price: 6.5,
  },
  {
    id: "4",
    name: "House Blend Loose Leaf Tea 250g",
    sku: "SKU-44102",
    qty: 1,
    price: 14.75,
  },
];

const quickActions = [
  { label: "Apply discount", icon: BadgePercent },
  { label: "Suspend sale", icon: History },
  { label: "Price check", icon: Search },
];

const paymentMethods = [
  { label: "Cash", icon: Wallet },
  { label: "Card", icon: CreditCard },
  { label: "Store credit", icon: BadgeDollarSign },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function App() {
  const [activeSection, setActiveSection] = useState(navigation[0].label);
  const loyaltyInputId = useId();

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    return {
      subtotal,
      tax,
      total,
      items: cartItems.reduce((sum, item) => sum + item.qty, 0),
    };
  }, []);
  const totalDisplayValue = useMemo(
    () =>
      formatCurrency(totals.total)
        .replace("$", "$ ")
        .toUpperCase(),
    [totals.total],
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 border-r bg-card/30 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs uppercase text-muted-foreground">Souksoft</p>
            <h1 className="text-lg font-semibold">Point of Sale</h1>
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
          <p className="text-xs uppercase text-muted-foreground">Shortcuts</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="justify-start gap-2">
              <ShoppingBasket className="h-4 w-4" />
              Open returns
            </Button>
            <Button variant="secondary" className="justify-start gap-2">
              <Receipt className="h-4 w-4" />
              End of day
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-6 border-b bg-card/40 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Badge variant="secondary">Register 3</Badge>
            <div>
              <h2 className="text-2xl font-semibold leading-tight">Active sale</h2>
              <p className="text-xs text-muted-foreground">
                Cashier: Aya Benali • Shift 09:00 - 17:00
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-col items-end">
              <div className="flex items-center justify-end rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-3 font-mono text-4xl tracking-[0.35em] text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] sm:text-5xl lg:min-w-[320px]">
                {totalDisplayValue}
              </div>
              <span className="mt-2 text-xs font-medium uppercase tracking-[0.3em] text-emerald-500/80">
                Total due
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" className="gap-2">
                <Bell className="h-4 w-4" />
                Alerts
              </Button>
              <Button variant="outline">Hold sale</Button>
              <Button>Checkout</Button>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-6 overflow-y-auto px-8 py-6 xl:grid-cols-[2fr_1fr]">
          <section className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Scan or search items</CardTitle>
                  <CardDescription>
                    Use the barcode scanner or search to add products to the cart.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Barcode className="h-4 w-4" />
                    Manual barcode
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Search className="h-4 w-4" />
                    Browse catalog
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                  <label className="flex flex-col">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Product search
                    </span>
                    <input
                      className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Search by name, SKU, category..."
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Barcode
                    </span>
                    <input
                      className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Awaiting scan..."
                    />
                  </label>
                </div>

                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Item</th>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Price</th>
                        <th className="px-4 py-2 font-medium text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {cartItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {item.sku}
                              </span>
                              {item.discount ? (
                                <span className="text-xs text-primary">
                                  {item.discount}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-7 w-7">
                                −
                              </Button>
                              <span className="w-6 text-center">{item.qty}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7">
                                +
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(item.price * item.qty)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {totals.items} items • {formatCurrency(totals.subtotal)} subtotal
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Clear cart</Button>
                  <Button variant="outline">Add note</Button>
                </div>
              </CardFooter>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                  <CardDescription>
                    Attach a loyalty profile to apply benefits automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Walk-in customer</p>
                      <p className="text-xs text-muted-foreground">
                        Not enrolled in loyalty
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Add customer
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <label
                      htmlFor={loyaltyInputId}
                      className="text-xs font-medium uppercase text-muted-foreground"
                    >
                      Loyalty number
                    </label>
                    <input
                      id={loyaltyInputId}
                      className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Scan or type loyalty ID"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>
                    Frequently used register flows for the cashier.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {quickActions.map(({ label, icon: Icon }) => (
                    <Button key={label} variant="secondary" className="justify-start gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase text-muted-foreground">
                  Order summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax (8%)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total due</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
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
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register status</CardTitle>
                <CardDescription>
                  Keep an eye on cash drawer movement and voided sales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Opening float</span>
                  <span>{formatCurrency(200)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cash added</span>
                  <span>{formatCurrency(120)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cash removed</span>
                  <span>{formatCurrency(40)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Expected drawer</span>
                  <span>{formatCurrency(280)}</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}
