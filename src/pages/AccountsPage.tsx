import { useEffect, useMemo, useState } from "react";
import { Archive, Edit3, Home, Plus, Trash2, Undo2, UserRound, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  AccountProfile,
  CreateAccountPayload,
  UpdateAccountPayload,
  UserRole,
} from "@/types";

interface AccountsPageProps {
  accounts: AccountProfile[];
  onCreateAccount?: (payload: CreateAccountPayload) => { success: boolean; error?: string };
  onUpdateAccount?: (payload: UpdateAccountPayload) => { success: boolean; error?: string };
  onArchiveAccount?: (id: string, archived: boolean) => void;
  onDeleteAccount?: (id: string) => { success: boolean; error?: string };
  onGoHome?: () => void;
}

interface FormState extends CreateAccountPayload {
  confirmPassword: string;
  id?: string;
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

type RoleFilter = "All" | UserRole;
type StatusFilter = "Active" | "Archived";

export function AccountsPage({
  accounts,
  onCreateAccount,
  onUpdateAccount,
  onArchiveAccount,
  onDeleteAccount,
  onGoHome,
}: AccountsPageProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showModal) {
        event.preventDefault();
        setShowModal(false);
        return;
      }
      if (onGoHome) onGoHome();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onGoHome, showModal]);

  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = { All: accounts.length, Manager: 0, Seller: 0, Inventory: 0 };
    accounts.forEach((account) => {
      counts[account.role] = (counts[account.role] ?? 0) + 1;
    });
    return counts;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const filtered = accounts.filter((account) => {
      if (statusFilter === "Archived" && !account.archived) return false;
      if (statusFilter === "Active" && account.archived) return false;
      if (roleFilter !== "All" && account.role !== roleFilter) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const statusWeight = (a.archived ? 1 : 0) - (b.archived ? 1 : 0);
      if (statusWeight !== 0) return statusWeight;
      const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
      if (roleDiff !== 0) return roleDiff;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [accounts, roleFilter, statusFilter]);

  const openCreateModal = () => {
    setMode("create");
    setForm(emptyForm);
    setFormError(null);
    setSuccessMessage(null);
    setActionError(null);
    setShowModal(true);
  };

  const openEditModal = (account: AccountProfile) => {
    setMode("edit");
    setForm({
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      username: account.username,
      email: account.email,
      role: account.role,
      password: account.password,
      confirmPassword: account.password,
      shift: account.shift,
    });
    setFormError(null);
    setActionError(null);
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
    if (mode === "create") {
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
    } else if (mode === "edit" && form.id) {
      if (!onUpdateAccount) {
        setFormError("Account updates are disabled.");
        return;
      }
      const result = onUpdateAccount({
        id: form.id,
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        role: form.role,
        password: form.password,
        shift: form.shift,
      });
      if (!result?.success) {
        setFormError(result?.error ?? "Could not update account.");
        return;
      }
      setSuccessMessage(`Updated ${form.firstName} ${form.lastName}.`);
    }
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleArchiveToggle = (account: AccountProfile) => {
    if (account.role === "Manager") {
      setActionError("Manager accounts cannot be archived.");
      return;
    }
    onArchiveAccount?.(account.id, !account.archived);
    setActionError(null);
  };

  const handleDelete = (account: AccountProfile) => {
    if (account.role === "Manager") {
      setActionError("Manager accounts cannot be deleted.");
      return;
    }
    const confirmed = window.confirm(`Delete ${account.name}? This cannot be undone.`);
    if (!confirmed) return;
    const result = onDeleteAccount?.(account.id);
    if (result && !result.success) {
      setActionError(result.error ?? "Could not delete this account.");
      return;
    }
    setActionError(null);
    setSuccessMessage(`Deleted ${account.name}.`);
  };

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Accounts directory</h1>
          <p className="text-sm text-muted-foreground">
            List of users with their categories. Filter, edit, archive, or delete from here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2 rounded-full px-4" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Create new account
          </Button>
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home (Esc)
          </Button>
        </div>
      </div>

      <Card className="flex h-[calc(100vh-150px)] flex-col overflow-hidden">
        <CardHeader className="space-y-3 border-b bg-muted/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>List of accounts</CardTitle>
                <CardDescription>Filter by category and status. Quick actions inline.</CardDescription>
              </div>
            </div>
            <Button variant="outline" className="gap-2 rounded-full" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Create account
            </Button>
          </div>
          {actionError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] uppercase">Categories</span>
              {(["All", ...roleOrder] as RoleFilter[]).map((role) => {
                const active = roleFilter === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition hover:-translate-y-[1px] hover:shadow-sm ${
                      active
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {role}
                    <Badge
                      variant="secondary"
                      className={`rounded-full px-2 text-[11px] ${
                        active ? "bg-primary/90 text-white" : ""
                      }`}
                    >
                      {roleCounts[role]}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] uppercase">Status</span>
              {(["Active", "Archived"] as StatusFilter[]).map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-2 text-xs transition hover:-translate-y-[1px] hover:shadow-sm ${
                      active
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
          {successMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-50">
              {successMessage}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {filteredAccounts.length ? (
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Shift</th>
                  <th className="px-4 py-2 font-medium">Contact</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className={account.archived ? "opacity-70" : ""}>
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
                    <td className="px-4 py-3">
                      {account.archived ? (
                        <Badge variant="secondary" className="rounded-full bg-muted/70 text-xs text-muted-foreground">
                          Archived
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full bg-emerald-100 text-xs text-emerald-700">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(account)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleArchiveToggle(account)}
                          title={account.archived ? "Unarchive" : "Archive"}
                        >
                          {account.archived ? <Undo2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(account)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">No accounts match your filters</div>
              <div className="text-xs text-muted-foreground">
                Adjust category or status to see more teammates, or create a new one.
              </div>
              <Button className="mt-2 gap-2 rounded-full" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Create account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-[min(960px,95vw)] max-h-[90vh] overflow-auto rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {mode === "create" ? "Create a new account" : "Edit account"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "create"
                    ? "Fill out the form to add someone to this register."
                    : "Update details, category, or shift. Passwords are stored in plain text here."}
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
                  {mode === "create" ? <Plus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  {mode === "create" ? "Create account" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
