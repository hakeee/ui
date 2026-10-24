import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea.js";

describe("Textarea", () => {
  it("accepts typed input", async () => {
    render(<Textarea placeholder="What's going on?" />);
    const textarea = screen.getByPlaceholderText("What's going on?");

    await userEvent.type(textarea, "Long day.");

    expect(textarea).toHaveValue("Long day.");
  });

  it("is disabled when disabled is set", () => {
    render(<Textarea placeholder="What's going on?" disabled />);
    expect(screen.getByPlaceholderText("What's going on?")).toBeDisabled();
  });
});
