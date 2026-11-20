import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

/** One headline number with its label, e.g. a range total. Group several in a grid. */
export function StatTile({ label, value, detail, className }: { label: ReactNode; value: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-card-foreground", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}
