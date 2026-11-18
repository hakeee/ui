import { iamContract } from "@hakeee/module-host/iam";
import { useRefreshAccess } from "@hakeee/module-host/iam/web";
import { useCan, useVaultUnlocked } from "@hakeee/module-host/web";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../index.js";
import { useState, type FormEvent } from "react";
import { AccessLayout, Checklist, errorText, iamUi } from "./shared.js";

type User = { id: number; email: string; displayName: string; root: boolean; roles: { name: string; source: "manual" | "oidc" }[] };

export function UsersPage() {
  const iam = iamUi.useModule(iamContract);
  const users = iam.queries.users.useQuery({});
  const roles = iam.queries.roles.useQuery({});
  const settings = iam.queries.settings.useQuery({});
  const unlocked = useVaultUnlocked();
  const canCreate = useCan("iam:createUser") && settings.data?.canCreateUsers === true;
  const canEdit = useCan("iam:setUserRoles");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const roleOptions = (roles.data ?? []).map((r) => ({ name: r.name, hint: r.description || r.policies.join(", ") }));

  return (
    <AccessLayout
      current="users"
      actions={
        canCreate && (
          <Button type="button" size="sm" disabled={!unlocked} onClick={() => setCreating(true)}>
            Create account
          </Button>
        )
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users.data ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="font-medium">{u.displayName}</div>
                {u.displayName !== u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {u.root && <Badge>root</Badge>}
                  {u.roles.map((r) => (
                    <Badge key={`${r.name}-${r.source}`} variant={r.source === "oidc" ? "outline" : "secondary"} title={r.source === "oidc" ? "From the identity provider" : undefined}>
                      {r.name}
                      {r.source === "oidc" && " (IdP)"}
                    </Badge>
                  ))}
                  {!u.root && u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles: can't do anything</span>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {canEdit && !u.root && (
                  <Button type="button" variant="secondary" size="sm" disabled={!unlocked} onClick={() => setEditing(u)}>
                    Edit roles
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing && <EditRolesDialog user={editing} roleOptions={roleOptions} onClose={() => setEditing(null)} />}
      {creating && <CreateUserDialog roleOptions={roleOptions} onClose={() => setCreating(false)} />}
    </AccessLayout>
  );
}

function EditRolesDialog({ user, roleOptions, onClose }: { user: User; roleOptions: { name: string; hint?: string }[]; onClose: () => void }) {
  const iam = iamUi.useModule(iamContract);
  const refreshAccess = useRefreshAccess();
  const [roles, setRoles] = useState(user.roles.filter((r) => r.source === "manual").map((r) => r.name));
  const save = iam.commands.setUserRoles.useMutation({
    onSuccess: async () => {
      await Promise.all([iam.queries.users.invalidate(), refreshAccess()]);
      onClose();
    },
  });
  const fromIdp = user.roles.filter((r) => r.source === "oidc").map((r) => r.name);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roles for {user.displayName}</DialogTitle>
          <DialogDescription>
            {fromIdp.length > 0 ? `From the identity provider (changed there): ${fromIdp.join(", ")}.` : "Roles grant the policies attached to them."}
          </DialogDescription>
        </DialogHeader>
        <Checklist options={roleOptions} value={roles} onChange={setRoles} />
        {save.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorText(save.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate({ userId: user.id, roles })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({ roleOptions, onClose }: { roleOptions: { name: string; hint?: string }[]; onClose: () => void }) {
  const iam = iamUi.useModule(iamContract);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState(() => temporaryPassword());
  const [roles, setRoles] = useState<string[]>(roleOptions.some((r) => r.name === "member") ? ["member"] : []);
  const create = iam.commands.createUser.useMutation({ onSuccess: () => void iam.queries.users.invalidate() });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ email, password, displayName: displayName || undefined, roles });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {create.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Account created</DialogTitle>
              <DialogDescription>
                Give {email} this temporary password. They can change it on the Security page, and they'll choose their own vault passphrase -
                you can't read their data.
              </DialogDescription>
            </DialogHeader>
            <code className="select-all rounded-md border border-border bg-muted p-3 text-center font-mono text-sm">{password}</code>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>Create account</DialogTitle>
              <DialogDescription>Sets a login password only. The person picks their own vault passphrase on first unlock.</DialogDescription>
            </DialogHeader>
            <Input type="email" required autoFocus placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="temp-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input id="temp-password" className="font-mono" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="button" variant="secondary" onClick={() => setPassword(temporaryPassword())}>
                  New
                </Button>
              </div>
            </div>
            <Label>Roles</Label>
            <Checklist options={roleOptions} value={roles} onChange={setRoles} />
            {create.isError && (
              <Alert variant="destructive">
                <AlertDescription>{errorText(create.error)}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !email || password.length < 8}>
                Create
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function temporaryPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
}
