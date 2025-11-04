import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InventorySnapshot } from "@/types";

interface StoreInventoryProps {
  inventory: InventorySnapshot[];
}

export function StoreInventory({ inventory }: StoreInventoryProps) {
  const totalSkus = inventory.reduce((sum, { skuCount }) => sum + skuCount, 0);
  const totalLowStock = inventory.reduce(
    (sum, { lowStockSku }) => sum + lowStockSku,
    0,
  );

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by department</CardTitle>
            <CardDescription>
              Snapshot of active SKUs and items flagged for replenishment.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {inventory.map((entry) => (
              <div
                key={entry.category}
                className="rounded-lg border border-dashed p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    {entry.category}
                  </h3>
                  <Badge variant="outline">{entry.lastAudit}</Badge>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt>Total SKUs</dt>
                    <dd className="font-medium">{entry.skuCount}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Low stock alerts</dt>
                    <dd className="font-medium text-amber-500">
                      {entry.lowStockSku}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory summary</CardTitle>
            <CardDescription>Aggregated stats across departments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <span>Total SKUs tracked</span>
              <span className="font-semibold">{totalSkus}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <span>Items to reorder</span>
              <span className="font-semibold text-amber-500">{totalLowStock}</span>
            </div>
            <p className="text-muted-foreground">
              Detailed stock adjustments can be imported from the handheld
              terminals every hour. Use the button below to trigger a manual sync.
            </p>
            <Button variant="outline">Sync handheld inventory</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
