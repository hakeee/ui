import { actionMatches, type PolicyStatement } from "@hakeee/module-host/iam";

export type ActionOption = { action: string; kind: string; resource?: string };
export type ResourceOption = { type: string; description?: string; attributes: string[] };

export const ME = "${user.id}";

const list = (items: readonly string[]) => (items.length <= 3 ? items.join(", ") : `${items.slice(0, 3).join(", ")} and ${items.length - 3} more`);
const attributeName = (key: string) => key.split(":")[1] ?? key;
const valueText = (value: string) => (value === ME ? "you" : value === "true" ? "yes" : value === "false" ? "no" : value);

/** One statement in plain words, for the policy list. */
export function describeStatement(statement: PolicyStatement): string {
  const parts = [`${statement.effect === "allow" ? "Allow" : "Deny"} ${list(statement.actions)}`];
  if (statement.notActions?.length) parts.push(`except ${list(statement.notActions)}`);
  if (statement.kind) parts.push(statement.kind === "query" ? "(reads only)" : "(changes only)");
  const records = (statement.resources ?? []).filter((r) => r !== "*");
  if (records.length) parts.push(`on ${list(records.map((r) => r.replace(ME, "you")))}`);
  const conditions = Object.entries(statement.conditions ?? {});
  if (conditions.length) {
    parts.push(
      `where ${conditions
        .map(([key, value]) => {
          const values = (Array.isArray(value) ? value : [value]).map(valueText);
          return `${attributeName(key)} ${values.length > 1 ? "is one of" : "is"} ${values.join(", ")}`;
        })
        .join(" and ")}`,
    );
  }
  return parts.join(" ");
}

/** The record types the statement's actions check, so the editor knows whether to offer "Applies to". */
export function resourceTypesFor(actions: readonly string[], options: readonly ActionOption[]): string[] {
  const types = new Set<string>();
  for (const option of options) {
    if (option.resource && actions.some((pattern) => actionMatches(pattern, option.action))) types.add(option.resource);
  }
  return [...types].sort();
}

/** Ready-made conditions for a record type: "includes me" for id lists, yes/no for flags (guessed from the name). */
export function conditionPresets(resource: ResourceOption): { label: string; key: string; value: string }[] {
  return resource.attributes.flatMap((key) => {
    const name = attributeName(key);
    return /^(is|has)?[a-z]*(archived|active|deleted|hidden|shared|private)$/i.test(name)
      ? [
          { label: `${name}: yes`, key, value: "true" },
          { label: `${name}: no`, key, value: "false" },
        ]
      : [{ label: `${name} includes me`, key, value: ME }];
  });
}
