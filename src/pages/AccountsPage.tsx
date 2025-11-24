import { useEffect, useMemo, useState } from "react";
import { Home, Plus, Shield, UserRound, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AccountProfile, CreateAccountPayload, UserRole } from "@/types";

interface AccountsPageProps {
  accounts: AccountProfile[];
  onCreateAccount?: (payload: CreateAccountPayload) => { success: boolean; error?: string };
  onGoHome?: () => void;
}

interface FormState extends CreateAccountPayload {
  confirmPassword: string;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  role: "Seller",
  password: "",
  shift: "08:00 - 16:00",
  confirmPassword: "",
};

const roleOrder: UserRole[] = ["Manager", "Seller", "Inventory"];
const roleTone: Record<UserRole, string> = {
  Manager: "bg-primary/10 text-primary border-primary/30",
  Seller: "bg-amber-100 text-amber-800 border-amber-200",
  Inventory: "bg-sky-100 text-sky-800 border-sky-200",
};

export function AccountsPage({ accounts, onCreateAccount, onGoHome }: AccountsPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showModal) {
        event.preventDefault();
        setShowModal(false);
        return;
      }
      if (onGoHome) {
        onGoHome();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onGoHome, showModal]);

  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = { Manager: 0, Seller: 0, Inventory: 0 };
    accounts.forEach((account) => {
      counts[account.role] = (counts[account.role] ?? 0) + 1;
    });
    return counts;
  }, [accounts]);

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
        if (roleDiff !== 0) return roleDiff;
        return a.lastName.localeCompare(b.lastName);
      }),
    [accounts],
  );

  const openModal = () => {
    setForm(emptyForm);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (!onCreateAccount) {
      setFormError("Account creation is currently disabled.");
      return;
    }
    const result = onCreateAccount({
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      role: form.role,
      password: form.password,
      shift: form.shift,
    });
    if (!result?.success) {
      setFormError(result?.error ?? "Could not create account.");
      return;
    }
    setSuccessMessage(`Added ${form.firstName} ${form.lastName} (${form.role}).`);
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Accounts directory</h1>
          <p className="text-sm text-muted-foreground">
            List of users with their categories. Open the form to add a new account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2 rounded-full px-4" onClick={openModal}>
            <Plus className="h-4 w-4" />
            Create new account
          </Button>
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home (Esc)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Who is on the roster and what they can access.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Total accounts
              </div>
              <Badge variant="secondary" className="rounded-full">
                {accounts.length}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {roleOrder.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        role === "Manager"
                          ? "bg-primary"
                          : role === "Seller"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      }`}
                    />
                    <span className="font-medium">{role}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{roleCounts[role]} member(s)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="space-y-2 border-b bg-muted/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>List of accounts</CardTitle>
                  <CardDescription>Sorted by role. Category column shows their level.</CardDescription>
                </div>
              </div>
              <Button variant="outline" className="gap-2 rounded-full" onClick={openModal}>
                <Plus className="h-4 w-4" />
                Create account
              </Button>
            </div>
            {successMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50">
                {successMessage}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {sortedAccounts.length ? (
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Shift</th>
                    <th className="px-4 py-2 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {sortedAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {account.avatarInitials || account.firstName[0] || account.username[0] || "?"}
                          </div>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-xs text-muted-foreground">@{account.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={roleTone[account.role]}>
                          {account.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{account.shift}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{account.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm font-medium">No accounts yet</div>
                <div className="text-xs text-muted-foreground">
                  Add your first teammate to start assigning categories.
                </div>
                <Button className="mt-2 gap-2 rounded-full" onClick={openModal}>
                  <Plus className="h-4 w-4" />
                  Create account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-[min(960px,95vw)] max-h-[90vh] overflow-auto rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Create a new account</h2>
                <p className="text-sm text-muted-foreground">
                  Fill out the form to add someone to this register.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  First name
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Last name
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Username
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.username}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Email
                  <input
                    type="email"
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Category (role)
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.role}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                    }
                  >
                    <option value="Manager">Manager</option>
                    <option value="Seller">Seller</option>
                    <option value="Inventory">Inventory</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Shift
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.shift}
                    onChange={(event) => setForm((prev) => ({ ...prev, shift: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Password
                  <input
                    type="password"
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.password}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Confirm password
                  <input
                    type="password"
                    className="rounded-md border bg-background px-3 py-2 text-sm font-normal"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                  />
                </label>
              </div>
              {formError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <Separator />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create account
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
