import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.js";

function Example() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">Alpha</TabsTrigger>
        <TabsTrigger value="b">Beta</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Alpha panel</TabsContent>
      <TabsContent value="b">Beta panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows the default tab and switches on click", async () => {
    render(<Example />);

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Alpha panel")).toBeInTheDocument();
    expect(screen.queryByText("Beta panel")).not.toBeInTheDocument();

    // Radix Tabs activates on mousedown/focus, not click alone.
    await userEvent.click(screen.getByRole("tab", { name: "Beta" }));

    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Beta panel")).toBeInTheDocument();
  });

  it("supports arrow-key navigation between triggers", async () => {
    render(<Example />);
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
  });
});
