import { Store } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SECTION,
  cartItems,
  inventorySnapshots,
  loyaltyMembers,
  navigation,
  paymentMethods,
  pendingOrders,
  quickActions,
  settingsOptions,
  VAT_RATE,
} from "@/data/mockData";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CheckoutTotals, Section } from "@/types";
import { LoyaltyCustomers } from "@/pages/LoyaltyCustomers";
import { PendingOrders } from "@/pages/PendingOrders";
import { QuickCheckout } from "@/pages/QuickCheckout";
import { Settings } from "@/pages/Settings";
import { StoreInventory } from "@/pages/StoreInventory";

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);

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
          <QuickCheckout
            cartItems={cartItems}
            totals={totals}
            totalDisplayValue={totalDisplayValue}
            quickActions={quickActions}
            paymentMethods={paymentMethods}
          />
        );
      case "Pending orders":
        return <PendingOrders orders={pendingOrders} />;
      case "Store inventory":
        return <StoreInventory inventory={inventorySnapshots} />;
      case "Loyalty customers":
        return <LoyaltyCustomers members={loyaltyMembers} />;
      case "Settings":
        return <Settings options={settingsOptions} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen min-w-[1200px] bg-background text-foreground">
      <aside className="flex w-80 shrink-0 flex-col border-r bg-card/30">
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
          {navigation.map(({ label, icon: Icon }) => {
            const isActive = activeSection === label;
            return (
              <Button
                key={label}
                variant="ghost"
                className={cn(
                  "group relative w-full justify-start gap-3 rounded-md px-5 py-2 text-sm transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "translate-x-1 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                )}
                onClick={() => setActiveSection(label)}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "absolute inset-y-1 left-1 w-[3px] rounded-full bg-primary opacity-0 transition-opacity duration-200 group-hover:opacity-50",
                    isActive ? "opacity-100" : undefined,
                  )}
                />
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">{renderSection()}</div>
    </div>
  );
}
