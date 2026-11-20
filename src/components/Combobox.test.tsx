import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Combobox, type ComboboxOption } from "./Combobox.js";

const all: ComboboxOption[] = [
  { value: "1", label: "Bára" },
  { value: "2", label: "Jana", hint: "archived" },
];

function Harness({ onCreate }: { onCreate?(q: string): void }) {
  const [value, setValue] = useState<ComboboxOption | null>(null);
  const [query, setQuery] = useState("");
  const options = all.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Combobox
      aria-label="Client"
      value={value}
      onChange={setValue}
      options={options}
      query={query}
      onQueryChange={setQuery}
      createLabel={(q) => `Add “${q}”`}
      onCreate={onCreate}
    />
  );
}

describe("Combobox", () => {
  it("filters, picks with the keyboard, shows the choice and clears it", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Client" });
    fireEvent.focus(input);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Bára", "Janaarchived"]);
    fireEvent.change(input, { target: { value: "ja" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Janaarchived"]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: /Client: Jana/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear Jana" }));
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("offers to add what was typed when nothing matches it exactly", () => {
    const onCreate = vi.fn();
    render(<Harness onCreate={onCreate} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Petr" } });
    fireEvent.click(screen.getByRole("option", { name: /Add “Petr”/ }));
    expect(onCreate).toHaveBeenCalledWith("Petr");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "bára" } });
    expect(screen.queryByRole("option", { name: /Add/ })).toBeNull(); // an exact match exists
  });
});
