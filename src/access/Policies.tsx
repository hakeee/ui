import { iamContract, policyDocumentSchema, type PolicyDocument, type PolicyStatement } from "@hakeee/module-host/iam";
import { useRefreshAccess } from "@hakeee/module-host/iam/web";
import { useCan, useVaultUnlocked } from "@hakeee/module-host/web";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  SegmentedControl,
  Textarea,
} from "../index.js";
import { useState } from "react";
import { AccessLayout, errorText, iamUi } from "./shared.js";
import { StatementEditor } from "./StatementEditor.js";
import { describeStatement } from "./statements.js";

type Policy = { name: string; description: string; managed: boolean; document: unknown };

const EMPTY: PolicyDocument = { version: 1, statements: [{ effect: "allow", actions: [] }] };

const parse = (text: string) => {
  try {
    const result = policyDocumentSchema.safeParse(JSON.parse(text));
    return result.success ? ({ ok: true, document: result.data as PolicyDocument } as const) : ({ ok: false, error: result.error.issues[0]?.message ?? "invalid policy" } as const);
  } catch {
    return { ok: false, error: "not valid JSON" } as const;
  }
};

export function PoliciesPage() {
  const iam = iamUi.useModule(iamContract);
  const policies = iam.queries.policies.useQuery({});
  const unlocked = useVaultUnlocked();
  const canPut = useCan("iam:putPolicy");
  const canDelete = useCan("iam:deletePolicy");
  const refreshAccess = useRefreshAccess();
  const [editing, setEditing] = useState<Policy | "new" | null>(null);
  const remove = iam.commands.deletePolicy.useMutation({
    onSuccess: () => Promise.all([iam.queries.policies.invalidate(), iam.queries.roles.invalidate(), refreshAccess()]),
  });

  return (
    <AccessLayout
      current="policies"
      actions={
        canPut && (
          <Button type="button" size="sm" disabled={!unlocked} onClick={() => setEditing("new")}>
            New policy
          </Button>
        )
      }
    >
      {remove.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorText(remove.error)}</AlertDescription>
        </Alert>
      )}
      {(policies.data ?? []).map((policy) => (
        <Card key={policy.name}>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                {policy.name}
                {policy.managed && <Badge variant="outline">managed</Badge>}
              </CardTitle>
              {policy.description && <CardDescription>{policy.description}</CardDescription>}
            </div>
            {!policy.managed && (
              <div className="flex gap-2">
                {canPut && (
                  <Button type="button" variant="secondary" size="sm" disabled={!unlocked} onClick={() => setEditing(policy)}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!unlocked || remove.isPending}
                    onClick={() => confirm(`Delete policy "${policy.name}"? Roles using it lose what it granted.`) && remove.mutate({ name: policy.name })}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1 text-sm">
              {(policy.document as PolicyDocument).statements.map((statement, i) => (
                <li key={i}>{describeStatement(statement)}</li>
              ))}
            </ul>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">JSON</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3">{JSON.stringify(policy.document, null, 2)}</pre>
            </details>
          </CardContent>
        </Card>
      ))}
      {editing && <PolicyDialog policy={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </AccessLayout>
  );
}

function PolicyDialog({ policy, onClose }: { policy?: Policy; onClose: () => void }) {
  const iam = iamUi.useModule(iamContract);
  const actions = iam.queries.actions.useQuery({});
  const resources = iam.queries.resources.useQuery({});
  const refreshAccess = useRefreshAccess();
  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [mode, setMode] = useState<"builder" | "json">("builder");
  // The document is the source of truth; the JSON tab edits text and only replaces it when the text parses.
  const [document, setDocument] = useState<PolicyDocument>((policy?.document as PolicyDocument | undefined) ?? EMPTY);
  const [text, setText] = useState(JSON.stringify(document, null, 2));
  const parsed = mode === "json" ? parse(text) : ({ ok: true, document } as const);
  const statements = document.statements;
  const setStatements = (next: PolicyStatement[]) => {
    const doc = { version: 1 as const, statements: next };
    setDocument(doc);
    setText(JSON.stringify(doc, null, 2));
  };
  const save = iam.commands.putPolicy.useMutation({
    onSuccess: async () => {
      await Promise.all([iam.queries.policies.invalidate(), refreshAccess()]);
      onClose();
    },
  });
  const empty = parsed.ok && parsed.document.statements.some((s) => s.actions.length === 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? `Edit ${policy.name}` : "New policy"}</DialogTitle>
          <DialogDescription>
            Statements allow or deny actions (<code>module:operation</code>, <code>*</code> wildcards). A deny beats any allow; anything not
            allowed is denied. Actions that work on records (clients, sessions) can be limited to some of them.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Name, e.g. NotesEditor" value={name} disabled={policy !== undefined} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <SegmentedControl
          aria-label="Editor"
          value={mode}
          onValueChange={(next) => {
            if (next === "builder") {
              const result = parse(text);
              if (!result.ok) return;
              setDocument(result.document);
            } else setText(JSON.stringify(document, null, 2));
            setMode(next);
          }}
          options={[
            { value: "builder", label: "Builder" },
            { value: "json", label: "Advanced (JSON)" },
          ]}
        />
        {mode === "builder" ? (
          <div className="flex flex-col gap-3">
            {statements.map((statement, i) => (
              <StatementEditor
                key={i}
                statement={statement}
                actions={actions.data ?? []}
                resources={resources.data ?? []}
                onChange={(next) => setStatements(statements.map((s, j) => (j === i ? next : s)))}
                onRemove={() => setStatements(statements.filter((_, j) => j !== i))}
              />
            ))}
            <Button type="button" variant="secondary" onClick={() => setStatements([...statements, { effect: "allow", actions: [] }])}>
              Add statement
            </Button>
          </div>
        ) : (
          <>
            <Textarea className="min-h-48 font-mono text-xs" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
            {!parsed.ok && <p className="text-sm text-destructive">{parsed.error}</p>}
          </>
        )}
        {empty && <p className="text-sm text-muted-foreground">Every statement needs at least one action.</p>}
        {save.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorText(save.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={save.isPending || !name || !parsed.ok || empty}
            onClick={() => parsed.ok && save.mutate({ name, description, document: parsed.document })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
