import type { UnitType } from "@/types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number, unit: UnitType) {
  if (unit === "kg") {
    return `${value.toFixed(2)} kg`;
  }
  return `${value} pcs`;
}
