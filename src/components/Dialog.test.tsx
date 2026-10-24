import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./Dialog.js";

describe("Dialog", () => {
  it("opens on trigger click and shows its title", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Open"));

    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
  });
});
