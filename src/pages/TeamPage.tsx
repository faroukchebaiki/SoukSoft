import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Pencil, Plus, Trash2 } from "lucide-react";
import type { AccountProfile, UserRole } from "@/types";

interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  salary: number;
  startDate: string;
  status: "Active" | "On leave" | "Inactive";
  jobTitle: string;
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  contractType?: string;
  weeklyHours?: number;
  department?: string;
  photoData?: string;
  notes?: string;
  source: "account" | "manual";
}

interface TeamPageProps {
  accounts: AccountProfile[];
  workers: WorkerProfile[];
  onSaveWorker: (worker: WorkerProfile) => void;
  onDeleteWorker: (id: string) => void;
  onGoHome?: () => void;
}

const emptyWorker: WorkerProfile = {
  id: "",
  firstName: "",
  lastName: "",
  role: "Seller",
  salary: 0,
  startDate: new Date().toISOString().slice(0, 10),
  status: "Active",
  jobTitle: "Seller",
  contractType: "Full-time",
  weeklyHours: 40,
  department: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
  source: "manual",
};

export function TeamPage({ accounts, workers, onSaveWorker, onDeleteWorker, onGoHome }: TeamPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<WorkerProfile>(emptyWorker);
  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const combined = useMemo(() => {
    const accountIds = new Set(accounts.map((a) => a.id));
    const manual = workers.filter((w) => w.source === "manual");
    const auto = workers.filter((w) => accountIds.has(w.id));
    return [...auto, ...manual];
  }, [accounts, workers]);

  const handleEdit = (worker: WorkerProfile) => {
    setIsEditing(true);
    setForm(worker);
    setPhotoPreview(worker.photoData ?? null);
    setShowModal(true);
  };

  const handleCreate = () => {
    setIsEditing(false);
    setForm({ ...emptyWorker, id: crypto.randomUUID?.() ?? `WRK-${Date.now()}` });
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    onSaveWorker(form);
    setShowModal(false);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      setForm((prev) => ({ ...prev, photoData: undefined }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPhotoPreview(result);
      setForm((prev) => ({ ...prev, photoData: result ?? undefined }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!onGoHome) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showModal) {
          setShowModal(false);
          return;
        }
        onGoHome();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onGoHome, showModal]);

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team overview</h1>
          <p className="text-sm text-muted-foreground">
            Salaries, start dates, and details for everyone with access. Accounts are auto-included.
          </p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home (Esc)
        </Button>
      </div>

      <Card className="flex h-[calc(100vh-170px)] flex-col overflow-hidden">
        <CardHeader className="border-b bg-muted/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Workers directory</CardTitle>
              <CardDescription>
                {combined.length} people tracked. Accounts (Manager/Seller/Inventory) are included automatically.
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2 rounded-full" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              New worker
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="sticky top-0 z-10 bg-muted/70 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Job title</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Salary</th>
                <th className="px-4 py-2 font-medium">Start date</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {combined.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {worker.firstName} {worker.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {worker.source === "account" ? "Linked account" : "Manual"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {worker.jobTitle}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        worker.status === "Active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
                          : worker.status === "On leave"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {worker.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{worker.salary.toLocaleString()} DZD</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{worker.startDate}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(worker)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteWorker(worker.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-[min(1100px,96vw)] max-h-[90vh] overflow-auto rounded-2xl border border-border/70 bg-white text-slate-900 shadow-2xl shadow-black/60 dark:bg-slate-900 dark:text-slate-50">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{isEditing ? "Edit worker" : "Add worker"}</h2>
                <p className="text-sm text-muted-foreground">
                  Accounts are linked automatically; you can add extra hires manually.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} aria-label="Close worker form">
                <span className="text-lg leading-none">×</span>
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 lg:grid-cols-[2fr_1.1fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    First name
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.firstName}
                      onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      disabled={form.source === "account"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Last name
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.lastName}
                      onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      disabled={form.source === "account"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Job title
                    <select
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.jobTitle}
                      onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                    >
                      <option>Manager</option>
                      <option>Seller</option>
                      <option>Inventory</option>
                      <option>Cleaner</option>
                      <option>Cashier</option>
                      <option>Stocker</option>
                      <option>Security</option>
                      <option>Supervisor</option>
                      <option>Accountant</option>
                      <option>Driver</option>
                      <option>Operations</option>
                      <option>Support</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Status
                    <select
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: e.target.value as WorkerProfile["status"],
                        }))
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="On leave">On leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Salary (DZD)
                    <input
                      type="number"
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.salary}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, salary: Number.parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Start date
                    <input
                      type="date"
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.startDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Phone
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.phone ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Email
                    <input
                      type="email"
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.email ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Address
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.address ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Birth date
                    <input
                      type="date"
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.birthDate ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Contract type
                    <select
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.contractType ?? "Full-time"}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, contractType: e.target.value }))
                      }
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Seasonal</option>
                      <option>Contractor</option>
                      <option>Intern</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Weekly hours
                    <input
                      type="number"
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.weeklyHours ?? 40}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, weeklyHours: Number(e.target.value) || 0 }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Emergency contact
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.emergencyContactName ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Emergency phone
                    <input
                      className="rounded-md border border-border/70 bg-white px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-slate-50"
                      value={form.emergencyContactPhone ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm">
                  <div className="text-sm font-semibold">Profile & notes</div>
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background p-4 text-center">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border bg-muted">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No photo</span>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      Upload photo
                    </label>
                  </div>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-normal transition hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Performance, reminders, paperwork..."
                  />
                  <div className="text-xs text-muted-foreground">
                    Attach quick notes about salary changes, shifts, or documents.
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  {isEditing ? "Save changes" : "Add worker"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
