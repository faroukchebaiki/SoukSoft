import {
  BadgePercent,
  Barcode,
  Bell,
  ClipboardList,
  CreditCard,
  History,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBasket,
  SquareTerminal,
  Store,
  Truck,
  Users2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type UnitType = "kg" | "pcs";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  qty: number;
  price: number;
  category: string;
  discountValue?: number;
  discountLabel?: string;
}

interface CheckoutTotals {
  subtotal: number;
  discounts: number;
  vat: number;
  total: number;
  lines: number;
  produceWeight: number;
  pieceCount: number;
}

interface QuickCheckoutSectionProps {
  cartItems: CartItem[];
  totals: CheckoutTotals;
  totalDisplayValue: string;
  quickActions: QuickAction[];
  paymentMethods: PaymentMethod[];
}

function QuickCheckoutSection({
  cartItems,
  totals,
  totalDisplayValue,
  quickActions,
  paymentMethods,
}: QuickCheckoutSectionProps) {
  return (
    <main className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[3fr_2fr]">
      <section className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Add item</CardTitle>
              <CardDescription>
                Scan a barcode or search for a product from the aisle.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Barcode className="h-4 w-4" />
                Scan
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[2fr,1fr,1fr]">
              <label className="flex flex-col">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Product lookup
                </span>
                <input
                  className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="Name, internal code, aisle..."
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Barcode
                </span>
                <input
                  className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="Waiting for scan..."
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Manual weight (kg)
                </span>
                <input
                  className="mt-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="0,000"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  variant="secondary"
                  size="sm"
                  className="justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Active basket</CardTitle>
              <CardDescription>
                Review items and adjust quantities before checkout.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {totals.lines} lines | {totals.pieceCount} items
            </Badge>
          </CardHeader>
          <CardContent className="rounded-md border p-0">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit price</th>
                  <th className="px-4 py-2 font-medium">Discount</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {cartItems.map((item) => {
                  const lineTotal =
                    item.price * item.qty - (item.discountValue ?? 0);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.sku}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className="text-[0.6rem] uppercase"
                            >
                              {item.category}
                            </Badge>
                            {item.discountLabel ? (
                              <Badge
                                variant="secondary"
                                className="text-[0.6rem] uppercase"
                              >
                                {item.discountLabel}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            −
                          </Button>
                          <div className="min-w-[72px] text-center">
                            <p className="text-sm font-medium leading-tight">
                              {formatQuantity(item.qty, item.unit)}
                            </p>
                            {item.unit === "kg" ? (
                              <span className="text-[0.625rem] uppercase text-muted-foreground">
                                Scale 3
                              </span>
                            ) : null}
                          </div>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            +
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3">
                        {item.discountValue ? (
                          <span className="text-sm text-emerald-500">
                            −{formatCurrency(item.discountValue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {totals.pieceCount} items | {totals.produceWeight.toFixed(2)} kg
              fresh produce
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Suspend ticket</Button>
              <Button variant="outline">Add note</Button>
            </div>
          </CardFooter>
        </Card>
      </section>

      <aside className="space-y-6">
        <BasketTotalPanel
          totalDisplayValue={totalDisplayValue}
          lineCount={totals.lines}
        />
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
              <Badge variant="outline" className="hidden sm:inline-flex uppercase">
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
      </aside>
    </main>
  );
}

interface PendingOrdersSectionProps {
  orders: PendingOrder[];
}

function PendingOrdersSection({ orders }: PendingOrdersSectionProps) {
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

interface InventorySectionProps {
  inventory: InventorySnapshot[];
}

function InventorySection({ inventory }: InventorySectionProps) {
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

interface DeliveriesSectionProps {
  schedule: DeliverySchedule[];
}

function DeliveriesSection({ schedule }: DeliveriesSectionProps) {
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

interface LoyaltySectionProps {
  members: LoyaltyMember[];
}

function LoyaltySection({ members }: LoyaltySectionProps) {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyalty directory</CardTitle>
          <CardDescription>
            Customers earning points at Generic Supermarket.
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-md border p-0">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">Points</th>
                <th className="px-4 py-2 font-medium">Last visit</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{member.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {member.points.toLocaleString("en-DZ")}
                  </td>
                  <td className="px-4 py-3">{member.lastVisit}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {member.phone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}

interface SettingsSectionProps {
  options: SettingOption[];
}

function SettingsSection({ options }: SettingsSectionProps) {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <Card key={option.name}>
            <CardHeader>
              <CardTitle>{option.name}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline">{option.actionLabel}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}

const VAT_RATE = 0.19;

const navigation = [
  { label: "Quick checkout", icon: SquareTerminal },
  { label: "Pending orders", icon: ClipboardList },
  { label: "Store inventory", icon: Package },
  { label: "Deliveries", icon: Truck },
  { label: "Loyalty customers", icon: Users2 },
  { label: "Settings", icon: Settings },
] as const;

type Section = (typeof navigation)[number]["label"];

const cartItems: CartItem[] = [
  {
    id: "1",
    name: "Beefsteak tomatoes",
    sku: "PROD-TOM-01",
    unit: "kg",
    qty: 1.35,
    price: 220,
    category: "Produce",
    discountLabel: "Daily price",
  },
  {
    id: "2",
    name: "Kabylie olive oil 1L",
    sku: "PAN-OLI-11",
    unit: "pcs",
    qty: 2,
    price: 950,
    category: "Gourmet pantry",
  },
  {
    id: "3",
    name: "Plain yogurt 12x110g",
    sku: "CHL-YOG-32",
    unit: "pcs",
    qty: 1,
    price: 520,
    category: "Chilled foods",
    discountValue: 80,
    discountLabel: "Loyalty discount",
  },
  {
    id: "4",
    name: "Semolina couscous 5kg",
    sku: "DRY-COU-08",
    unit: "pcs",
    qty: 1,
    price: 1380,
    category: "Dry goods",
  },
];

const quickActions = [
  { label: "Item return", icon: History },
  { label: "Manual price", icon: BadgePercent },
  { label: "Open cash drawer", icon: Wallet },
  { label: "Provisional receipt", icon: Receipt },
];

type QuickAction = (typeof quickActions)[number];

interface PendingOrder {
  id: string;
  customer: string;
  total: number;
  itemCount: number;
  status: "Awaiting pickup" | "Being prepared" | "Ready";
  promisedAt: string;
}

interface InventorySnapshot {
  category: string;
  skuCount: number;
  lowStockSku: number;
  lastAudit: string;
}

interface DeliverySchedule {
  supplier: string;
  eta: string;
  items: number;
  contact: string;
  status: "On route" | "Waiting dock" | "Delivered";
}

interface LoyaltyMember {
  id: string;
  name: string;
  tier: "Silver" | "Gold" | "Platinum";
  points: number;
  lastVisit: string;
  phone: string;
}

interface SettingOption {
  name: string;
  description: string;
  actionLabel: string;
}

const pendingOrders: PendingOrder[] = [
  {
    id: "ORD-4587",
    customer: "Amina K.",
    total: 8720,
    itemCount: 6,
    status: "Awaiting pickup",
    promisedAt: "12:30",
  },
  {
    id: "ORD-4592",
    customer: "Boutique Nour",
    total: 15640,
    itemCount: 14,
    status: "Being prepared",
    promisedAt: "13:15",
  },
  {
    id: "ORD-4599",
    customer: "Yacine B.",
    total: 4320,
    itemCount: 3,
    status: "Ready",
    promisedAt: "Now",
  },
  {
    id: "ORD-4601",
    customer: "Hotel Casbah",
    total: 24450,
    itemCount: 22,
    status: "Awaiting pickup",
    promisedAt: "15:45",
  },
];

const inventorySnapshots: InventorySnapshot[] = [
  {
    category: "Produce",
    skuCount: 132,
    lowStockSku: 6,
    lastAudit: "09:15 today",
  },
  {
    category: "Dry goods",
    skuCount: 212,
    lowStockSku: 11,
    lastAudit: "Yesterday 18:20",
  },
  {
    category: "Chilled foods",
    skuCount: 94,
    lowStockSku: 4,
    lastAudit: "Today 07:40",
  },
  {
    category: "Household",
    skuCount: 165,
    lowStockSku: 9,
    lastAudit: "Today 10:05",
  },
];

const deliverySchedule: DeliverySchedule[] = [
  {
    supplier: "Sersou Produce Cooperative",
    eta: "Today 14:30",
    items: 18,
    contact: "+213 551 223 998",
    status: "On route",
  },
  {
    supplier: "Atlas Dairy",
    eta: "Today 16:00",
    items: 12,
    contact: "+213 555 102 440",
    status: "Waiting dock",
  },
  {
    supplier: "Kabyle Olive Mills",
    eta: "Tomorrow 08:15",
    items: 9,
    contact: "+213 772 887 651",
    status: "On route",
  },
  {
    supplier: "Global Cleaning Supplies",
    eta: "Tomorrow 11:45",
    items: 15,
    contact: "+213 550 019 765",
    status: "Delivered",
  },
];

const loyaltyMembers: LoyaltyMember[] = [
  {
    id: "LOY-1022",
    name: "Samira B.",
    tier: "Gold",
    points: 18450,
    lastVisit: "Yesterday 17:05",
    phone: "+213 698 441 220",
  },
  {
    id: "LOY-1148",
    name: "Ali R.",
    tier: "Silver",
    points: 7400,
    lastVisit: "Today 09:35",
    phone: "+213 662 110 984",
  },
  {
    id: "LOY-1207",
    name: "Boutique Nora",
    tier: "Platinum",
    points: 40210,
    lastVisit: "Today 10:55",
    phone: "+213 553 872 100",
  },
  {
    id: "LOY-1299",
    name: "Karim L.",
    tier: "Gold",
    points: 21560,
    lastVisit: "3 days ago",
    phone: "+213 661 509 002",
  },
];

const settingsOptions: SettingOption[] = [
  {
    name: "Shift schedule",
    description: "Assign cashiers, configure lunch breaks, and manage replacements.",
    actionLabel: "Manage shifts",
  },
  {
    name: "Payment integrations",
    description: "Configure CIB, Edahabia, and voucher partners for this register.",
    actionLabel: "Edit providers",
  },
  {
    name: "Offline sync",
    description: "Review queued operations and sync status for the last 24 hours.",
    actionLabel: "View sync log",
  },
  {
    name: "Receipts layout",
    description: "Customize logo, footer messages, and loyalty prompts on receipts.",
    actionLabel: "Customize receipts",
  },
];

const paymentMethods = [
  { label: "Cash (DZD)", icon: Wallet },
  { label: "CIB card", icon: CreditCard },
  { label: "Edahabia card", icon: CreditCard },
  { label: "Store voucher", icon: Receipt },
];

type PaymentMethod = (typeof paymentMethods)[number];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number, unit: UnitType) {
  if (unit === "kg") {
    return `${value.toFixed(2)} kg`;
  }
  return `${value} pcs`;
}

function BasketTotalPanel({
  totalDisplayValue,
  lineCount,
}: {
  totalDisplayValue: string;
  lineCount: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-5 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-200">
          Basket total
        </span>
        <span className="font-mono text-4xl tracking-[0.28em] leading-none sm:text-[2.75rem]">
          {totalDisplayValue}
        </span>
      </div>
      <Badge variant="secondary">
        {lineCount} lines
      </Badge>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState(navigation[0].label);

  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const discounts = cartItems.reduce(
      (sum, item) => sum + (item.discountValue ?? 0),
      0,
    );
    const taxable = subtotal - discounts;
    const vat = taxable * VAT_RATE;
    const total = taxable + vat;
    const produceWeight = cartItems
      .filter((item) => item.unit === "kg")
      .reduce((sum, item) => sum + item.qty, 0);
    const pieceCount = cartItems
      .filter((item) => item.unit === "pcs")
      .reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      discounts,
      vat,
      total,
      lines: cartItems.length,
      produceWeight,
      pieceCount,
    };
  }, []);

  const totalDisplayValue = useMemo(
    () => formatCurrency(totals.total),
    [totals.total],
  );

  const renderSection = () => {
    switch (activeSection) {
      case "Quick checkout":
        return (
          <QuickCheckoutSection
            cartItems={cartItems}
            totals={totals}
            totalDisplayValue={totalDisplayValue}
            quickActions={quickActions}
            paymentMethods={paymentMethods}
          />
        );
      case "Pending orders":
        return <PendingOrdersSection orders={pendingOrders} />;
      case "Store inventory":
        return <InventorySection inventory={inventorySnapshots} />;
      case "Deliveries":
        return <DeliveriesSection schedule={deliverySchedule} />;
      case "Loyalty customers":
        return <LoyaltySection members={loyaltyMembers} />;
      case "Settings":
        return <SettingsSection options={settingsOptions} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen min-w-[1200px] bg-background text-foreground">
      <aside className="flex w-80 shrink-0 border-r bg-card/30 flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs uppercase text-muted-foreground">SoukSoft</p>
            <h1 className="text-lg font-semibold">Generic Supermarket</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium",
                activeSection === label
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveSection(label)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t px-6 py-6">
          <p className="text-xs uppercase text-muted-foreground">
            Shift shortcuts
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="justify-start gap-2">
              <ShoppingBasket className="h-4 w-4" />
              Close register
            </Button>
            <Button variant="secondary" className="justify-start gap-2">
              <Receipt className="h-4 w-4" />
              Ticket history
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {renderSection()}
      </div>
    </div>
  );
}
