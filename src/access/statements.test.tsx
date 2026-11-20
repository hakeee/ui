import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PolicyStatement } from "@hakeee/module-host/iam";
import { StatementEditor } from "./StatementEditor.js";
import { ME, conditionPresets, describeStatement, resourceTypesFor } from "./statements.js";

const actions = [
  { action: "clients:list", kind: "query", resource: "clients:client" },
  { action: "clients:create", kind: "command" },
  { action: "ledger:list", kind: "query" },
];
const resources = [{ type: "clients:client", description: "A client.", attributes: ["clients:trainers", "clients:archived"] }];

describe("policy statements in words", () => {
  it("describes actions, kind, records and conditions", () => {
    expect(describeStatement({ effect: "allow", actions: ["*"], notActions: ["iam:*"] })).toBe("Allow * except iam:*");
    expect(describeStatement({ effect: "deny", actions: ["clients:list"], kind: "query", conditions: { "clients:archived": "true" } })).toBe(
      "Deny clients:list (reads only) where archived is yes",
    );
    expect(describeStatement({ effect: "allow", actions: ["a:b", "a:c", "a:d", "a:e"], conditions: { "clients:trainers": ME } })).toBe(
      "Allow a:b, a:c, a:d and 1 more where trainers is you",
    );
    expect(describeStatement({ effect: "allow", actions: ["clients:list"], resources: ["clients:client/42"] })).toBe("Allow clients:list on clients:client/42");
  });

  it("knows which record types a set of action patterns touches, and offers presets", () => {
    expect(resourceTypesFor(["clients:*"], actions)).toEqual(["clients:client"]);
    expect(resourceTypesFor(["ledger:*", "clients:create"], actions)).toEqual([]);
    expect(conditionPresets(resources[0]!).map((p) => p.label)).toEqual(["trainers includes me", "archived: yes", "archived: no"]);
  });
});

describe("StatementEditor", () => {
  it("adds actions and offers record limits only for actions that check records", () => {
    let statement: PolicyStatement = { effect: "allow", actions: [] };
    const onChange = vi.fn((next: PolicyStatement) => (statement = next));
    const view = () => <StatementEditor statement={statement} onChange={onChange} onRemove={() => {}} actions={actions} resources={resources} />;
    const { rerender } = render(view());
    expect(screen.queryByText("Applies to")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/clients:list/), { target: { value: "clients:*" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(statement.actions).toEqual(["clients:*"]);
    rerender(view());

    fireEvent.click(screen.getByRole("radio", { name: "Only some" }));
    expect(statement.conditions).toEqual({ "clients:trainers": ME });
    rerender(view());
    fireEvent.click(screen.getByRole("button", { name: "archived: no" }));
    expect(statement.conditions).toEqual({ "clients:trainers": ME, "clients:archived": "false" });
    rerender(view());
    fireEvent.click(screen.getByRole("radio", { name: "All records" }));
    expect(statement).toEqual({ effect: "allow", actions: ["clients:*"] });
  });
});
