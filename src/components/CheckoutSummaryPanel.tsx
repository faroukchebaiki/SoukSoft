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
      <div className="rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-5 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
        <div className="flex flex-col gap-2">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-200">
            Totale
          </span>
          <span className="font-mono text-5xl font-bold tracking-[0.18em] leading-none sm:text-[3.25rem]">
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
