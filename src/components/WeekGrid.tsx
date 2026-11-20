import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { formatDate, todayIso } from "../lib/format.js";

export interface WeekGridEvent {
  id: string;
  /** ISO date; must be one of `days`. */
  date: string;
  /** "HH:MM" */
  time: string;
  durationMinutes: number;
  title: ReactNode;
  subtitle?: ReactNode;
  /** primary = emphasised (e.g. mine), muted = everyone else's, cancelled = struck through. */
  tone?: "primary" | "muted" | "cancelled";
  /** Draws attention (e.g. a clash). */
  warning?: boolean;
  /**
   * A colour of its own (e.g. per person), as a CSS colour such as `var(--trainer-teal)`; overrides the
   * primary/muted tone. Pass theme tokens with light and dark values so it follows the theme. Text uses
   * `colorForeground` (default white).
   */
  color?: string;
  colorForeground?: string;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Side-by-side lanes for overlapping events, per day: each event gets a lane and the lane count of its cluster. */
function layout<E extends WeekGridEvent>(events: readonly E[]): Map<string, { lane: number; lanes: number }> {
  const result = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...events].sort((a, b) => minutesOf(a.time) - minutesOf(b.time) || b.durationMinutes - a.durationMinutes);
  let cluster: { event: E; lane: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) result.set(c.event.id, { lane: c.lane, lanes });
    cluster = [];
  };
  for (const event of sorted) {
    const start = minutesOf(event.time);
    if (start >= clusterEnd) flush();
    // The first lane free at this start.
    const busy = new Set(cluster.filter((c) => minutesOf(c.event.time) + c.event.durationMinutes > start).map((c) => c.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    cluster.push({ event, lane });
    clusterEnd = Math.max(clusterEnd, start + event.durationMinutes);
  }
  flush();
  return result;
}

/**
 * A week as time columns, like a desktop calendar: one column per day,
 * events placed by start and length, overlapping ones side by side. Best
 * from `md` up; on phones a day-by-day list reads better.
 */
export function WeekGrid<E extends WeekGridEvent>({
  days,
  events,
  startHour = 7,
  endHour = 21,
  hourHeight = 48,
  onSelect,
  locale,
  className,
}: {
  days: readonly string[];
  events: readonly E[];
  startHour?: number;
  endHour?: number;
  /** Pixels per hour. */
  hourHeight?: number;
  onSelect?(event: E): void;
  locale?: string;
  className?: string;
}) {
  // Stretch the window for events outside it rather than hiding them.
  const first = Math.min(startHour, ...events.map((e) => Math.floor(minutesOf(e.time) / 60)));
  const last = Math.max(endHour, ...events.map((e) => Math.ceil((minutesOf(e.time) + e.durationMinutes) / 60)));
  const hours = Array.from({ length: Math.min(24, last) - first }, (_, i) => first + i);
  const today = todayIso();
  const top = (time: string) => ((minutesOf(time) - first * 60) / 60) * hourHeight;

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-card", className)}>
      <div className="grid min-w-[44rem]" style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-border" />
        {days.map((day) => (
          <div key={day} className={cn("border-b border-l border-border px-2 py-2 text-center text-sm", day === today && "bg-primary/10 font-semibold text-primary")}>
            {formatDate(day, { weekday: "short", day: "numeric" }, locale)}
          </div>
        ))}
        <div className="relative" style={{ height: hours.length * hourHeight }}>
          {hours.map((h) => (
            <div key={h} className="absolute right-1 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums" style={{ top: (h - first) * hourHeight }}>
              {h > first && `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = events.filter((e) => e.date === day);
          const lanes = layout(dayEvents);
          return (
            <div key={day} className="relative border-l border-border" style={{ height: hours.length * hourHeight }}>
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: (h - first) * hourHeight }} />
              ))}
              {dayEvents.map((event) => {
                const place = lanes.get(event.id) ?? { lane: 0, lanes: 1 };
                const tone = event.tone ?? "primary";
                const colored = event.color !== undefined && tone !== "cancelled";
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect?.(event)}
                    className={cn(
                      "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      colored && "border-transparent hover:brightness-110",
                      !colored && tone === "primary" && "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90",
                      !colored && tone === "muted" && "border-border bg-secondary text-secondary-foreground hover:bg-accent",
                      tone === "cancelled" && "border-dashed border-border bg-transparent text-muted-foreground line-through",
                      event.warning && "ring-2 ring-warning",
                    )}
                    style={{
                      top: top(event.time) + 1,
                      height: Math.max(20, (event.durationMinutes / 60) * hourHeight - 2),
                      left: `calc(${(place.lane / place.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / place.lanes}% - 4px)`,
                      ...(colored ? { background: event.color, color: event.colorForeground ?? "white" } : {}),
                    }}
                  >
                    <span className="block truncate font-medium">{event.title}</span>
                    {event.subtitle && <span className="block truncate opacity-80">{event.subtitle}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
