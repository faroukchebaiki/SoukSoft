import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { PendingOrder } from "@/types";

interface PendingOrdersProps {
  orders: PendingOrder[];
}

export function PendingOrders({ orders }: PendingOrdersProps) {
  const getStatusVariant = (status: PendingOrder["status"]) => {
    switch (status) {
      case "Ready":
        return "secondary";
      case "Being prepared":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pickup queue</CardTitle>
            <CardDescription>
              Orders placed online or via call center waiting for fulfillment.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border p-0">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Ready at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium">{order.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{order.customer}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.itemCount} items
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{order.promisedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift notes</CardTitle>
            <CardDescription>
              Reminders logged by supervisors for today&apos;s afternoon shift.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-dashed border-amber-400/60 bg-amber-100/20 p-3">
              Verify freezer temperatures at 15:00 and upload to compliance log.
            </div>
            <div className="rounded-md border border-dashed border-amber-400/60 bg-amber-100/20 p-3">
              Prepare weekend promotion shelf talkers for citrus section.
            </div>
            <div className="rounded-md border border-dashed border-emerald-400/60 bg-emerald-100/20 p-3">
              Reminder: offer loyalty upgrade to customers above 20k points.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
