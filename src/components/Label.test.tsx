import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input.js";
import { Label } from "./Label.js";

describe("Label", () => {
  it("associates with its control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>,
    );

    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "name");
  });
});
