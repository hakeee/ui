import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card.js";

describe("Card", () => {
  it("renders its header and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Manage your account")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
