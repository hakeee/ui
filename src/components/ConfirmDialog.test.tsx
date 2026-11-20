import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog.js";

let answer: boolean | undefined;
function Asker() {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => (answer = await confirm({ title: "Delete entry?", confirmLabel: "Delete", destructive: true }))}>
      ask
    </button>
  );
}

describe("ConfirmDialog", () => {
  it("resolves true on confirm and false on cancel", async () => {
    render(
      <ConfirmProvider>
        <Asker />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByText("ask"));
    expect(await screen.findByText("Delete entry?")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    expect(answer).toBe(true);

    fireEvent.click(screen.getByText("ask"));
    await screen.findByText("Delete entry?");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    expect(answer).toBe(false);
  });
});
