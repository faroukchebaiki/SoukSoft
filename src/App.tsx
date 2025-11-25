import { ChevronDown, Store } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_SECTION,
  navigation,
  purchaseHistory,
  generalSettingsOptions,
  userProfiles,
  DEFAULT_USER_ID,
  personalSettingsOptions,
} from "@/data/mockData";
import { cn } from "@/lib/utils";
import { getStoredProducts, PRODUCT_STORAGE_EVENT, STORAGE_KEY } from "@/lib/productStorage";
import type {
  AccountProfile,
  CatalogProduct,
  CreateAccountPayload,
  Section,
  UpdateAccountPayload,
  UserRole,
  WorkerProfile,
} from "@/types";
import { AllItems } from "@/pages/AllItems";
import { CounterPage } from "@/pages/CounterPage";
import { ProductBuilder } from "@/pages/ProductBuilder";
import { PurchaseHistory } from "@/pages/PurchaseHistory";
import { Settings } from "@/pages/Settings";
import { ExpiringProducts } from "@/pages/ExpiringProducts";
import { AdminSettings } from "@/pages/AdminSettings";
import { AccountsPage } from "@/pages/AccountsPage";
import { ThemeToggle } from "@/components/theme-toggle";
import { TeamPage } from "@/pages/TeamPage";

const USER_STORAGE_KEY = "souksoft-active-user";
const ACCOUNTS_STORAGE_KEY = "souksoft-accounts";
const USER_DEFAULT_SECTION_PREFS_KEY = "souksoft-user-default-section-prefs";
const WORKERS_STORAGE_KEY = "souksoft-workers";

const rolePermissions: Record<UserRole, Section[]> = {
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
    return parsed.map((account) => ({ ...account, archived: Boolean(account.archived) }));
  } catch {
    return userProfiles;
  }
}

const ACCOUNT_WORKER_DEFAULTS: Record<string, Partial<WorkerProfile>> = {
  "USR-001": {
    salary: 150000,
    phone: "+213-550-100-001",
    email: "lina@souksoft.dz",
    address: "12 Rue Emir Abdelkader, Algiers",
    jobTitle: "Store Manager",
  },
  "USR-002": {
    salary: 85000,
    phone: "+213-550-200-002",
    email: "karim@souksoft.dz",
    jobTitle: "Senior Seller",
    startDate: "2023-04-10",
  },
  "USR-003": {
    salary: 92000,
    phone: "+213-550-300-003",
    email: "nadia@souksoft.dz",
    jobTitle: "Inventory Lead",
    startDate: "2022-09-01",
  },
};

const DEMO_WORKERS: WorkerProfile[] = [
  {
    id: "WRK-DEMO-1",
    firstName: "Yassine",
    lastName: "Boufaroua",
    role: "Inventory",
    jobTitle: "Cleaner",
    salary: 48000,
    startDate: "2023-11-15",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 40,
    department: "Operations",
    phone: "+213-551-400-010",
    notes: "Keeps backroom tidy and assists with closing.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-2",
    firstName: "Amina",
    lastName: "Hamdi",
    role: "Seller",
    jobTitle: "Cashier",
    salary: 70000,
    startDate: "2024-02-01",
    status: "On leave",
    contractType: "Part-time",
    weeklyHours: 24,
    department: "Frontline",
    phone: "+213-552-222-222",
    emergencyContactName: "Sara Hamdi",
    emergencyContactPhone: "+213-661-222-222",
    notes: "Scheduled to return next month.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-3",
    firstName: "Sofiane",
    lastName: "Kaci",
    role: "Inventory",
    jobTitle: "Stocker",
    salary: 62000,
    startDate: "2023-07-20",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 42,
    department: "Warehouse",
    phone: "+213-553-333-333",
    emergencyContactName: "Yacine Kaci",
    emergencyContactPhone: "+213-661-333-333",
    notes: "Handles receiving and barcode checks.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-4",
    firstName: "Laila",
    lastName: "Cherif",
    role: "Seller",
    jobTitle: "Supervisor",
    salary: 98000,
    startDate: "2021-12-05",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 40,
    department: "Frontline",
    phone: "+213-554-444-444",
    email: "laila.cherif@souksoft.dz",
    notes: "Cross-trained on expiring items and counter.",
    source: "manual",
  },
];

