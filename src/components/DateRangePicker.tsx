import { cn } from "../lib/cn.js";
import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek, todayIso } from "../lib/format.js";
import { Input } from "./Input.js";
import { Label } from "./Label.js";

export interface DateRange {
  from: string;
  to: string;
}

type Preset = { id: string; label: string; range(today: string): DateRange };

export const DATE_RANGE_PRESETS: readonly Preset[] = [
  { id: "week", label: "This week", range: (t) => ({ from: startOfWeek(t), to: addDays(startOfWeek(t), 6) }) },
  { id: "month", label: "This month", range: (t) => ({ from: startOfMonth(t), to: endOfMonth(t) }) },
  { id: "last-month", label: "Last month", range: (t) => ({ from: addMonths(t, -1), to: endOfMonth(addMonths(t, -1)) }) },
  { id: "year", label: "This year", range: (t) => ({ from: `${t.slice(0, 4)}-01-01`, to: `${t.slice(0, 4)}-12-31` }) },
];

/** From/to date fields with one-tap presets (this week, this month, ...). ISO dates. */
export function DateRangePicker({
  value,
  onValueChange,
  presets = DATE_RANGE_PRESETS,
  className,
}: {
  value: DateRange;
  onValueChange(range: DateRange): void;
  presets?: readonly Preset[];
  className?: string;
}) {
  const today = todayIso();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const range = preset.range(today);
          const active = range.from === value.from && range.to === value.to;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onValueChange(range)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground hover:bg-accent",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-range-from">From</Label>
          <Input
            id="date-range-from"
            type="date"
            value={value.from}
            max={value.to}
            onChange={(e) => e.target.value && onValueChange({ from: e.target.value, to: value.to < e.target.value ? e.target.value : value.to })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-range-to">To</Label>
          <Input
            id="date-range-to"
            type="date"
            value={value.to}
            min={value.from}
            onChange={(e) => e.target.value && onValueChange({ from: value.from > e.target.value ? e.target.value : value.from, to: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
