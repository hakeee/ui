import { iamContract } from "@hakeee/module-host/iam";
import { useRefreshAccess } from "@hakeee/module-host/iam/web";
import { useCan, useVaultUnlocked } from "@hakeee/module-host/web";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  CopyField,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SegmentedControl,
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
  login: boolean;
  mfa: boolean | null;
  invite: { state: "pending" | "expired" | "accepted" | "revoked"; expiresAt: string } | null;
  roles: { name: string; source: "manual" | "oidc" }[];
};
type Settings = {
  canCreateUsers: boolean;
  canDisableUsers: boolean;
  canResetPasswords: boolean;
  canRevokeSessions: boolean;
  canInvite: boolean;
  emailsInvites: boolean;
  canResetMfa: boolean;
};
type SentInvite = { link: string | null; expiresAt: string; emailed: boolean };

/** Badges for where someone's login stands: an open or lapsed invite, or no second factor yet. */
function loginBadges(u: User) {
  if (u.invite && !u.login) {
    if (u.invite.state === "pending") return <Badge variant="outline" title={`Link works until ${formatDate(u.invite.expiresAt)}`}>invited</Badge>;
    return <Badge variant="destructive">{u.invite.state === "expired" ? "invite expired" : "invite revoked"}</Badge>;
  }
  if (u.login && u.mfa === false) return <Badge variant="outline" title="Asked to set up two-step login at the next login, where it's required">no two-step login</Badge>;
  return null;
}

