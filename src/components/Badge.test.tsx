import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge.js";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies the secondary variant's classes", () => {
    render(<Badge variant="secondary">Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("bg-secondary");
  });
});
