import { Barcode, Bell, Search } from "lucide-react";

import { BasketTotalPanel } from "@/components/BasketTotalPanel";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { VAT_RATE } from "@/data/mockData";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type {
  CartItem,
  CheckoutTotals,
  PaymentMethod,
  QuickAction,
} from "@/types";

interface QuickCheckoutProps {
  cartItems: CartItem[];
  totals: CheckoutTotals;
  totalDisplayValue: string;
  quickActions: QuickAction[];
  paymentMethods: PaymentMethod[];
}

export function QuickCheckout({
  cartItems,
  totals,
  totalDisplayValue,
  quickActions,
  paymentMethods,
}: QuickCheckoutProps) {
  return (
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
                  placeholder="Name, internal code, aisle..."
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Barcode
                </span>
                <input
                  className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="Waiting for scan..."
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
                  <th className="px-4 py-2 font-medium text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {cartItems.map((item) => {
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
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className="text-[0.6rem] uppercase"
                            >
                              {item.category}
                            </Badge>
                            {item.discountLabel ? (
                              <Badge
                                variant="secondary"
                                className="text-[0.6rem] uppercase"
                              >
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
  );
}
