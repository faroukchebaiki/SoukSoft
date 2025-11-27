import { useEffect, useMemo, useState } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { SectionContent } from "@/components/layout/SectionContent";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DEFAULT_SECTION,
  DEFAULT_USER_ID,
  generalSettingsOptions,
  navigation,
  personalSettingsOptions,
  purchaseHistory,
} from "@/data/mockData";
import { useAccounts } from "@/hooks/useAccounts";
import { useActiveUser } from "@/hooks/useActiveUser";
import { useCatalogProducts } from "@/hooks/useCatalogProducts";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import { useWorkers } from "@/hooks/useWorkers";
import { validateLogin } from "@/lib/auth";
import { readDefaultSectionPrefs, resolvePreferredSection } from "@/lib/preferences";
import type { LoginPayload, RegisterPayload, Section } from "@/types";

/**
 * Root application shell that wires together authentication, navigation, and section routing.
 */
export default function App() {
  const { accounts, hasManager, createAccount, updateAccount, archiveAccount, deleteAccount } = useAccounts();
  const { workers, upsertWorker, deleteWorker } = useWorkers(accounts);
  const { catalogData } = useCatalogProducts();
  const { activeUser, setActiveUserId, allowedSections } = useActiveUser(accounts, DEFAULT_USER_ID);
  const {
    settings: receiptSettings,
    updateSettings: updateReceiptSettings,
    resetSettings: resetReceiptSettings,
  } = useReceiptSettings();
  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [showSectionGrid, setShowSectionGrid] = useState(true);
  const [defaultSectionPrefs] = useState(() => readDefaultSectionPrefs());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUser) return;
    const targetSection = resolvePreferredSection({
      userId: activeUser.id,
      allowedSections,
      preferredByUser: defaultSectionPrefs,
      currentSection: activeSection,
      fallbackSection: DEFAULT_SECTION,
    });
    if (targetSection !== activeSection) {
      setActiveSection(targetSection);
    }
  }, [activeUser, allowedSections, defaultSectionPrefs, activeSection]);

  useEffect(() => {
    if (hasManager && authMode === "register") {
      setAuthMode("login");
    }
  }, [hasManager, authMode]);

  /**
   * Authenticate an existing user.
   */
  const handleLogin = (payload: LoginPayload) => {
    const result = validateLogin(accounts, payload);
    if (!result.success || !result.account) {
      setAuthError(result.error ?? "Invalid username or password.");
      return;
    }
    setActiveUserId(result.account.id);
    setAuthError(null);
    setShowSectionGrid(true);
  };

  /**
   * Register the first manager account on this device.
   */
  const handleRegister = (payload: RegisterPayload) => {
    if (payload.password !== payload.confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    const trimmedUsername = payload.username.trim();
    if (!trimmedUsername || !payload.firstName.trim() || !payload.lastName.trim()) {
      setAuthError("Please complete all required fields.");
      return;
    }
    const result = createAccount({
      firstName: payload.firstName,
      lastName: payload.lastName,
      username: trimmedUsername,
      email: `${trimmedUsername.toLowerCase()}@souksoft.local`,
      role: "Manager",
      password: payload.password,
      shift: "08:00 - 16:00",
    });
    if (!result.success || !result.account) {
      setAuthError(result.error ?? "Could not create account.");
      return;
    }
    setActiveUserId(result.account.id);
    setAuthError(null);
    setShowSectionGrid(true);
  };

  /**
   * Clear session and return to the entry screen.
   */
  const handleLogout = () => {
    setActiveUserId(null);
    setAuthMode("login");
    setAuthError(null);
    setShowSectionGrid(true);
  };

  /**
   * Switch visible content to the chosen section.
   */
  const handleSelectSection = (section: Section) => {
    setActiveSection(section);
    setShowSectionGrid(false);
  };

  /**
   * Navigate back to the grid landing view.
   */
  const handleGoHome = () => setShowSectionGrid(true);

  const sectionCards = useMemo(
    () => navigation.filter(({ label }) => allowedSections.includes(label)),
    [allowedSections],
  );

  if (!activeUser) {
    return (
      <AuthScreen
        mode={authMode}
        canRegister={!hasManager}
        error={authError}
        onModeToggle={() => {
          setAuthMode((previous) => (previous === "login" ? "register" : "login"));
          setAuthError(null);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {showSectionGrid ? (
        <header className="flex items-center justify-between px-6 py-4">
          <UserMenu
            activeUser={activeUser}
            accounts={accounts}
            allowedSections={allowedSections}
            onSelectSettings={() => handleSelectSection("Settings")}
            onSwitchUser={(id) => {
              setActiveUserId(id);
              setShowSectionGrid(true);
            }}
            onLogout={handleLogout}
          />
          <ThemeToggle />
        </header>
      ) : null}
      <main className={showSectionGrid ? "flex flex-1 flex-col px-8 py-6" : "flex flex-1 flex-col p-0"}>
        {showSectionGrid ? (
          <SectionGrid
            items={sectionCards}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
          />
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-hidden">
              <SectionContent
                section={activeSection}
                allowedSections={allowedSections}
                activeUser={activeUser}
                catalogData={catalogData}
                purchaseHistoryEntries={purchaseHistory}
                personalSettingsOptions={personalSettingsOptions}
                generalSettingsOptions={generalSettingsOptions}
                accounts={accounts}
                workers={workers}
                receiptSettings={receiptSettings}
                onSaveWorker={upsertWorker}
                onDeleteWorker={deleteWorker}
                onCreateAccount={createAccount}
                onUpdateAccount={updateAccount}
                onArchiveAccount={archiveAccount}
                onDeleteAccount={deleteAccount}
                onUpdateReceiptSettings={updateReceiptSettings}
                onResetReceiptSettings={resetReceiptSettings}
                onGoHome={handleGoHome}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
