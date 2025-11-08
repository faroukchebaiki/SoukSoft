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
      <div className="rounded-3xl border border-black/60 bg-gradient-to-br from-black via-[#0b0d1c] to-[#101030] px-8 py-7 text-white shadow-[0_40px_90px_rgba(0,0,0,0.35)] dark:border-primary/20 dark:from-primary/20 dark:via-[#120a1f] dark:to-[#1b0c2f]">
        <p className="text-xs uppercase tracking-[0.4em] text-white/70 dark:text-primary/70">
          Totale
        </p>
        <p className="font-mono text-5xl font-semibold tracking-[0.18em] text-white dark:text-primary/90 sm:text-[3.5rem] drop-shadow-[0_6px_25px_rgba(0,0,0,0.45)]">
          {totalDisplayValue}
        </p>
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
