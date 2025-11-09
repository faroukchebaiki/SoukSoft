import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CheckoutTotals } from "@/types";

interface CheckoutSummaryPanelProps {
  totals: CheckoutTotals;
  totalDisplayValue: string;
}

export function CheckoutSummaryPanel({
  totals,
  totalDisplayValue,
}: CheckoutSummaryPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem]">
        <CardContent className="space-y-3 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Totale
          </p>
          <p className="font-mono text-5xl font-semibold tracking-[0.18em] text-card-foreground sm:text-[3.5rem]">
            {totalDisplayValue}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Register summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discounts > 0 ? (
            <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400">
              <span>Discounts applied</span>
              <span>−{formatCurrency(totals.discounts)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Amount to collect</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
