import { Clock9, History as HistoryIcon, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { PurchaseHistoryEntry } from "@/types";

interface PurchaseHistoryProps {
  entries: PurchaseHistoryEntry[];
}

export function PurchaseHistory({ entries }: PurchaseHistoryProps) {
  const totalCollected = entries.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <main className="page-shell flex-1 overflow-y-auto px-8 py-8">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-muted-foreground">
            Every purchase logged with timestamps, payment methods, and cashier notes.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2">
          <HistoryIcon className="h-4 w-4" />
          {entries.length} receipts today
        </Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total collected</CardTitle>
            <CardDescription>Sum of all validated baskets</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {formatCurrency(totalCollected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average ticket</CardTitle>
            <CardDescription>Across {entries.length} purchases</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {entries.length > 0 ? formatCurrency(totalCollected / entries.length) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last receipt</CardTitle>
            <CardDescription>Time the most recent basket closed</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Clock9 className="h-6 w-6 text-muted-foreground" />
            {entries[0]?.completedAt ?? "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            Purchase log
          </CardTitle>
          <CardDescription>
            Most recent receipts appear first. Use the register export to retrieve more history.
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-md border p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-4 py-2 font-medium">Receipt</th>
                  <th className="px-4 py-2 font-medium">Cashier</th>
                  <th className="px-4 py-2 font-medium text-right">Items</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium text-right">Payment</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-medium">{entry.id}</td>
                    <td className="px-4 py-3">{entry.cashier}</td>
                    <td className="px-4 py-3 text-right">{entry.items}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(entry.total)}
                    </td>
                    <td className="px-4 py-3 text-right">{entry.paymentMethod}</td>
                    <td className="px-4 py-3 text-right">{entry.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
