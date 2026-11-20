import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeekGrid } from "./WeekGrid.js";

const days = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];

describe("WeekGrid", () => {
  it("places events by time and puts overlapping ones side by side", () => {
    const onSelect = vi.fn();
    render(
      <WeekGrid
        days={days}
        locale="en-GB"
        hourHeight={60}
        startHour={8}
        onSelect={onSelect}
        events={[
          { id: "a", date: "2026-11-23", time: "09:00", durationMinutes: 60, title: "Puppy class" },
          { id: "b", date: "2026-11-23", time: "09:30", durationMinutes: 60, title: "Private" },
          { id: "c", date: "2026-11-23", time: "11:00", durationMinutes: 30, title: "Alone" },
        ]}
      />,
    );
    const a = screen.getByRole("button", { name: /Puppy class/ });
    const b = screen.getByRole("button", { name: /Private/ });
    const c = screen.getByRole("button", { name: /Alone/ });
    expect(a.style.top).toBe("61px"); // one hour below 08:00, +1px inset
    expect(a.style.width).toBe("calc(50% - 4px)");
    expect(b.style.left).toBe("calc(50% + 2px)");
    expect(c.style.width).toBe("calc(100% - 4px)");
    fireEvent.click(b);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
  });

  it("paints an event in its own colour, except when cancelled", () => {
    render(
      <WeekGrid
        days={days}
        events={[
          { id: "a", date: "2026-11-23", time: "09:00", durationMinutes: 60, title: "Teal", color: "var(--trainer-teal)" },
          { id: "b", date: "2026-11-23", time: "11:00", durationMinutes: 60, title: "Gone", color: "var(--trainer-teal)", tone: "cancelled" },
        ]}
      />,
    );
    const a = screen.getByRole("button", { name: /Teal/ });
    expect(a.style.background).toBe("var(--trainer-teal)");
    expect(a.style.color).toBe("white");
    expect(screen.getByRole("button", { name: /Gone/ }).style.background).toBe("");
  });

  it("grows the hours to fit early or late events", () => {
    render(<WeekGrid days={days} startHour={8} endHour={18} events={[{ id: "x", date: "2026-11-24", time: "06:30", durationMinutes: 60, title: "Early" }]} />);
    expect(screen.getByRole("button", { name: /Early/ }).style.top).toBe("25px"); // 30 min below 06:00 at 48px/h, +1px
  });
});