export function UsersPage() {
  const iam = iamUi.useModule(iamContract);
  const users = iam.queries.users.useQuery({});
  const roles = iam.queries.roles.useQuery({});
  const settings = iam.queries.settings.useQuery({});
  const unlocked = useVaultUnlocked();
  const canCreate = useCan("iam:createUser") && (settings.data?.canCreateUsers === true || settings.data?.canInvite === true);
  const canManage = [
    useCan("iam:setUserRoles"),
    useCan("iam:disableUser"),
    useCan("iam:resetPassword"),
    useCan("iam:revokeSessions"),
    useCan("iam:invite"),
    useCan("iam:revokeInvite"),
    useCan("iam:resetMfa"),
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
            {settings.data?.canInvite ? "Invite user" : "Create account"}
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
                  {loginBadges(u)}
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
      {creating && settings.data && <CreateUserDialog roleOptions={roleOptions} settings={settings.data} onClose={() => setCreating(false)} />}
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
  const reinvite = iam.commands.invite.useMutation({ onSuccess: refresh });
  const revokeInvite = iam.commands.revokeInvite.useMutation({ onSuccess: refresh });
  const resetMfa = iam.commands.resetMfa.useMutation({ onSuccess: refresh });
  // Every hook called every render (no short-circuiting), then combined.
  const canRoles = useCan("iam:setUserRoles");
  const mayDisable = useCan("iam:disableUser");
  const mayEnable = useCan("iam:enableUser");
  const mayReset = useCan("iam:resetPassword");
  const mayRevoke = useCan("iam:revokeSessions");
  const mayInvite = useCan("iam:invite");
  const mayRevokeInvite = useCan("iam:revokeInvite");
  const mayResetMfa = useCan("iam:resetMfa");
  const canDisable = mayDisable && mayEnable && settings?.canDisableUsers === true;
  const canReset = mayReset && settings?.canResetPasswords === true;
  const canRevoke = mayRevoke && settings?.canRevokeSessions === true;
  // An invite matters until they've logged in once; after that it's history.
  const openInvite = user.invite !== null && !user.login;
  const canReinvite = openInvite && mayInvite && settings?.canInvite === true;
  const canRevokeInvite = openInvite && user.invite?.state === "pending" && mayRevokeInvite;
  // Kept after a reset (the refreshed list says no factor) so its confirmation stays visible.
  const canResetMfa = mayResetMfa && settings?.canResetMfa === true && (user.mfa === true || resetMfa.isSuccess);
  const fromIdp = user.roles.filter((r) => r.source === "oidc").map((r) => r.name);
  const error = [saveRoles, disable, enable, revoke, reset, reinvite, revokeInvite, resetMfa].map((m) => errorText(m.error)).find(Boolean);

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

        {(canReinvite || canRevokeInvite) && (
          <section className="flex flex-col gap-2 border-t border-border pt-3">
            <h3 className="text-sm font-medium">Invite</h3>
            <p className="text-xs text-muted-foreground">
              {user.invite?.state === "pending"
                ? `Not accepted yet. The link works until ${formatDate(user.invite.expiresAt)}.`
                : user.invite?.state === "expired"
                  ? "The link expired before they used it."
                  : "The link was revoked."}
            </p>
            {reinvite.data ? (
              <InviteSent invite={reinvite.data} email={user.email} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {canReinvite && (
                  <Button type="button" variant="secondary" size="sm" disabled={reinvite.isPending} onClick={() => reinvite.mutate({ userId: user.id })}>
                    {settings?.emailsInvites ? "Send a new invite" : "New invite link"}
                  </Button>
                )}
                {canRevokeInvite && (
                  <Button type="button" variant="secondary" size="sm" disabled={revokeInvite.isPending} onClick={() => revokeInvite.mutate({ userId: user.id })}>
                    Revoke invite
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {canResetMfa && (
          <section className="flex flex-col gap-2 border-t border-border pt-3">
            <h3 className="text-sm font-medium">Two-step login</h3>
            {resetMfa.isSuccess ? (
              <p className="text-xs text-muted-foreground">Reset. They're logged out and set up a new second step at their next login.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">For someone who lost their phone and recovery codes. Make sure it's really them asking.</p>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={resetMfa.isPending}
                    onClick={() => confirm(`Reset ${user.displayName}'s two-step login? Their authenticator apps, passkeys and recovery codes stop working.`) && resetMfa.mutate({ userId: user.id })}
                  >
                    Reset two-step login
                  </Button>
                </div>
              </>
            )}
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

/** What an admin sees after inviting: sent, or the link to pass on (shown once). */
function InviteSent({ invite, email }: { invite: SentInvite; email: string }) {
  if (invite.emailed) return <p className="text-sm text-muted-foreground">Invite emailed to {email}. The link works once, until {formatDate(invite.expiresAt)}.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Send {email} this link yourself. It works once, until {formatDate(invite.expiresAt)}, and isn't shown again.
      </p>
      {invite.link && <CopyField value={invite.link} label="Copy link" />}
    </div>
  );
}

function CreateUserDialog({ roleOptions, settings, onClose }: { roleOptions: { name: string; hint?: string }[]; settings: Settings; onClose: () => void }) {
  const iam = iamUi.useModule(iamContract);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  // Inviting is the normal way: the person sets their own password (and two-step login). A temporary password is the fallback.
  const [how, setHow] = useState<"invite" | "password">(settings.canInvite ? "invite" : "password");
  const [password, setPassword] = useState(() => temporaryPassword());
  const [roles, setRoles] = useState<string[]>(roleOptions.some((r) => r.name === "member") ? ["member"] : []);
  const create = iam.commands.createUser.useMutation({ onSuccess: () => void iam.queries.users.invalidate() });
  const byInvite = how === "invite";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ email, ...(byInvite ? {} : { password }), displayName: displayName || undefined, roles });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {create.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>{create.data.invite ? "Invited" : "Account created"}</DialogTitle>
              {!create.data.invite && (
                <DialogDescription>
                  Give {email} this temporary password. They can change it on the Security page, and they'll choose their own vault passphrase -
                  you can't read their data.
                </DialogDescription>
              )}
            </DialogHeader>
            {create.data.invite ? (
              <InviteSent invite={create.data.invite} email={email} />
            ) : (
              <code className="select-all rounded-md border border-border bg-muted p-3 text-center font-mono text-sm">{password}</code>
            )}
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>{settings.canInvite ? "Invite user" : "Create account"}</DialogTitle>
              <DialogDescription>
                {byInvite
                  ? settings.emailsInvites
                    ? "They get an email with a link to set up their login. You choose their roles now."
                    : "You get a link to send them; it sets up their login. You choose their roles now."
                  : "Sets a login password only. The person picks their own vault passphrase on first unlock."}
              </DialogDescription>
            </DialogHeader>
            {settings.canInvite && settings.canCreateUsers && (
              <SegmentedControl
                aria-label="How they get in"
                value={how}
                onValueChange={setHow}
                options={[
                  { value: "invite", label: "Invite link" },
                  { value: "password", label: "Temporary password" },
                ]}
              />
            )}
            <Input type="email" required autoFocus placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            {!byInvite && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="temp-password">Temporary password</Label>
                <div className="flex gap-2">
                  <Input id="temp-password" className="font-mono" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button type="button" variant="secondary" onClick={() => setPassword(temporaryPassword())}>
                    New
                  </Button>
                </div>
              </div>
            )}
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
              <Button type="submit" disabled={create.isPending || !email || (!byInvite && password.length < 8)}>
                {create.isPending ? "Working…" : byInvite ? (settings.emailsInvites ? "Send invite" : "Create invite link") : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function temporaryPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
}
