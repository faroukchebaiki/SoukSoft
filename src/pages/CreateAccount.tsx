import { useEffect, useState } from "react";
import { Home, UploadCloud, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { UserRole } from "@/types";

interface CreateAccountProps {
  onGoHome?: () => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
  avatarFile?: File;
}

const defaultForm: FormState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  role: "Seller",
  password: "",
  confirmPassword: "",
};

export function CreateAccount({ onGoHome }: CreateAccountProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarPreview(null);
      setForm((prev) => ({ ...prev, avatarFile: undefined }));
      return;
    }
    setForm((prev) => ({ ...prev, avatarFile: file }));
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Create a new account</h1>
          <p className="text-sm text-muted-foreground">
            Add a teammate to this register with the right permissions.
          </p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home (Esc)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Account details</CardTitle>
                <CardDescription>
                  Basic info for sign-in and team visibility across the register.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full uppercase tracking-wide">
              Manager action
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm font-medium">
              First name
              <input
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Last name
              <input
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Username
              <input
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Email
              <input
                type="email"
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Role
              <select
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              >
                <option value="Manager">Manager</option>
                <option value="Seller">Seller</option>
                <option value="Inventory">Inventory</option>
              </select>
            </label>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="grid w-full gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-medium">
                Password
                <input
                  type="password"
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                Confirm password
                <input
                  type="password"
                  className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>New accounts sync to this device immediately.</span>
              <Button>Create account</Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>Optional photo for receipts and shift handoffs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border bg-background">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                JPG or PNG up to 2MB. Square works best.
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <UploadCloud className="h-4 w-4" />
                Upload photo
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Separator />
            <div>
              Tip: you can snap a picture from the tablet camera and upload here.
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
