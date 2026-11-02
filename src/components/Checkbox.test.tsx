import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox.js";
import { Label } from "./Label.js";

function Controlled() {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <Checkbox id="c" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
      <Label htmlFor="c">Accept</Label>
      <span>{checked ? "on" : "off"}</span>
    </>
  );
}

describe("Checkbox", () => {
  it("toggles via click and reports checked state to onCheckedChange", async () => {
    render(<Controlled />);

    const box = screen.getByRole("checkbox", { name: "Accept" });
    expect(box).toHaveAttribute("aria-checked", "false");

    await userEvent.click(box);

    expect(box).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("on")).toBeInTheDocument();
  });

  it("does not toggle when disabled", async () => {
    render(<Checkbox aria-label="x" disabled />);
    const box = screen.getByRole("checkbox", { name: "x" });
    await userEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });
});
