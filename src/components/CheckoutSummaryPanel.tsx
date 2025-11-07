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
      <div className="glass-panel border border-emerald-900/70 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 px-6 py-5 text-white shadow-[0_25px_80px_rgba(2,44,34,0.65)] dark:border-emerald-500/50 dark:from-emerald-500/25 dark:via-transparent dark:to-emerald-500/8 dark:text-emerald-100">
        <div className="flex flex-col gap-2">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-white/90 drop-shadow-[0_2px_6px_rgba(16,185,129,0.45)] dark:text-emerald-200">
            Totale
          </span>
          <span className="font-mono text-5xl font-bold tracking-[0.18em] leading-none text-white drop-shadow-[0_4px_12px_rgba(9,9,9,0.35)] dark:text-emerald-100 sm:text-[3.25rem]">
            {totalDisplayValue}
          </span>
        </div>
      </div>

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
            <div className="flex items-center justify-between text-emerald-500">
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
