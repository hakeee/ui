import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface ChoiceTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  title: ReactNode;
  /** Secondary line, e.g. a default price. */
  detail?: ReactNode;
  /** Shown before the text. */
  icon?: ReactNode;
  selected?: boolean;
}

/** A big tappable card for picking one of a few options - the fast path of a form on a phone. */
export const ChoiceTile = forwardRef<HTMLButtonElement, ChoiceTileProps>(({ title, detail, icon, selected, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-pressed={selected}
    className={cn(
      "flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
      selected && "border-primary ring-1 ring-primary",
      className,
    )}
    {...props}
  >
    {icon && <span className="shrink-0 text-primary">{icon}</span>}
    <span className="flex min-w-0 flex-col">
      <span className="font-medium">{title}</span>
      {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
    </span>
  </button>
));
ChoiceTile.displayName = "ChoiceTile";
