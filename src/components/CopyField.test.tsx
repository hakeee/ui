import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyField } from "./CopyField.js";

describe("CopyField", () => {
  it("copies the value and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CopyField value="https://example.com/feed.ics" />);
    expect(screen.getByRole("textbox")).toHaveProperty("value", "https://example.com/feed.ics");
    fireEvent.click(screen.getByRole("button", { name: /Copy/ }));
    expect(writeText).toHaveBeenCalledWith("https://example.com/feed.ics");
    await waitFor(() => expect(screen.getByRole("button", { name: /Copied/ })).toBeTruthy());
  });
});