function readStoredWorkers(): WorkerProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) return DEMO_WORKERS;
    const parsed = JSON.parse(raw) as WorkerProfile[];
    if (!Array.isArray(parsed)) return DEMO_WORKERS;
    return parsed.map((worker) => ({
      ...worker,
      jobTitle: worker.jobTitle ?? worker.role,
      contractType: worker.contractType ?? "Full-time",
      weeklyHours: worker.weeklyHours ?? 40,
    }));
  } catch {
    return DEMO_WORKERS;
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
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => readStoredWorkers());

  const activeUser = useMemo(
    () => accounts.find((user) => user.id === activeUserId) ?? null,
    [accounts, activeUserId],
  );
  const hasManager = accounts.some((user) => user.role === "Manager");

  useEffect(() => {
    if (accounts.some((account) => account.role === "Manager")) return;
    const usernameBase = "manager";
    let username = usernameBase;
    let suffix = 1;
    while (accounts.some((account) => account.username === username)) {
      username = `${usernameBase}${suffix++}`;
    }
    const fallbackManager: AccountProfile = {
      id: crypto.randomUUID?.() ?? `USR-${Date.now()}`,
      firstName: "Restored",
      lastName: "Manager",
      username,
      password: "password123",
      name: "Restored Manager",
      role: "Manager",
      email: `${username}@souksoft.local`,
      avatarInitials: "RM",
      shift: "08:00 - 16:00",
      archived: false,
    };
    setAccounts((prev) => (prev.some((account) => account.role === "Manager") ? prev : [...prev, fallbackManager]));
  }, [accounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
  }, [workers]);

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
    setWorkers((prev) => {
      const existingMap = new Map(prev.map((worker) => [worker.id, worker]));
      const next: WorkerProfile[] = [];
      accounts.forEach((account) => {
        const found = existingMap.get(account.id);
        const defaults = ACCOUNT_WORKER_DEFAULTS[account.id] ?? {};
        next.push({
          id: account.id,
          firstName: account.firstName,
          lastName: account.lastName,
          role: account.role,
          salary: found?.salary ?? defaults.salary ?? 0,
          startDate: found?.startDate ?? defaults.startDate ?? new Date().toISOString().slice(0, 10),
          status: found?.status ?? "Active",
          jobTitle: found?.jobTitle ?? defaults.jobTitle ?? account.role,
          email: found?.email ?? defaults.email ?? account.email,
          address: found?.address ?? defaults.address ?? "",
          birthDate: found?.birthDate ?? "",
          emergencyContactName: found?.emergencyContactName ?? "",
          emergencyContactPhone: found?.emergencyContactPhone ?? "",
          contractType: found?.contractType ?? defaults.contractType ?? "Full-time",
          weeklyHours: found?.weeklyHours ?? defaults.weeklyHours ?? 40,
          department: found?.department ?? defaults.department ?? "Frontline",
          phone: found?.phone ?? defaults.phone ?? "",
          notes: found?.notes ?? "",
          photoData: found?.photoData,
          source: "account",
        });
        existingMap.delete(account.id);
      });
      // keep manual workers
      existingMap.forEach((worker) => {
        if (worker.source === "manual") next.push(worker);
      });
      return next;
    });
  }, [accounts]);

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
    if (!account || account.archived) {
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
      archived: false,
    };
    setAccounts((prev) => [...prev, newAccount]);
    setActiveUserId(newAccount.id);
    setAuthError(null);
    setShowSectionGrid(true);
  };

  const handleCreateAccount = (payload: CreateAccountPayload) => {
    const firstName = payload.firstName.trim();
    const lastName = payload.lastName.trim();
    const trimmedUsername = payload.username.trim().toLowerCase();
    const email = payload.email.trim();
    if (!firstName || !lastName || !trimmedUsername || !email || !payload.password) {
      return { success: false, error: "Please fill in all required fields." };
    }
    if (accounts.some((user) => user.username.toLowerCase() === trimmedUsername)) {
      return { success: false, error: "Username already exists." };
    }
    const newAccount: AccountProfile = {
      id: crypto.randomUUID?.() ?? `USR-${Date.now()}`,
      firstName,
      lastName,
      username: trimmedUsername,
      password: payload.password,
      name: `${firstName} ${lastName}`,
      role: payload.role,
      email,
      avatarInitials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
      shift: payload.shift || "08:00 - 16:00",
      archived: false,
    };
    setAccounts((prev) => [...prev, newAccount]);
    return { success: true, account: newAccount };
  };

  const handleUpdateAccount = (payload: UpdateAccountPayload) => {
    const trimmedUsername = payload.username.trim().toLowerCase();
    if (!trimmedUsername || !payload.firstName.trim() || !payload.lastName.trim()) {
      return { success: false, error: "Please complete all fields." };
    }
    if (
      accounts.some(
        (user) => user.username.toLowerCase() === trimmedUsername && user.id !== payload.id,
      )
    ) {
      return { success: false, error: "Username already exists." };
    }
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === payload.id
          ? {
              ...account,
              firstName: payload.firstName.trim(),
              lastName: payload.lastName.trim(),
              username: trimmedUsername,
              name: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
              role: payload.role,
              email: payload.email.trim(),
              password: payload.password,
              shift: payload.shift || "08:00 - 16:00",
            }
          : account,
      ),
    );
    return { success: true };
  };

  const handleArchiveAccount = (id: string, archived: boolean) => {
    setAccounts((prev) =>
      prev.map((account) => (account.id === id ? { ...account, archived } : account)),
    );
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find((account) => account.id === id);
    if (!target) return { success: false, error: "Account not found." };
    if (target.role === "Manager") {
      return { success: false, error: "Manager accounts cannot be deleted." };
    }
    setAccounts((prev) => {
      const next = prev.filter((account) => account.id !== id);
      setActiveUserId((prevActive) => {
        if (prevActive === id) {
          return next[0]?.id ?? null;
        }
        return prevActive;
      });
      return next;
    });
    return { success: true };
  };

  const handleUpsertWorker = (worker: WorkerProfile) => {
    setWorkers((prev) => {
      const exists = prev.some((w) => w.id === worker.id);
      if (exists) {
        return prev.map((w) => (w.id === worker.id ? worker : w));
      }
      return [...prev, worker];
    });
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
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
        return <AllItems products={catalogData} onGoHome={() => setShowSectionGrid(true)} />;
      case "History":
        return <PurchaseHistory entries={purchaseHistory} onGoHome={() => setShowSectionGrid(true)} />;
      case "Settings":
        return (
          <Settings
            profile={activeUser}
            worker={workers.find((w) => w.id === activeUser.id)}
            personalOptions={personalSettingsOptions}
            onGoHome={() => setShowSectionGrid(true)}
          />
        );
      case "Admin settings":
        return (
          <AdminSettings
            options={generalSettingsOptions}
            onGoHome={() => setShowSectionGrid(true)}
          />
        );
      case "Accounts":
        return (
          <AccountsPage
            accounts={accounts}
            onCreateAccount={handleCreateAccount}
            onUpdateAccount={handleUpdateAccount}
            onArchiveAccount={handleArchiveAccount}
            onDeleteAccount={handleDeleteAccount}
            onGoHome={() => setShowSectionGrid(true)}
          />
        );
      case "Team":
        return (
          <TeamPage
            accounts={accounts}
            workers={workers}
            onSaveWorker={(worker) => {
              handleUpsertWorker(worker);
            }}
            onDeleteWorker={handleDeleteWorker}
            onGoHome={() => setShowSectionGrid(true)}
          />
        );
      case "Expiring items":
        return <ExpiringProducts products={catalogData} onGoHome={() => setShowSectionGrid(true)} />;
      case "Product builder":
        return <ProductBuilder onGoHome={() => setShowSectionGrid(true)} />;
      default:
        return null;
    }
  };

  const sectionCards = navigation.filter(({ label }) => allowedSections.includes(label));

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {showSectionGrid ? (
        <header className="flex items-center justify-between px-6 py-4">
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
          <ThemeToggle />
        </header>
      ) : null}
      <main className={cn("flex flex-1 flex-col", showSectionGrid ? "px-8 py-6" : "p-0")}>
        {showSectionGrid ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Choose where to go</h2>
              <p className="text-sm text-muted-foreground">
                You have access to {sectionCards.length} section
                {sectionCards.length === 1 ? "" : "s"}.
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
