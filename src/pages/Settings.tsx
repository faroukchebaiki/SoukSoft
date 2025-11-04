import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettingOption } from "@/types";

interface SettingsProps {
  options: SettingOption[];
}

export function Settings({ options }: SettingsProps) {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
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
