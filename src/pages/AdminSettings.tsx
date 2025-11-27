import { useEffect, useMemo, useState } from "react";
import { Building2, Home, ReceiptText, Shield, ShieldPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ReceiptPreview, type ReceiptPreviewItem } from "@/components/receipt/ReceiptPreview";
import type { ReceiptSettings, SettingOption } from "@/types";

interface AdminSettingsProps {
  options: SettingOption[];
  receiptSettings: ReceiptSettings;
  onUpdateReceiptSettings: (partial: Partial<ReceiptSettings>) => void;
  onResetReceiptSettings: () => void;
  onGoHome?: () => void;
}

const tabLabels = ["Store info", "Receipts", "Permissions"] as const;

const defaultSections = ["Counter", "All items", "History", "Settings", "Admin settings", "Accounts"];

const demoReceiptItems: ReceiptPreviewItem[] = [
  { name: "Kabylie olive oil 1L", qty: 2, unit: "pcs", price: 950, sku: "PAN-OLI-11" },
  { name: "Fresh mint bunch", qty: 3, unit: "pcs", price: 120, sku: "PROD-HER-12" },
  { name: "Medjool dates", qty: 1.2, unit: "kg", price: 1600, sku: "PAN-DAT-22" },
];

export function AdminSettings({
  options,
  receiptSettings,
  onUpdateReceiptSettings,
  onResetReceiptSettings,
  onGoHome,
}: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabLabels)[number]>("Store info");
  const [timezone, setTimezone] = useState("Africa/Algiers");
  const [currency, setCurrency] = useState("DZD");
  const [customRoles] = useState([
    { name: "Seller+", inherits: "Seller", extras: ["Inventory access"] },
    { name: "Inventory+", inherits: "Inventory", extras: ["Expiring items", "Product builder"] },
  ]);
  const [roleToggles, setRoleToggles] = useState({
    managerCanOverride: true,
    sellerCanInventory: true,
    inventoryCanSell: false,
  });
  const [pageAccess, setPageAccess] = useState<Record<string, string[]>>(() => ({
    lina: ["Counter", "All items", "Admin settings", "Accounts"],
    karim: ["Counter", "History"],
    nadia: ["All items", "Expiring items", "Product builder"],
  }));

  useEffect(() => {
    if (!onGoHome) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onGoHome();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onGoHome]);

  const renderTabs = useMemo(
    () =>
      tabLabels.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => setActiveTab(label)}
          className={`flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2 text-sm transition hover:-translate-y-[1px] hover:border-primary/50 hover:text-primary ${
            activeTab === label
              ? "bg-card text-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground border-border"
          }`}
        >
          {label}
        </button>
      )),
    [activeTab],
  );

  const togglePageAccess = (userKey: string, section: string) => {
    setPageAccess((prev) => {
      const current = (prev[userKey] ?? []) as string[];
      const hasSection = current.includes(section);
      const next = hasSection ? current.filter((s) => s !== section) : [...current, section];
      return { ...prev, [userKey]: next };
    });
  };

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin settings</h1>
          <p className="text-sm text-muted-foreground">
            Store-wide controls for managers: branding, permissions, and access rules.
          </p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home (Esc)
        </Button>
      </div>

      <Card className="flex h-[calc(100vh-170px)] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-4 pt-3">
          {renderTabs}
        </div>
        <CardContent className="flex-1 overflow-auto p-4">
          {activeTab === "Store info" ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <div className="space-y-4 rounded-xl border bg-card/70 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <CardTitle className="text-base">Store identity</CardTitle>
                    <CardDescription>Basics shown on receipts and the POS header.</CardDescription>
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Store name
                  <input
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={receiptSettings.storeName}
                    onChange={(event) => onUpdateReceiptSettings({ storeName: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Address line 1
                  <input
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={receiptSettings.addressLine1 ?? ""}
                    onChange={(event) => onUpdateReceiptSettings({ addressLine1: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Address line 2
                  <input
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={receiptSettings.addressLine2 ?? ""}
                    onChange={(event) => onUpdateReceiptSettings({ addressLine2: event.target.value })}
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Timezone
                    <select
                      className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                    >
                      <option value="Africa/Algiers">Africa/Algiers</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Currency
                    <select
                      className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                    >
                      <option value="DZD">DZD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Receipt footer</Badge>
                  <Badge variant="outline">Brand color</Badge>
                  <Badge variant="outline">Store logo</Badge>
                </div>
                <Button className="rounded-full">Save changes</Button>
              </div>
              <div className="space-y-3 rounded-xl border bg-card/70 p-4 shadow-sm">
                <CardTitle className="text-base">Device & printer</CardTitle>
                <CardDescription className="text-sm">
                  Quick links to pair devices and update firmware.
                </CardDescription>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {options.slice(0, 3).map((option) => (
                    <div key={option.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <div className="font-medium text-foreground">{option.name}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                      <Button variant="outline" size="sm">
                        {option.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "Receipts" ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 rounded-xl border bg-card/70 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  <div>
                    <CardTitle className="text-base">Receipt layout</CardTitle>
                    <CardDescription>What customers see on printed tickets.</CardDescription>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Phone
                    <input
                      className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={receiptSettings.phone ?? ""}
                      onChange={(event) => onUpdateReceiptSettings({ phone: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Website
                    <input
                      className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={receiptSettings.website ?? ""}
                      onChange={(event) => onUpdateReceiptSettings({ website: event.target.value })}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Tax ID / RC
                  <input
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={receiptSettings.taxId ?? ""}
                    onChange={(event) => onUpdateReceiptSettings({ taxId: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Thanks message
                  <input
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={receiptSettings.thanksMessage ?? ""}
                    onChange={(event) =>
                      onUpdateReceiptSettings({ thanksMessage: event.target.value })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm font-medium transition hover:border-primary/40">
                  <div className="flex flex-col">
                    <span>Show preview before printing</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Toggle off to send receipts directly to the paired printer.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={receiptSettings.showPrintPreview !== false}
                    onChange={(event) =>
                      onUpdateReceiptSettings({ showPrintPreview: event.target.checked })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Footer note
                  <textarea
                    className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    rows={3}
                    value={receiptSettings.footerNote ?? ""}
                    onChange={(event) =>
                      onUpdateReceiptSettings({ footerNote: event.target.value })
                    }
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Changes are saved automatically for the POS.</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onResetReceiptSettings}>
                      Reset defaults
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border bg-card/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Live preview</CardTitle>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    80mm ticket
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  Matches what prints from the register when you tap “Reçu”.
                </CardDescription>
                <div className="max-h-[520px] overflow-auto px-1">
                  <ReceiptPreview
                    settings={receiptSettings}
                    items={demoReceiptItems}
                    cashier="Lina B."
                    customer="Walk-in guest"
                    paymentMethod="Cash"
                    completedAt="12:45"
                    receiptId="RCPT-1001"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "Permissions" ? (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4 rounded-xl border bg-card/70 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <CardTitle className="text-base">Role tweaks</CardTitle>
                    <CardDescription>Blend roles by turning on extra capabilities.</CardDescription>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      key: "managerCanOverride",
                      label: "Managers override all restrictions",
                      detail: "Needed for audits and off-hour fixes.",
                    },
                    {
                      key: "sellerCanInventory",
                      label: "Sellers can manage inventory",
                      detail: "Allows stock adjustments without switching accounts.",
                    },
                    {
                      key: "inventoryCanSell",
                      label: "Inventory can access POS",
                      detail: "Lets inventory staff ring sales during rush hours.",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2 transition hover:border-primary/40"
                    >
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.detail}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={roleToggles[item.key as keyof typeof roleToggles]}
                        onChange={(event) =>
                          setRoleToggles((prev) => ({
                            ...prev,
                            [item.key]: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldPlus className="h-4 w-4 text-primary" />
                    Custom roles
                  </div>
                  <div className="space-y-2 text-sm">
                    {customRoles.map((role) => (
                      <div
                        key={role.name}
                        className="rounded-lg border bg-background px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{role.name}</div>
                          <Badge variant="outline" className="rounded-full text-[11px]">
                            Inherits {role.inherits}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Extra access: {role.extras.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4 rounded-xl border bg-card/70 p-4 shadow-sm">
                <CardTitle className="text-base">Per-account page access</CardTitle>
                <CardDescription className="text-sm">
                  Allow specific sections for individual teammates.
                </CardDescription>
                <div className="space-y-3 text-sm">
                  {Object.entries(pageAccess).map(([userKey, sections]) => (
                    <div key={userKey} className="rounded-lg border bg-background px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold capitalize">{userKey}</div>
                        <Badge variant="secondary" className="rounded-full text-[11px]">
                          {sections.length} allowed
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {defaultSections.map((section) => (
                          <label key={section} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={sections.includes(section)}
                              onChange={() => togglePageAccess(userKey, section)}
                            />
                            <span>{section}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

        </CardContent>
      </Card>
    </main>
  );
}
