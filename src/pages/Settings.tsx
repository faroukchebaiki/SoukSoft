import { useEffect, useMemo } from "react";
import { Home, Mail, MapPin, Phone, ShieldCheck, UploadCloud, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AccountProfile, SettingOption, WorkerProfile } from "@/types";

interface SettingsProps {
  profile: AccountProfile;
  worker?: WorkerProfile | null;
  personalOptions: SettingOption[];
  onGoHome?: () => void;
}

function buildInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.map((p) => p[0]).join("").slice(0, 2);
  return initials || "?";
}

export function Settings({ profile, worker, personalOptions, onGoHome }: SettingsProps) {
  useEffect(() => {
    if (!onGoHome) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onGoHome();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onGoHome]);

  const avatarInitials = useMemo(() => {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    return profile.avatarInitials || buildInitials(name);
  }, [profile.avatarInitials, profile.firstName, profile.lastName]);

  const startDate = worker?.startDate ?? "";
  const salary = worker?.salary ? `${worker.salary.toLocaleString()} DZD` : "N/A";
  const contract = worker?.contractType ?? "N/A";

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Personal settings</h1>
          <p className="text-sm text-muted-foreground">
            A clean, Google-inspired view of your account and team data.
          </p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home (Esc)
        </Button>
      </div>

      <section className="space-y-4">
        <Card className="overflow-hidden border border-border/70 shadow-sm">
          <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-white/80 text-lg font-semibold text-primary shadow-sm dark:bg-slate-900/70">
                  {worker?.photoData ? (
                    <img src={worker.photoData} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    avatarInitials
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Signed in</p>
                  <h2 className="text-xl font-semibold">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {worker?.jobTitle ?? profile.role} · {worker?.status ?? "Active"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                  {salary}
                </span>
                <span className="rounded-full border border-border px-3 py-1">Contract: {contract}</span>
                <span className="rounded-full border border-border px-3 py-1">Start: {startDate || "—"}</span>
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  <UploadCloud className="h-4 w-4" />
                  Update photo
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="grid gap-4 border-t bg-card md:grid-cols-3">
            <div className="rounded-xl border bg-background p-3 text-sm shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">Contact</div>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{profile.email}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{worker?.phone || "Add phone"}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{worker?.address || "Add an address for handoffs"}</span>
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3 text-sm shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">Work</div>
              <div className="font-semibold">{worker?.jobTitle ?? profile.role}</div>
              <div className="text-muted-foreground">
                {salary} · {contract}
              </div>
              <div className="text-xs text-muted-foreground">
                Shift: {profile.shift} · Weekly hours: {worker?.weeklyHours ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div className="text-xs uppercase text-muted-foreground">Permissions</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border px-3 py-1">Counter</span>
                <span className="rounded-full border px-3 py-1">Accounts</span>
                <span className="rounded-full border px-3 py-1">Team</span>
                <span className="rounded-full border px-3 py-1">Admin</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 gap-2">
                <Wallet className="h-4 w-4" />
                Manage devices
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Identity & access</CardTitle>
              <CardDescription>Update your personal info shared across Accounts and Team.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium">
                First name
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  defaultValue={profile.firstName}
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Last name
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  defaultValue={profile.lastName}
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Email
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  type="email"
                  defaultValue={profile.email}
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Username
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal uppercase tracking-wide"
                  defaultValue={profile.username}
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Role
                <input className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm font-normal" value={profile.role} disabled />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Shift
                <input className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm font-normal" value={profile.shift} disabled />
              </label>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Updates apply to your account on this device.</span>
              <Button variant="outline">Save profile</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency & backup</CardTitle>
              <CardDescription>Keep safety contacts handy for night shifts and audits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex flex-col text-sm font-medium">
                Contact name
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  defaultValue={worker?.emergencyContactName ?? ""}
                  placeholder="Person to reach out to"
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Contact phone
                <input
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  defaultValue={worker?.emergencyContactPhone ?? ""}
                  placeholder="Phone number"
                />
              </label>
              <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                Keep this up to date for incidents and safety checks.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {personalOptions.map((option) => (
            <Card key={option.name}>
              <CardHeader>
                <CardTitle>{option.name}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline">{option.actionLabel}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
