import { iamContract } from "@hakeee/module-host/iam";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../index.js";
import { useState } from "react";
import { AccessLayout, Checklist, errorText, iamUi } from "./shared.js";

type Role = { name: string; description: string; policies: string[] };

export function RolesPage() {
  const iam = iamUi.useModule(iamContract);
  const roles = iam.queries.roles.useQuery({});
  const policies = iam.queries.policies.useQuery({});
  const unlocked = useVaultUnlocked();
  const canPut = useCan("iam:putRole");
  const canDelete = useCan("iam:deleteRole");
  const refreshAccess = useRefreshAccess();
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const remove = iam.commands.deleteRole.useMutation({
    onSuccess: () => Promise.all([iam.queries.roles.invalidate(), iam.queries.users.invalidate(), refreshAccess()]),
  });

  return (
    <AccessLayout
      current="roles"
      actions={
        canPut && (
          <Button type="button" size="sm" disabled={!unlocked} onClick={() => setEditing("new")}>
            New role
          </Button>
        )
      }
    >
      {remove.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorText(remove.error)}</AlertDescription>
        </Alert>
      )}
      {(roles.data ?? []).map((role) => (
        <Card key={role.name}>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>{role.name}</CardTitle>
              {role.description && <CardDescription>{role.description}</CardDescription>}
            </div>
            <div className="flex gap-2">
              {canPut && (
                <Button type="button" variant="secondary" size="sm" disabled={!unlocked} onClick={() => setEditing(role)}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!unlocked || remove.isPending}
                  onClick={() => confirm(`Delete role "${role.name}"? Users lose what it granted.`) && remove.mutate({ name: role.name })}
                >
                  Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {role.policies.length === 0 ? (
              <span className="text-sm text-muted-foreground">No policies: grants nothing.</span>
            ) : (
              role.policies.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      ))}
      {editing && (
        <RoleDialog
          role={editing === "new" ? undefined : editing}
          policyOptions={(policies.data ?? []).map((p) => ({ name: p.name, hint: p.description }))}
          onClose={() => setEditing(null)}
        />
      )}
    </AccessLayout>
  );
}

function RoleDialog({ role, policyOptions, onClose }: { role?: Role; policyOptions: { name: string; hint?: string }[]; onClose: () => void }) {
  const iam = iamUi.useModule(iamContract);
  const refreshAccess = useRefreshAccess();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [policies, setPolicies] = useState(role?.policies ?? []);
  const save = iam.commands.putRole.useMutation({
    onSuccess: async () => {
      await Promise.all([iam.queries.roles.invalidate(), refreshAccess()]);
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
        </DialogHeader>
        <Input placeholder="Name, e.g. editor" value={name} disabled={role !== undefined} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Label>Policies</Label>
        <Checklist options={policyOptions} value={policies} onChange={setPolicies} />
        {save.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorText(save.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={save.isPending || !name} onClick={() => save.mutate({ name, description, policies })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
