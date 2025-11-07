import type { LucideIcon } from "lucide-react";

export type UnitType = "kg" | "pcs";

export type Section = "Main page" | "All items" | "History" | "Settings";

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

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: UnitType;
  price: number;
  stockQty: number;
  minQty?: number;
  barcode?: string;
}

export interface PurchaseHistoryEntry {
  id: string;
  cashier: string;
  total: number;
  items: number;
  paymentMethod: string;
  completedAt: string;
}
