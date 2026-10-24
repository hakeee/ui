import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./Input.js";

describe("Input", () => {
  it("accepts typed input", async () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText("Email");

    await userEvent.type(input, "me@example.com");

    expect(input).toHaveValue("me@example.com");
  });

  it("is disabled when disabled is set", () => {
    render(<Input placeholder="Email" disabled />);
    expect(screen.getByPlaceholderText("Email")).toBeDisabled();
  });
});
