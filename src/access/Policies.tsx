import { iamContract, policyDocumentSchema } from "@hakeee/module-host/iam";
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
  Textarea,
} from "../index.js";
import { useMemo, useState } from "react";
import { AccessLayout, errorText, iamUi } from "./shared.js";

type Policy = { name: string; description: string; managed: boolean; document: unknown };

const EXAMPLE = JSON.stringify(
  { version: 1, statements: [{ effect: "allow", actions: ["home:*"] }, { effect: "deny", actions: ["home:me"] }] },
  null,
  2,
);

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
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(policy.document, null, 2)}</pre>
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
  const refreshAccess = useRefreshAccess();
  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [text, setText] = useState(policy ? JSON.stringify(policy.document, null, 2) : EXAMPLE);
  const parsed = useMemo(() => {
    try {
      const result = policyDocumentSchema.safeParse(JSON.parse(text));
      return result.success
        ? ({ ok: true, document: result.data } as const)
        : ({ ok: false, error: result.error.issues[0]?.message ?? "invalid policy" } as const);
    } catch {
      return { ok: false, error: "not valid JSON" } as const;
    }
  }, [text]);
  const save = iam.commands.putPolicy.useMutation({
    onSuccess: async () => {
      await Promise.all([iam.queries.policies.invalidate(), refreshAccess()]);
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{policy ? `Edit ${policy.name}` : "New policy"}</DialogTitle>
          <DialogDescription>
            Statements allow or deny actions (<code>module:operation</code>, <code>*</code> wildcards). A deny beats any allow; anything not
            allowed is denied. <code>kind</code> limits a statement to queries or commands; <code>notActions</code> carves out exceptions.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Name, e.g. NotesEditor" value={name} disabled={policy !== undefined} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Textarea className="min-h-48 font-mono text-xs" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
        {!parsed.ok && <p className="text-sm text-destructive">{parsed.error}</p>}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Available actions ({actions.data?.length ?? 0})</summary>
          <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-xs">
            {(actions.data ?? []).map((a) => (
              <li key={a.action}>
                {a.action} <span className="text-muted-foreground">({a.kind})</span>
              </li>
            ))}
          </ul>
        </details>
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
            disabled={save.isPending || !name || !parsed.ok}
            onClick={() => parsed.ok && save.mutate({ name, description, document: parsed.document })}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
