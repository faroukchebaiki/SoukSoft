import type { UnitType } from "@/types";

export function formatCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} DA`;
}

export function formatQuantity(value: number, unit: UnitType) {
  if (unit === "kg") {
    return `${value.toFixed(2)} kg`;
  }
  return `${value} pcs`;
}
