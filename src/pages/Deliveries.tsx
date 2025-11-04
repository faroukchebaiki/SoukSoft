import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeliverySchedule } from "@/types";

interface DeliveriesProps {
  schedule: DeliverySchedule[];
}

export function Deliveries({ schedule }: DeliveriesProps) {
  const getStatusBadge = (status: DeliverySchedule["status"]) => {
    switch (status) {
      case "Delivered":
        return { label: "Delivered", variant: "secondary" as const };
      case "Waiting dock":
        return { label: "Waiting dock", variant: "outline" as const };
      default:
        return { label: "On route", variant: "default" as const };
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Inbound deliveries</CardTitle>
          <CardDescription>
            Keep track of supplier drop-offs and dock assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((delivery) => {
            const statusBadge = getStatusBadge(delivery.status);
            return (
              <div
                key={delivery.supplier}
                className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{delivery.supplier}</p>
                  <p className="text-xs text-muted-foreground">
                    {delivery.items} pallets • Contact {delivery.contact}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  <span className="text-xs uppercase text-muted-foreground">
                    ETA {delivery.eta}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
