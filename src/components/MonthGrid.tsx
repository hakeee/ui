import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { addDays, addMonths, endOfMonth, formatDate, fromIsoDate, startOfMonth, startOfWeek, todayIso } from "../lib/format.js";
import { Button } from "./Button.js";

/**
 * A month calendar, Monday first, that leaves the content of each day to
 * the caller (`renderDay`): totals, dots, counts. Days are ISO dates.
 */
export function MonthGrid({
  month,
  onMonthChange,
  selected,
  onSelect,
  renderDay,
  locale,
  className,
}: {
  /** Any date in the month to show. */
  month: string;
  onMonthChange?(month: string): void;
  selected?: string;
  onSelect?(date: string): void;
  /** Extra content under the day number. Keep it tiny: cells are ~45px wide on a phone. */
  renderDay?(date: string): ReactNode;
  locale?: string;
  className?: string;
}) {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const days: string[] = [];
  for (let day = startOfWeek(first); day <= last || days.length % 7 !== 0; day = addDays(day, 1)) days.push(day);
  const today = todayIso();
  // Weekday headers from the locale, starting Monday (2024-01-01 was one).
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(addDays("2024-01-01", i), { weekday: "short" }, locale));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {onMonthChange && (
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => onMonthChange(addMonths(first, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold capitalize">{formatDate(first, { month: "long", year: "numeric" }, locale)}</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => onMonthChange(addMonths(first, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
      <div role="grid" className="grid grid-cols-7 gap-1">
        {weekdays.map((w) => (
          <div key={w} role="columnheader" className="text-center text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day >= first && day <= last;
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={formatDate(day, undefined, locale)}
              onClick={() => onSelect?.(day)}
              className={cn(
                "flex min-h-14 flex-col items-center gap-0.5 rounded-lg border border-transparent bg-transparent p-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth && "text-muted-foreground/50",
                isSelected && "border-primary bg-primary/10",
              )}
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full tabular-nums", day === today && "bg-primary font-semibold text-primary-foreground")}>
                {fromIsoDate(day).getDate()}
              </span>
              {inMonth && renderDay?.(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
