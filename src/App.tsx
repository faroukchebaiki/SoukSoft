import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SECTION,
  cartItems,
  navigation,
  catalogProducts,
  paymentMethods,
  purchaseHistory,
  settingsOptions,
} from "@/data/mockData";
import { cn } from "@/lib/utils";
import type { Section } from "@/types";
import { MainPage } from "@/pages/MainPage";
import { AllItems } from "@/pages/AllItems";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { Settings } from "@/pages/Settings";

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "Main page":
        return (
          <MainPage
            initialCartItems={cartItems}
            paymentMethods={paymentMethods}
            availableProducts={catalogProducts}
          />
        );
      case "All items":
        return <AllItems products={catalogProducts} />;
      case "History":
        return <PurchaseHistory entries={purchaseHistory} />;
      case "Settings":
        return <Settings options={settingsOptions} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen min-w-[1100px] overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card/30 transition-[width] duration-300",
          navCollapsed ? "w-24" : "w-64",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          {!navCollapsed && <h1 className="text-lg font-semibold">SoukSoft</h1>}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 shrink-0"
            aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setNavCollapsed((prev) => !prev)}
          >
            {navCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navigation.map(({ label, icon: Icon }) => {
            const isActive = activeSection === label;
            return (
              <Button
                key={label}
                variant="ghost"
                title={label}
                className={cn(
                  "group relative w-full rounded-md px-4 py-2 text-sm transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-primary/40",
                  navCollapsed ? "justify-center" : "justify-start gap-3",
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
                {!navCollapsed && <span className="truncate">{label}</span>}
              </Button>
            );
          })}
        </nav>
        <div className="border-t px-3 py-4 text-center text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {navCollapsed ? "v1.0.0" : "Version 1.0.0"}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">{renderSection()}</div>
      </div>
    </div>
  );
}
