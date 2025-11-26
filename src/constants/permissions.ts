import type { Section, UserRole } from "@/types";

/**
 * Declarative permission map that lists which sections every role can open.
 */
export const rolePermissions: Record<UserRole, Section[]> = {
  Manager: [
    "Counter",
    "All items",
    "History",
    "Settings",
    "Admin settings",
    "Accounts",
    "Team",
    "Expiring items",
    "Product builder",
  ],
  Seller: ["Counter", "History", "Settings"],
  Inventory: ["All items", "Expiring items", "Product builder", "Settings"],
};

/**
 * Helper to get the allowed sections for a given role with a safe fallback.
 */
export function getAllowedSections(role: UserRole): Section[] {
  return rolePermissions[role] ?? [];
}
