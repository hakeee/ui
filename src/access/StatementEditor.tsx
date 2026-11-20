import type { PolicyStatement } from "@hakeee/module-host/iam";
import { X } from "lucide-react";
import { useId, useState } from "react";
// Direct imports, not ../index.js: that pulls in the theme (matchMedia), which tests don't have.
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Label } from "../components/Label.js";
import { SegmentedControl } from "../components/SegmentedControl.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select.js";
import { ME, conditionPresets, resourceTypesFor, type ActionOption, type ResourceOption } from "./statements.js";

const ANY_KIND = "any";

/**
 * One policy statement as a form: allow/deny, actions (picked from the
 * installed ones or typed with wildcards), reads/changes, and, when an
 * action checks records, which records it applies to.
 */
export function StatementEditor({
  statement,
  onChange,
  onRemove,
  actions,
  resources,
}: {
  statement: PolicyStatement;
  onChange(next: PolicyStatement): void;
  onRemove(): void;
  actions: readonly ActionOption[];
  resources: readonly ResourceOption[];
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const types = resourceTypesFor(statement.actions, actions);
  const conditions = Object.entries(statement.conditions ?? {});
  const records = (statement.resources ?? []).filter((r) => r !== "*");
  const scoped = conditions.length > 0 || records.length > 0;
  const set = (patch: Partial<PolicyStatement>) => {
    const next = { ...statement, ...patch } as Record<string, unknown>;
    // Keep the JSON tidy: drop empty optional parts.
    for (const key of ["notActions", "resources"] as const) if (Array.isArray(next[key]) && (next[key] as unknown[]).length === 0) delete next[key];
    if (next.conditions && Object.keys(next.conditions as object).length === 0) delete next.conditions;
    if (next.kind === undefined) delete next.kind;
    onChange(next as unknown as PolicyStatement);
  };
  const addAction = (value: string) => {
    const action = value.trim();
    if (action && !statement.actions.includes(action)) set({ actions: [...statement.actions, action] });
    setDraft("");
  };
  const modules = [...new Set(actions.map((a) => a.action.split(":")[0]!))].map((m) => `${m}:*`);
  const setCondition = (key: string, value: string | undefined, previousKey = key) => {
    const next = Object.fromEntries(conditions.filter(([k]) => k !== previousKey));
    if (value !== undefined) next[key] = value;
    set({ conditions: next });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Effect"
          value={statement.effect}
          onValueChange={(effect) => set({ effect })}
          options={[
            { value: "allow", label: "Allow" },
            { value: "deny", label: "Deny" },
          ]}
        />
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-action`}>Actions</Label>
        <div className="flex flex-wrap gap-1.5">
          {statement.actions.map((action) => (
            <Badge key={action} variant="secondary" className="gap-1 font-mono">
              {action}
              <button type="button" aria-label={`Remove ${action}`} className="bg-transparent" onClick={() => set({ actions: statement.actions.filter((a) => a !== action) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id={`${id}-action`}
            list={`${id}-actions`}
            className="font-mono text-xs"
            placeholder="clients:list, clients:*, *"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAction(draft);
              }
            }}
          />
          <Button type="button" variant="secondary" disabled={!draft.trim()} onClick={() => addAction(draft)}>
            Add
          </Button>
        </div>
        <datalist id={`${id}-actions`}>
          {[...modules, ...actions.map((a) => a.action)].map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kind</Label>
        <Select value={statement.kind ?? ANY_KIND} onValueChange={(v) => set({ kind: v === ANY_KIND ? undefined : (v as "query" | "command") })}>
          <SelectTrigger aria-label="Kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_KIND}>Reads and changes</SelectItem>
            <SelectItem value="query">Reads only</SelectItem>
            <SelectItem value="command">Changes only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(types.length > 0 || scoped) && (
        <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-2.5">
          <Label>Applies to</Label>
          <SegmentedControl
            aria-label="Applies to"
            value={scoped ? "some" : "all"}
            onValueChange={(v) => {
              if (v === "all") return set({ resources: undefined, conditions: undefined });
              const attribute = firstAttribute(types, resources);
              if (attribute) setCondition(attribute, ME);
              else set({ resources: [`${types[0]}/*`] });
            }}
            options={[
              { value: "all", label: "All records" },
              { value: "some", label: "Only some" },
            ]}
          />
          {scoped && (
            <>
              {types.map((type) => {
                const resource = resources.find((r) => r.type === type);
                return (
                  resource && (
                    <div key={type} className="flex flex-wrap gap-1.5">
                      {conditionPresets(resource).map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant={statement.conditions?.[preset.key] === preset.value ? "default" : "secondary"}
                          onClick={() => setCondition(preset.key, statement.conditions?.[preset.key] === preset.value ? undefined : preset.value)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  )
                );
              })}
              {conditions.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input aria-label="Attribute" className="font-mono text-xs" value={key} onChange={(e) => setCondition(e.target.value, Array.isArray(value) ? value.join(",") : value, key)} />
                  <span className="text-sm text-muted-foreground">is</span>
                  <Input
                    aria-label="Value"
                    className="font-mono text-xs"
                    value={Array.isArray(value) ? value.join(",") : value}
                    onChange={(e) => setCondition(key, e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${key}`} onClick={() => setCondition(key, undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                <code>{ME}</code> is the person asking. Records can also be named in <code>resources</code> (Advanced), e.g.{" "}
                <code>{types[0] ?? "module:type"}/42</code>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function firstAttribute(types: readonly string[], resources: readonly ResourceOption[]): string | undefined {
  for (const type of types) {
    const resource = resources.find((r) => r.type === type);
    const preset = resource && conditionPresets(resource)[0];
    if (preset) return preset.key;
  }
  return undefined;
}
