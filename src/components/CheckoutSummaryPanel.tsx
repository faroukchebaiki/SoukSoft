import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CheckoutTotals } from "@/types";

interface CheckoutSummaryPanelProps {
  totals: CheckoutTotals;
  totalDisplayValue: string;
  activePromotionsCount?: number;
  onRevertPromotion?: () => void;
}

export function CheckoutSummaryPanel({
  totals,
  totalDisplayValue,
  activePromotionsCount = 0,
  onRevertPromotion,
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
          {activePromotionsCount > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-semibold">
                {activePromotionsCount} promotion{activePromotionsCount > 1 ? "s" : ""} applied
              </p>
              {onRevertPromotion ? (
                <button
                  type="button"
                  onClick={onRevertPromotion}
                  className="mt-2 rounded-lg bg-amber-100/80 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-100 dark:bg-amber-400/20 dark:text-amber-50"
                >
                  Revert promotions
                </button>
              ) : null}
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
