import { ChevronDown, Store } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SECTION,
  navigation,
  purchaseHistory,
  settingsOptions,
  userProfiles,
  DEFAULT_USER_ID,
} from "@/data/mockData";
import { cn } from "@/lib/utils";
import { getStoredProducts, PRODUCT_STORAGE_EVENT, STORAGE_KEY } from "@/lib/productStorage";
import type { AccountProfile, CatalogProduct, Section, UserRole } from "@/types";
import { AllItems } from "@/pages/AllItems";
import { CounterPage } from "@/pages/CounterPage";
import { ProductBuilder } from "@/pages/ProductBuilder";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { Settings } from "@/pages/Settings";
import { ExpiringProducts } from "@/pages/ExpiringProducts";

const USER_STORAGE_KEY = "souksoft-active-user";
const ACCOUNTS_STORAGE_KEY = "souksoft-accounts";
const USER_DEFAULT_SECTION_PREFS_KEY = "souksoft-user-default-section-prefs";

const rolePermissions: Record<UserRole, Section[]> = {
  Manager: ["Counter", "All items", "History", "Settings", "Expiring items", "Product builder"],
  Seller: ["Counter", "History"],
  Inventory: ["All items", "Expiring items", "Product builder"],
};

function resolveStoredUserId(accounts: AccountProfile[]) {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  const stored = window.localStorage.getItem(USER_STORAGE_KEY);
  return stored && accounts.some((user) => user.id === stored)
    ? stored
    : accounts[0]?.id ?? DEFAULT_USER_ID;
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

function readStoredAccounts(): AccountProfile[] {
  if (typeof window === "undefined") return userProfiles;
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(userProfiles));
      return userProfiles;
    }
    const parsed = JSON.parse(raw) as AccountProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(userProfiles));
      return userProfiles;
    }
    return parsed;
  } catch {
    return userProfiles;
  }
}

