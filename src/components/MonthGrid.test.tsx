import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthGrid } from "./MonthGrid.js";

describe("MonthGrid", () => {
  it("lays out whole weeks from Monday, renders day content and reports picks", () => {
    const onSelect = vi.fn();
    render(<MonthGrid month="2026-11-20" locale="en-GB" onSelect={onSelect} renderDay={(d) => (d === "2026-11-03" ? "450" : null)} />);
    const cells = screen.getAllByRole("gridcell");
    // November 2026 starts on a Sunday: Mon 26 Oct .. Sun 6 Dec = 6 weeks.
    expect(cells).toHaveLength(42);
    expect(cells[0]).toHaveAccessibleName(/26 October 2026/);
    expect(screen.getByText("450")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("gridcell", { name: / 3 November 2026/ }));
    expect(onSelect).toHaveBeenCalledWith("2026-11-03");
  });

  it("moves between months", () => {
    const onMonthChange = vi.fn();
    render(<MonthGrid month="2026-01-15" locale="en-GB" onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2025-12-01");
  });
});
