import { AccountsPage } from "@/pages/AccountsPage";
import { AdminSettings } from "@/pages/AdminSettings";
import { AllItems } from "@/pages/AllItems";
import { CounterPage } from "@/pages/CounterPage";
import { ExpiringProducts } from "@/pages/ExpiringProducts";
import { ProductBuilder } from "@/pages/ProductBuilder";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { Settings } from "@/pages/Settings";
import { TeamPage } from "@/pages/TeamPage";
import type {
  AccountProfile,
  CatalogProduct,
  CreateAccountPayload,
  PurchaseHistoryEntry,
  Section,
  SettingOption,
  WorkerProfile,
  UpdateAccountPayload,
} from "@/types";

/**
 * Guarded switchboard that renders the active section or a restricted message.
 */
export function SectionContent({
  section,
  allowedSections,
  activeUser,
  catalogData,
  purchaseHistoryEntries,
  personalSettingsOptions,
  generalSettingsOptions,
  accounts,
  workers,
  onSaveWorker,
  onDeleteWorker,
  onCreateAccount,
  onUpdateAccount,
  onArchiveAccount,
  onDeleteAccount,
  onGoHome,
}: {
  section: Section;
  allowedSections: Section[];
  activeUser: AccountProfile;
  catalogData: CatalogProduct[];
  purchaseHistoryEntries: PurchaseHistoryEntry[];
  personalSettingsOptions: SettingOption[];
  generalSettingsOptions: SettingOption[];
  accounts: AccountProfile[];
  workers: WorkerProfile[];
  onSaveWorker: (worker: WorkerProfile) => void;
  onDeleteWorker: (id: string) => void;
  onCreateAccount: (payload: CreateAccountPayload) => { success: boolean; error?: string; account?: AccountProfile };
  onUpdateAccount: (payload: UpdateAccountPayload) => { success: boolean; error?: string };
  onArchiveAccount: (id: string, archived: boolean) => void;
  onDeleteAccount: (id: string) => { success: boolean; error?: string };
  onGoHome: () => void;
}) {
  if (!allowedSections.includes(section)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-2xl font-semibold">Access restricted</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This section requires elevated permissions. Switch to a manager account to continue.
        </p>
      </div>
    );
  }

  switch (section) {
    case "Counter":
      return (
        <CounterPage
          availableProducts={catalogData}
          onGoHome={onGoHome}
          cashierName={activeUser.name}
        />
      );
    case "All items":
      return <AllItems products={catalogData} onGoHome={onGoHome} />;
    case "History":
      return (
        <PurchaseHistory
          entries={purchaseHistoryEntries}
          onGoHome={onGoHome}
        />
      );
    case "Settings":
      return (
        <Settings
          profile={activeUser}
          worker={workers.find((worker) => worker.id === activeUser.id)}
          personalOptions={personalSettingsOptions}
          onGoHome={onGoHome}
        />
      );
    case "Admin settings":
      return <AdminSettings options={generalSettingsOptions} onGoHome={onGoHome} />;
    case "Accounts":
      return (
        <AccountsPage
          accounts={accounts}
          onCreateAccount={onCreateAccount}
          onUpdateAccount={onUpdateAccount}
          onArchiveAccount={onArchiveAccount}
          onDeleteAccount={onDeleteAccount}
          onGoHome={onGoHome}
        />
      );
    case "Team":
      return (
        <TeamPage
          accounts={accounts}
          workers={workers}
          onSaveWorker={onSaveWorker}
          onDeleteWorker={onDeleteWorker}
          onGoHome={onGoHome}
        />
      );
    case "Expiring items":
      return <ExpiringProducts products={catalogData} onGoHome={onGoHome} />;
    case "Product builder":
      return <ProductBuilder onGoHome={onGoHome} />;
    default:
      return null;
  }
}
