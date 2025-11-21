import { ThemeToggle } from "@/components/theme-toggle";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SettingOption } from "@/types";

interface SettingsProps {
  options: SettingOption[];
  onGoHome?: () => void;
}

const profile = {
  firstName: "Farouk",
  lastName: "Messaoudi",
  email: "register02@souksoft.dz",
  login: "register-02",
};

export function Settings({ options, onGoHome }: SettingsProps) {
  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Quick preferences for the register.</p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Keep the register operator information up to date for accountability.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
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
              Login ID
              <input
                className="mt-1 rounded-md border bg-background px-3 py-2 text-sm font-normal uppercase tracking-wide"
                defaultValue={profile.login}
              />
            </label>
          </CardContent>
          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Changes sync to HQ directory instantly.</span>
            <Button variant="outline">Save profile</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme & register preferences</CardTitle>
            <CardDescription>
              Toggle between light/dark mode and set quick workflow defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Interface theme</p>
                <p className="text-xs text-muted-foreground">
                  Switch for cashier comfort during night shifts.
                </p>
              </div>
              <ThemeToggle />
            </div>
            <Separator />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Default payment method
              <select className="rounded-md border bg-background px-3 py-2 text-sm font-normal">
                <option>Cash (DA)</option>
                <option>CIB card</option>
                <option>Edahabia card</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border" defaultChecked />
              Confirm before canceling a basket
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((option) => (
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
    </main>
  );
}
