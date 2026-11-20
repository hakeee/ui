import { describe, expect, it } from "vitest";
import { addMonths, endOfMonth, formatHours, formatMoney, startOfWeek } from "./format.js";

describe("format", () => {
  it("formats Czech crowns with a space as thousands separator", () => {
    expect(formatMoney(1450, "CZK", "cs-CZ").replace(/\s/g, " ")).toBe("1 450 Kč");
    expect(formatMoney(12.5, "CZK", "cs-CZ").replace(/\s/g, " ")).toBe("12,50 Kč");
  });

  it("formats hours", () => {
    expect(formatHours(1.5)).toBe("1.5 h");
    expect(formatHours(1 / 3)).toBe("0.33 h");
  });

  it("does local-calendar date maths", () => {
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16"); // Sunday -> its Monday
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
  });
});
