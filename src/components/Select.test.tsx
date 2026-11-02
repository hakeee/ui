import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select.js";

function Example() {
  const [value, setValue] = useState("allow");
  return (
    <>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="Default">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="allow">Allow</SelectItem>
          <SelectItem value="deny">Deny</SelectItem>
        </SelectContent>
      </Select>
      <output>{value}</output>
    </>
  );
}

describe("Select", () => {
  it("shows the current value and changes it when an option is chosen", async () => {
    render(<Example />);

    const trigger = screen.getByRole("combobox", { name: "Default" });
    expect(trigger).toHaveTextContent("Allow");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "Deny" }));

    expect(screen.getByRole("combobox", { name: "Default" })).toHaveTextContent("Deny");
    expect(screen.getByRole("status")).toHaveTextContent("deny");
  });

  it("renders a placeholder when no value is set", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Pick">
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="x">X</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Pick" })).toHaveTextContent("Choose one");
  });
});
