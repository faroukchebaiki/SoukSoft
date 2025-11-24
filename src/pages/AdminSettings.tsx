import { useEffect } from "react";
import { Home, ShieldCheck } from "lucide-react";
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
import type { SettingOption } from "@/types";

interface AdminSettingsProps {
  options: SettingOption[];
  onGoHome?: () => void;
}

export function AdminSettings({ options, onGoHome }: AdminSettingsProps) {
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

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin settings</h1>
          <p className="text-sm text-muted-foreground">
            Store-wide controls for managers to configure payments, shifts, and hardware.
          </p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
          <Home className="h-4 w-4" />
          Home (Esc)
        </Button>
      </div>

      <Card className="mb-6 border-dashed">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div>
              <CardTitle>Manager only</CardTitle>
              <CardDescription>
                These options apply to every register user and require elevated access.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full">Manager access</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Changes here affect all accounts and devices paired to this store.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
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
