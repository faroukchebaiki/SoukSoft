import {
  BadgePercent,
  ClipboardList,
  CreditCard,
  History,
  Package,
  Receipt,
  Settings,
  SquareTerminal,
  Users2,
  Wallet,
} from "lucide-react";

import type {
  CartItem,
  InventorySnapshot,
  LoyaltyMember,
  NavigationItem,
  PaymentMethod,
  PendingOrder,
  QuickAction,
  Section,
  SettingOption,
} from "@/types";

export const VAT_RATE = 0.19;

export const navigation: readonly NavigationItem[] = [
  { label: "Quick checkout", icon: SquareTerminal },
  { label: "Pending orders", icon: ClipboardList },
  { label: "Store inventory", icon: Package },
  { label: "Loyalty customers", icon: Users2 },
  { label: "Settings", icon: Settings },
] as const satisfies ReadonlyArray<NavigationItem>;

export const cartItems: CartItem[] = [
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

export const quickActions: QuickAction[] = [
  { label: "Item return", icon: History },
  { label: "Manual price", icon: BadgePercent },
  { label: "Open cash drawer", icon: Wallet },
  { label: "Provisional receipt", icon: Receipt },
];

export const paymentMethods: PaymentMethod[] = [
  { label: "Cash (DZD)", icon: Wallet },
  { label: "CIB card", icon: CreditCard },
  { label: "Edahabia card", icon: CreditCard },
  { label: "Store voucher", icon: Receipt },
];

export const pendingOrders: PendingOrder[] = [
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

export const inventorySnapshots: InventorySnapshot[] = [
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

export const loyaltyMembers: LoyaltyMember[] = [
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

export const settingsOptions: SettingOption[] = [
  {
    name: "Shift schedule",
    description:
      "Assign cashiers, configure lunch breaks, and manage replacements.",
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

export const DEFAULT_SECTION: Section = "Quick checkout";
