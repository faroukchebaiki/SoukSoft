import type { NavigationItem, Section } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Landing grid that lists accessible sections for the active user.
 */
export function SectionGrid({
  items,
  activeSection,
  onSelectSection,
}: {
  items: NavigationItem[];
  activeSection: Section;
  onSelectSection: (section: Section) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Choose where to go</h2>
        <p className="text-sm text-muted-foreground">
          You have access to {items.length} section{items.length === 1 ? "" : "s"}.
        </p>
      </div>
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectSection(label)}
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
  );
}
