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

type User = {
  id: number;
  email: string;
  displayName: string;
  root: boolean;
  disabled: boolean;
  roles: { name: string; source: "manual" | "oidc" }[];
};
type Settings = { canCreateUsers: boolean; canDisableUsers: boolean; canResetPasswords: boolean; canRevokeSessions: boolean };

export function UsersPage() {
  const iam = iamUi.useModule(iamContract);
  const users = iam.queries.users.useQuery({});
  const roles = iam.queries.roles.useQuery({});
  const settings = iam.queries.settings.useQuery({});
  const unlocked = useVaultUnlocked();
  const canCreate = useCan("iam:createUser") && settings.data?.canCreateUsers === true;
  const canManage = [
    useCan("iam:setUserRoles"),
    useCan("iam:disableUser"),
    useCan("iam:resetPassword"),
    useCan("iam:revokeSessions"),
  ].some(Boolean);
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
                  {u.disabled && <Badge variant="destructive">disabled</Badge>}
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
                {canManage && !u.root && (
                  <Button type="button" variant="secondary" size="sm" disabled={!unlocked} onClick={() => setEditing(u)}>
                    Manage
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing && (
        <ManageUserDialog
          user={(users.data ?? []).find((u) => u.id === editing.id) ?? editing}
          roleOptions={roleOptions}
          settings={settings.data}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && <CreateUserDialog roleOptions={roleOptions} onClose={() => setCreating(false)} />}
    </AccessLayout>
  );
}

/** Everything an admin can do to someone else's account. Each part shows only if they're allowed it. */
function ManageUserDialog({
  user,
  roleOptions,
  settings,
  onClose,
}: {
  user: User;
  roleOptions: { name: string; hint?: string }[];
  settings: Settings | undefined;
  onClose: () => void;
}) {
  const iam = iamUi.useModule(iamContract);
  const refreshAccess = useRefreshAccess();
  const refresh = () => Promise.all([iam.queries.users.invalidate(), refreshAccess()]);
  const [roles, setRoles] = useState(user.roles.filter((r) => r.source === "manual").map((r) => r.name));
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const saveRoles = iam.commands.setUserRoles.useMutation({ onSuccess: refresh });
  const disable = iam.commands.disableUser.useMutation({ onSuccess: refresh });
  const enable = iam.commands.enableUser.useMutation({ onSuccess: refresh });
  const revoke = iam.commands.revokeSessions.useMutation();
  const reset = iam.commands.resetPassword.useMutation();
  // Every hook called every render (no short-circuiting), then combined.
  const canRoles = useCan("iam:setUserRoles");
  const mayDisable = useCan("iam:disableUser");
  const mayEnable = useCan("iam:enableUser");
  const mayReset = useCan("iam:resetPassword");
  const mayRevoke = useCan("iam:revokeSessions");
  const canDisable = mayDisable && mayEnable && settings?.canDisableUsers === true;
  const canReset = mayReset && settings?.canResetPasswords === true;
  const canRevoke = mayRevoke && settings?.canRevokeSessions === true;
  const fromIdp = user.roles.filter((r) => r.source === "oidc").map((r) => r.name);
  const error = [saveRoles, disable, enable, revoke, reset].map((m) => errorText(m.error)).find(Boolean);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.displayName}</DialogTitle>
          <DialogDescription>
            {[user.displayName !== user.email ? user.email : null, user.disabled ? "disabled" : null].filter(Boolean).join(" · ") || "Active account"}
          </DialogDescription>
        </DialogHeader>

        {canRoles && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Roles</h3>
            {fromIdp.length > 0 && <p className="text-xs text-muted-foreground">From the identity provider (changed there): {fromIdp.join(", ")}.</p>}
            <Checklist options={roleOptions} value={roles} onChange={setRoles} />
            <div>
              <Button type="button" size="sm" disabled={saveRoles.isPending} onClick={() => saveRoles.mutate({ userId: user.id, roles })}>
                {saveRoles.isSuccess ? "Saved" : "Save roles"}
              </Button>
            </div>
          </section>
        )}

        {(canReset || canRevoke || canDisable) && (
          <section className="flex flex-col gap-2 border-t border-border pt-3">
            <h3 className="text-sm font-medium">Account</h3>
            {canReset &&
              (newPassword && reset.isSuccess ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">New temporary login password - give it to them. Their vault passphrase is unchanged.</p>
                  <code className="select-all rounded-md border border-border bg-muted p-2 text-center font-mono text-sm">{newPassword}</code>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={reset.isPending}
                    onClick={() => {
                      const password = temporaryPassword();
                      setNewPassword(password);
                      reset.mutate({ userId: user.id, password });
                    }}
                  >
                    Reset login password
                  </Button>
                </div>
              ))}
            {canRevoke && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate({ userId: user.id })}>
                  Log out everywhere
                </Button>
                {revoke.isSuccess && <span className="text-xs text-muted-foreground">Logged out.</span>}
              </div>
            )}
            {canDisable && (
              <div>
                {user.disabled ? (
                  <Button type="button" variant="secondary" size="sm" disabled={enable.isPending} onClick={() => enable.mutate({ userId: user.id })}>
                    Enable account
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={disable.isPending}
                    onClick={() => confirm(`Disable ${user.displayName}? They're logged out everywhere and can't log in until enabled.`) && disable.mutate({ userId: user.id })}
                  >
                    Disable account
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
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