export default function App() {
  const initialAccountsRef = useRef<AccountProfile[] | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  if (initialAccountsRef.current === null) {
    initialAccountsRef.current = readStoredAccounts();
  }

  const [accounts, setAccounts] = useState<AccountProfile[]>(initialAccountsRef.current);
  const [activeSection, setActiveSection] = useState<Section>(DEFAULT_SECTION);
  const [showSectionGrid, setShowSectionGrid] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    resolveStoredUserId(initialAccountsRef.current ?? userProfiles),
  );
  const [defaultSectionPrefs] = useState<DefaultSectionPrefs>(() => readDefaultSectionPrefs());
  const [catalogData, setCatalogData] = useState<CatalogProduct[]>(() => getStoredProducts());

  const activeUser = useMemo(
    () => accounts.find((user) => user.id === activeUserId) ?? null,
    [accounts, activeUserId],
  );
  const hasManager = accounts.some((user) => user.role === "Manager");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (!accounts.length) {
      setActiveUserId(null);
      return;
    }
    if (activeUserId && accounts.some((account) => account.id === activeUserId)) {
      return;
    }
    setActiveUserId(accounts[0].id);
  }, [accounts, activeUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeUserId) {
      window.localStorage.setItem(USER_STORAGE_KEY, activeUserId);
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncCatalog = () => {
      setCatalogData(getStoredProducts());
    };
    syncCatalog();
    window.addEventListener(PRODUCT_STORAGE_EVENT, syncCatalog);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncCatalog();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PRODUCT_STORAGE_EVENT, syncCatalog);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!activeUser) return;
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
  }, [activeUser, activeSection, defaultSectionPrefs]);

  const allowedSections = activeUser ? rolePermissions[activeUser.role] : [];
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (hasManager && authMode === "register") {
      setAuthMode("login");
    }
  }, [hasManager, authMode]);

  useEffect(() => {
    if (!showSectionGrid) {
      setIsUserMenuOpen(false);
    }
  }, [showSectionGrid]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  const handleLogin = ({ username, password }: LoginPayload) => {
    const normalized = username.trim().toLowerCase();
    const account = accounts.find(
      (user) => user.username.toLowerCase() === normalized && user.password === password,
    );
    if (!account) {
      setAuthError("Invalid username or password.");
      return;
    }
    setActiveUserId(account.id);
    setAuthError(null);
    setShowSectionGrid(true);
  };

  const handleRegister = ({
    firstName,
    lastName,
    username,
    password,
    confirmPassword,
  }: RegisterPayload) => {
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || !firstName.trim() || !lastName.trim()) {
      setAuthError("Please complete all required fields.");
      return;
    }
    if (accounts.some((user) => user.username.toLowerCase() === trimmedUsername)) {
      setAuthError("Username already exists.");
      return;
    }
    const newAccount: AccountProfile = {
      id: crypto.randomUUID?.() ?? `USR-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: trimmedUsername,
      password,
      name: `${firstName.trim()} ${lastName.trim()}`,
      role: "Manager",
      email: `${trimmedUsername}@souksoft.local`,
      avatarInitials: `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase(),
      shift: "08:00 - 16:00",
    };
    setAccounts((prev) => [...prev, newAccount]);
    setActiveUserId(newAccount.id);
    setAuthError(null);
    setShowSectionGrid(true);
  };

  const handleLogout = () => {
    setActiveUserId(null);
    setAuthMode("login");
    setAuthError(null);
    setShowSectionGrid(true);
  };

  if (!activeUser) {
    return (
      <AuthScreen
        mode={authMode}
        canRegister={!hasManager}
        error={authError}
        onModeToggle={() => {
          setAuthMode((prev) => (prev === "login" ? "register" : "login"));
          setAuthError(null);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  const renderSection = () => {
    if (!activeUser) return null;
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
      case "Counter":
        return (
          <CounterPage
            availableProducts={catalogData}
            onGoHome={() => setShowSectionGrid(true)}
            cashierName={activeUser.name}
          />
        );
      case "All items":
        return <AllItems products={catalogData} />;
      case "History":
        return <PurchaseHistory entries={purchaseHistory} />;
      case "Settings":
        return <Settings options={settingsOptions} />;
      case "Expiring items":
        return <ExpiringProducts products={catalogData} />;
      case "Product builder":
        return <ProductBuilder />;
      default:
        return null;
    }
  };

  const sectionCards = navigation.filter(({ label }) => allowedSections.includes(label));

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {showSectionGrid ? (
        <header className="px-6 py-4">
          <div className="relative inline-flex" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full border border-border/50 bg-card px-3 py-2 shadow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Store className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">
                  {activeUser.firstName} {activeUser.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{activeUser.role}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isUserMenuOpen ? "rotate-180" : "",
                )}
              />
            </button>
            {isUserMenuOpen ? (
              <div className="absolute left-0 top-full z-20 mt-3 w-72 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={!allowedSections.includes("Settings")}
                    onClick={() => {
                      if (allowedSections.includes("Settings")) {
                        setActiveSection("Settings");
                        setShowSectionGrid(false);
                        setIsUserMenuOpen(false);
                      }
                    }}
                  >
                    Settings
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Log out
                  </Button>
                </div>
                <div className="mt-4 border-t border-border/60 pt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  Users on this device
                </div>
                <ul className="mt-2 space-y-1">
                  {accounts.map((account) => (
                    <li key={account.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                          account.id === activeUser.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-primary/10 hover:text-primary",
                        )}
                        disabled={account.id === activeUser.id}
                        onClick={() => {
                          setActiveUserId(account.id);
                          setShowSectionGrid(true);
                          setIsUserMenuOpen(false);
                        }}
                      >
                        <span>
                          {account.firstName} {account.lastName}
                        </span>
                        <span className="text-xs uppercase text-muted-foreground">{account.role}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}
      <main className={cn("flex flex-1 flex-col", showSectionGrid ? "px-8 py-6" : "p-0")}>
        {showSectionGrid ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Choose where to go</h2>
              <p className="text-sm text-muted-foreground">
                You have access to {allowedSections.length} section
                {allowedSections.length === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sectionCards.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveSection(label);
                    setShowSectionGrid(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-3xl border border-border/60 bg-card/70 px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
                    label === activeSection ? "border-primary/70 bg-primary/10" : "",
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {label === activeSection ? "Current view" : "Open view"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-hidden">{renderSection()}</div>
          </div>
        )}
      </main>
    </div>
  );
}

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface AuthScreenProps {
  mode: "login" | "register";
  canRegister: boolean;
  error: string | null;
  onModeToggle: () => void;
  onLogin: (payload: LoginPayload) => void;
  onRegister: (payload: RegisterPayload) => void;
}

function AuthScreen({ mode, canRegister, error, onModeToggle, onLogin, onRegister }: AuthScreenProps) {
  const effectiveMode = canRegister ? mode : "login";
  const isLogin = effectiveMode === "login";
  const [loginForm, setLoginForm] = useState<LoginPayload>({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterPayload>({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLogin) {
      onLogin(loginForm);
    } else {
      onRegister(registerForm);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-8 shadow-2xl">
        <div className="mb-6 space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">SoukSoft</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your workspace" : "Create a new admin account"}
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isLogin ? (
            <>
              <label className="block text-sm font-medium">
                Username
                <input
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  First name
                  <input
                    className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                    value={registerForm.firstName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Last name
                  <input
                    className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                    value={registerForm.lastName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Username
                <input
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Confirm password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </label>
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-2xl py-2">
            {isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>
        {canRegister ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Need an account?" : "Already registered?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={onModeToggle}
            >
              {isLogin ? "Create one" : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            An admin is already set up. Please sign in to continue.
          </div>
        )}
      </div>
    </div>
  );
}
