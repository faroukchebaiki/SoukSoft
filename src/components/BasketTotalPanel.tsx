import { Badge } from "@/components/ui/badge";

interface BasketTotalPanelProps {
  totalDisplayValue: string;
  lineCount: number;
}

export function BasketTotalPanel({
  totalDisplayValue,
  lineCount,
}: BasketTotalPanelProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/70 bg-emerald-950/70 px-6 py-5 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-200">
          Basket total
        </span>
        <span className="font-mono text-4xl tracking-[0.28em] leading-none sm:text-[2.75rem]">
          {totalDisplayValue}
        </span>
      </div>
      <Badge variant="secondary">{lineCount} lines</Badge>
    </div>
  );
}
