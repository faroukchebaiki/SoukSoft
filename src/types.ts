import type { LucideIcon } from "lucide-react";

export type UnitType = "kg" | "pcs";

export type Section =
  | "Counter"
  | "All items"
  | "History"
  | "Settings"
  | "Product builder"
  | "Expiring items";

export interface NavigationItem {
  label: Section;
  icon: LucideIcon;
}

export interface CartItem {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  unit: UnitType;
  qty: number;
  price: number;
  category: string;
  discountValue?: number;
  discountLabel?: string;
  imageData?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discounts: number;
  vat: number;
  total: number;
  lines: number;
  produceWeight: number;
  pieceCount: number;
}

export interface PaymentMethod {
  label: string;
  icon: LucideIcon;
}

export type OrderStatus = "Awaiting pickup" | "Being prepared" | "Ready";

export interface PendingOrder {
  id: string;
  customer: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
  promisedAt: string;
}

export interface InventorySnapshot {
  category: string;
  skuCount: number;
  lowStockSku: number;
  lastAudit: string;
}

export type LoyaltyTier = "Silver" | "Gold" | "Platinum";

export interface LoyaltyMember {
  id: string;
  name: string;
  tier: LoyaltyTier;
  points: number;
  lastVisit: string;
  phone: string;
}

export interface SettingOption {
  name: string;
  description: string;
  actionLabel: string;
}

export type UserRole = "Manager" | "Seller" | "Inventory";

export interface AccountProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email: string;
  avatarInitials: string;
  shift: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: UnitType;
  price: number;
  sellPrice?: number;
  buyPrice?: number;
  stockQty: number;
  minQty?: number;
  barcode?: string;
  expirationDate?: string;
  imageData?: string;
}

export interface PurchaseLineItem {
  sku: string;
  name: string;
  qty: number;
  unit: UnitType;
  price: number;
}

export interface PurchaseHistoryEntry {
  id: string;
  cashier: string;
  total: number;
  items: number;
  paymentMethod: string;
  completedAt: string;
  customerName?: string;
  customerId?: string;
  notes?: string;
  lineItems?: PurchaseLineItem[];
}

export type AuditAction = "create" | "update" | "delete" | "import" | "undo";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actor: string;
  summary: string;
  details?: string[];
  timestamp: string;
}

export type PromotionStatus = "Queued" | "Active" | "Expired";

export interface Promotion {
  id: string;
  sku: string;
  productName: string;
  discountPercent: number;
  createdAt: string;
  expiresAt?: string;
  status: PromotionStatus;
  source?: string;
  notes?: string;
  triggeredBy?: string;
}
