import { CheckoutSummaryPanel } from "@/components/CheckoutSummaryPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { CartItem, CheckoutTotals, PaymentMethod } from "@/types";

interface QuickCheckoutProps {
  cartItems: CartItem[];
  totals: CheckoutTotals;
  totalDisplayValue: string;
  paymentMethods: PaymentMethod[];
}

export function QuickCheckout({
  cartItems,
  totals,
  totalDisplayValue,
  paymentMethods,
}: QuickCheckoutProps) {
  return (
    <main className="grid h-full min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[3fr_2fr]">
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <Card className="flex h-full min-h-0 flex-col">
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
          <CardContent className="flex-1 overflow-hidden rounded-md border p-0">
            <div className="h-full overflow-y-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 z-10 bg-muted/70 text-left text-xs uppercase text-muted-foreground backdrop-blur">
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
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="h-full">
        <CheckoutSummaryPanel
          totals={totals}
          totalDisplayValue={totalDisplayValue}
          paymentMethods={paymentMethods}
        />
      </aside>
    </main>
  );
}
