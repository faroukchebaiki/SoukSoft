import { invoke } from "@tauri-apps/api/core";
import { Rocket } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function App() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGreet() {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const message = await invoke<string>("greet", { name });
      setGreeting(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Souksoft</p>
            <h1 className="text-xl font-semibold">Tauri + React Starter</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <section className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Say hello from Rust
            </h2>
            <p className="text-muted-foreground">
              Edit <code>src-tauri/src/lib.rs</code> to change the command logic.
            </p>
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleGreet();
            }}
          >
            <input
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Enter a name..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button className="sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "..." : "Send greeting"}
            </Button>
          </form>

          {greeting && (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              {greeting}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border bg-background p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold">What&apos;s set up?</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Tauri 2 desktop shell</li>
              <li>• React 19 with TypeScript</li>
              <li>• Tailwind CSS v4 including shadcn/ui tokens</li>
              <li>• Biome for linting &amp; formatting</li>
            </ul>
          </article>
          <article className="rounded-lg border bg-background p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold">Next steps</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Generate components via `pnpm dlx shadcn@latest add ...`</li>
              <li>• Tweak Tailwind tokens in `src/styles.css`</li>
              <li>• Update Rust commands in `src-tauri`</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
