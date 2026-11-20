import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NumberInput } from "./NumberInput.js";

function Controlled({ onChange, ...props }: { onChange?: (n: number) => void; min?: number; max?: number; step?: number; steppers?: boolean }) {
  const [value, setValue] = useState(2);
  return (
    <NumberInput
      aria-label="count"
      value={value}
      onValueChange={(n) => {
        setValue(n);
        onChange?.(n);
      }}
      {...props}
    />
  );
}

describe("NumberInput", () => {
  it("reports typed numbers, accepts a decimal comma, and keeps half-typed text", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} step={0.25} />);
    const input = screen.getByLabelText("count") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,5" } });
    expect(onChange).toHaveBeenLastCalledWith(1.5);
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe(""); // not snapped to 0 while typing
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.blur(input);
    expect(input.value).toBe("1.5");
  });

  it("clamps to min/max and steps with the buttons", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} min={0} max={3} steppers />);
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("count"), { target: { value: "-4" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
