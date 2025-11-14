import {
  ChevronLeft,
  ChevronRight,
  Star,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SECTION,
  cartItems,
  navigation,
  catalogProducts,
  purchaseHistory,
  settingsOptions,
  userProfiles,
  DEFAULT_USER_ID,
} from "@/data/mockData";
import { cn } from "@/lib/utils";
import type { Section, UserRole } from "@/types";
import { AllItems } from "@/pages/AllItems";
import { MainPage } from "@/pages/MainPage";
import { ProductBuilder } from "@/pages/ProductBuilder";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { Settings } from "@/pages/Settings";
import { ExpiringProducts } from "@/pages/ExpiringProducts";

const USER_STORAGE_KEY = "souksoft-active-user";
const USER_DEFAULT_SECTION_PREFS_KEY = "souksoft-user-default-section-prefs";

const rolePermissions: Record<UserRole, Section[]> = {
  Manager: ["Main page", "All items", "History", "Settings", "Expiring items", "Product builder"],
  Seller: ["Main page", "History"],
  Inventory: ["All items", "Expiring items", "Product builder"],
};

function resolveStoredUserId() {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  const stored = window.localStorage.getItem(USER_STORAGE_KEY);
  return stored && userProfiles.some((user) => user.id === stored) ? stored : DEFAULT_USER_ID;
}

type DefaultSectionPrefs = Partial<Record<string, Section>>;

function readDefaultSectionPrefs(): DefaultSectionPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_DEFAULT_SECTION_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DefaultSectionPrefs;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string>(() => resolveStoredUserId());
  const [defaultSectionPrefs, setDefaultSectionPrefs] = useState<DefaultSectionPrefs>(() =>
    readDefaultSectionPrefs(),
  );

  const activeUser = useMemo(
    () => userProfiles.find((user) => user.id === activeUserId) ?? userProfiles[0],
    [activeUserId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_STORAGE_KEY, activeUser.id);
  }, [activeUser.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      USER_DEFAULT_SECTION_PREFS_KEY,
      JSON.stringify(defaultSectionPrefs),
    );
  }, [defaultSectionPrefs]);

  useEffect(() => {
    const allowed = rolePermissions[activeUser.role];
    const storedDefault = defaultSectionPrefs[activeUser.id];
    const targetSection =
      storedDefault && allowed.includes(storedDefault)
        ? storedDefault
        : allowed.includes(activeSection)
          ? activeSection
          : allowed[0] ?? DEFAULT_SECTION;
    if (targetSection !== activeSection) {
      setActiveSection(targetSection);
    }
  }, [activeUser.id, activeUser.role, activeSection, defaultSectionPrefs]);

  const allowedSections = rolePermissions[activeUser.role];
  const userDefaultSection = defaultSectionPrefs[activeUser.id];

  const renderSection = () => {
    if (!allowedSections.includes(activeSection)) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <h2 className="text-2xl font-semibold">Access restricted</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            This section requires elevated permissions. Switch to a manager account to continue.
          </p>
        </div>
      );
    }

    switch (activeSection) {
      case "Main page":
        return (
          <MainPage
            initialCartItems={cartItems}
            availableProducts={catalogProducts}
          />
        );
      case "All items":
        return <AllItems products={catalogProducts} />;
      case "History":
        return <PurchaseHistory entries={purchaseHistory} />;
      case "Settings":
        return <Settings options={settingsOptions} />;
      case "Expiring items":
        return <ExpiringProducts />;
      case "Product builder":
        return <ProductBuilder />;
      default:
        return null;
    }
  };

  const handleUserChange = (userId: string) => {
    setActiveUserId(userId);
  };

  const handleSaveDefaultSection = () => {
    setDefaultSectionPrefs((prev) => ({
      ...prev,
      [activeUser.id]: activeSection,
    }));
  };

  return (
    <div className="flex h-screen min-w-[1100px] overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "sidebar-shell sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300",
          navCollapsed ? "w-24" : "w-72",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-border/60 px-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg">
            <Store className="h-5 w-5" />
          </div>
          {!navCollapsed && (
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
                SoukSoft
              </p>
              <h1 className="text-lg font-semibold text-foreground">Front counter OS</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted/40"
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

        {!navCollapsed && (
          <div className="mx-4 mt-5 glass-panel p-4 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Star className="h-4 w-4 text-amber-300" />
              Elite register stack
            </div>
            <p className="mt-2 text-sm normal-case text-foreground/80">
              Seamless baskets, live stock, and loyalty intelligence in one surface.
            </p>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navigation
            .filter(({ label }) => rolePermissions[activeUser.role].includes(label))
            .map(({ label, icon: Icon }) => {
              const isActive = activeSection === label;
              return (
                <Button
                  key={label}
                  variant="ghost"
                  title={label}
                  className={cn(
                    "group relative w-full rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40",
                    navCollapsed ? "justify-center" : "justify-start gap-3",
                    isActive
                      ? "border-primary/70 bg-primary/10 text-primary hover:bg-primary/15"
                      : "hover:border-muted hover:bg-muted/40 hover:text-foreground",
                  )}
                  onClick={() => setActiveSection(label)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "absolute inset-y-3 left-2 w-[3px] rounded-full bg-primary opacity-0 transition-opacity duration-200 group-hover:opacity-50",
                      isActive ? "opacity-100" : undefined,
                    )}
                  />
                <Icon className="h-4 w-4" />
                {!navCollapsed && (
                  <span className="flex-1 truncate">
                    {label}
                    {userDefaultSection === label ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] uppercase text-primary">
                        Default
                      </span>
                    ) : null}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
        <div className="px-4 pb-5">
          <div
            className={cn(
              "glass-panel p-4 text-sm text-muted-foreground transition-all",
              navCollapsed ? "items-center justify-center p-2 text-center" : "space-y-3",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
                {activeUser.avatarInitials}
              </div>
              {!navCollapsed && (
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeUser.name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {activeUser.role} · {activeUser.shift}
                  </p>
                </div>
              )}
            </div>
            {!navCollapsed && (
              <>
                <p className="text-xs leading-tight text-muted-foreground">
                  {activeUser.email}
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Switch account
                  </p>
                  <select
                    value={activeUser.id}
                    onChange={(event) => handleUserChange(event.target.value)}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                  >
                    {userProfiles.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Default view
                  </p>
                  <p className="text-sm text-foreground">
                    {userDefaultSection ?? allowedSections[0] ?? "—"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleSaveDefaultSection}
                    disabled={userDefaultSection === activeSection}
                  >
                    Set current as default
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                    onClick={() => setActiveSection("Settings")}
                  >
                    Account center
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">{renderSection()}</div>
      </div>
    </div>
  );
}
