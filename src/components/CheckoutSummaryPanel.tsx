import { Bell } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VAT_RATE } from "@/data/mockData";
import { formatCurrency } from "@/lib/format";
import type { CheckoutTotals, PaymentMethod } from "@/types";

interface CheckoutSummaryPanelProps {
  totals: CheckoutTotals;
  totalDisplayValue: string;
  paymentMethods: PaymentMethod[];
}

export function CheckoutSummaryPanel({
  totals,
  totalDisplayValue,
  paymentMethods,
}: CheckoutSummaryPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-5 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
        <div className="flex flex-col gap-2">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-200">
            Basket total
          </span>
          <span className="font-mono text-4xl tracking-[0.28em] leading-none sm:text-[2.75rem]">
            {totalDisplayValue}
          </span>
        </div>
        <Badge variant="secondary">{totals.lines} lines</Badge>
      </div>

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
            <Badge variant="outline" className="hidden uppercase sm:inline-flex">
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
    </div>
  );
}
