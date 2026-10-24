import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "./Alert.js";

describe("Alert", () => {
  it("renders with an alert role and its content", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something needs attention.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Something needs attention.")).toBeInTheDocument();
  });

  it("applies the destructive variant's classes", () => {
    render(<Alert variant="destructive">Failed</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("text-destructive");
  });
});
