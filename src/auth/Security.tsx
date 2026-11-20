import {
  ApiError,
  generateRecoveryKey,
  useAuthStatus,
  useChangeLoginPassword,
  useChangePassword,
  useRegisterRecoveryKey,
  useRevokeVaultMethod,
  useVaultMethods,
  type VaultMethod,
} from "@hakeee/vault-service-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../index.js";
import { WhenUnlocked, useAccessState } from "@hakeee/module-host/web";
import type { ReactNode } from "react";
import { useState, type FormEvent } from "react";
import { clearRecovered, wasRecovered } from "./recovered.js";
import { AddPasskey } from "./AddPasskey.js";
import { LockedNotice } from "./Unlock.js";

/** The ways this account can unlock its vault. Managing them needs the vault unlocked. */
export function SecurityPage() {
  return (
    <WhenUnlocked
      fallback={
        <main className="flex flex-col items-center gap-4 p-6">
          <h1 className="w-full max-w-xl text-2xl font-semibold">Security</h1>
          <LockedNotice what="your passkeys, recovery key and passphrase settings" />
        </main>
      }
    >
      <UnlockedSecurityPage />
    </WhenUnlocked>
  );
}

function UnlockedSecurityPage() {
  const methods = useVaultMethods();
  const list = methods.data?.methods ?? [];
  const passkeys = list.filter((m) => m.method === "passkey");
  const recovery = list.find((m) => m.method === "recovery");

  return (
    <main className="flex flex-col items-center gap-4 p-6">
      <h1 className="w-full max-w-xl text-2xl font-semibold">Security</h1>
      {methods.isError && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>Couldn't load your unlock methods.</AlertDescription>
        </Alert>
      )}
      <PasskeysCard passkeys={passkeys} loading={methods.isPending} />
      <RecoveryKeyCard existing={recovery} loading={methods.isPending} />
      <PassphraseCard />
      <LoginPasswordCard />
    </main>
  );
}

export function PassphraseCard() {
  const [recovered] = useState(wasRecovered);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useChangePassword();
  const mismatch = confirm !== "" && password !== confirm;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || mismatch) return;
    change.mutate(password, {
      onSuccess: () => {
        setPassword("");
        setConfirm("");
        clearRecovered();
      },
    });
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Passphrase</CardTitle>
        <CardDescription>
          Always works, on any device. If you forget it, only your recovery key gets you back in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PolicyGate action="vault:changePassphrase">
        <form onSubmit={submit} className="flex flex-col gap-3">
          {recovered && !change.isSuccess && (
            <Alert variant="destructive">
              <AlertDescription>You unlocked with your recovery key. Choose a new passphrase now.</AlertDescription>
            </Alert>
          )}
          <Input
            type="password"
            autoFocus={recovered}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New passphrase (at least 8 characters)"
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new passphrase"
            autoComplete="new-password"
          />
          {mismatch && <p className="text-sm text-destructive">The passphrases don't match.</p>}
          {change.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {change.error instanceof ApiError && change.error.status === 400 ? "Choose a passphrase of at least 8 characters." : "Couldn't change it - try again."}
              </AlertDescription>
            </Alert>
          )}
          {change.isSuccess && <p className="text-sm text-muted-foreground">Passphrase changed. The old one no longer works.</p>}
          <div>
            <Button type="submit" variant="secondary" disabled={change.isPending || password.length < 8 || password !== confirm}>
              {change.isPending ? "Changing…" : "Change passphrase"}
            </Button>
          </div>
        </form>
        </PolicyGate>
      </CardContent>
    </Card>
  );
}

export function PasskeysCard({ passkeys, loading }: { passkeys: VaultMethod[]; loading: boolean }) {
  const revoke = useRevokeVaultMethod();
  const [removing, setRemoving] = useState<VaultMethod | null>(null);

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Unlock with this device's fingerprint, face or PIN instead of typing the passphrase. Add one per device.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!loading && passkeys.length === 0 && <p className="text-sm text-muted-foreground">No passkeys yet.</p>}
        {passkeys.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{m.label ?? "Passkey"}</span>
              <span className="text-xs text-muted-foreground">
                Added {formatDate(m.createdAt)} · {m.lastUsedAt ? `last used ${formatDate(m.lastUsedAt)}` : "never used"}
              </span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setRemoving(m)}>
              Remove
            </Button>
          </div>
        ))}
        <PolicyGate action="vault:registerPasskey">
          <AddPasskey />
        </PolicyGate>
      </CardContent>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove passkey?</DialogTitle>
            <DialogDescription>
              “{removing?.label ?? "Passkey"}” will no longer unlock your vault. Your data isn't affected.
            </DialogDescription>
          </DialogHeader>
          {revoke.isError && (
            <Alert variant="destructive">
              <AlertDescription>Couldn't remove it - try again.</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => removing && revoke.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function RecoveryKeyCard({ existing, loading }: { existing: VaultMethod | undefined; loading: boolean }) {
  // The key exists only in this component's state until it's saved: the
  // server stores it wrapped and can never show it again.
  const [key, setKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const register = useRegisterRecoveryKey();
  // Don't urge creating one when the organization's policy forbids it.
  const recoveryAllowed = useAccessState("vault:setRecoveryKey") === "allowed";

  function start() {
    register.reset();
    setSaved(false);
    setCopied(false);
    setKey(generateRecoveryKey());
  }

  function close() {
    setKey(null);
  }

  async function copy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      // Clipboard needs a secure context; the key is still selectable.
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Recovery key</CardTitle>
        <CardDescription>
          Unlocks your vault if you forget the passphrase. Store it offline: printed, or in a password manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!loading && !existing && recoveryAllowed && (
          <Alert variant="destructive">
            <AlertDescription>
              You don't have one. If you forget your passphrase, your data can't be recovered.
            </AlertDescription>
          </Alert>
        )}
        {existing && <p className="text-sm text-muted-foreground">Created {formatDate(existing.createdAt)}.</p>}
        <PolicyGate action="vault:setRecoveryKey">
          <div>
            <Button type="button" variant={existing ? "secondary" : "default"} disabled={loading} onClick={start}>
              {existing ? "Replace recovery key" : "Create recovery key"}
            </Button>
          </div>
        </PolicyGate>
      </CardContent>

      <Dialog open={key !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your recovery key</DialogTitle>
            <DialogDescription>
              This is the only time it's shown.
              {existing && " Saving it replaces your current recovery key, which stops working."}
            </DialogDescription>
          </DialogHeader>
          <code className="select-all break-all rounded-md border border-border bg-muted p-3 text-center font-mono text-sm">
            {key}
          </code>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="recovery-saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
            <Label htmlFor="recovery-saved">I've stored it somewhere safe</Label>
          </div>
          {register.isError && (
            <Alert variant="destructive">
              <AlertDescription>Couldn't save it - try again.</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!saved || register.isPending}
              onClick={() => key && register.mutate(key, { onSuccess: close })}
            >
              {register.isPending ? "Saving…" : "Save recovery key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** The password you log in with (single mode) - separate from the vault passphrase. */
export function LoginPasswordCard() {
  const mode = useAuthStatus().data?.mode;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useChangeLoginPassword();
  if (mode !== "single") return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    change.mutate({ currentPassword: current, newPassword: next }, { onSuccess: () => (setCurrent(""), setNext("")) });
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Login password</CardTitle>
        <CardDescription>What you log in with. Change it if someone gave you a temporary one. Your vault passphrase stays the same.</CardDescription>
      </CardHeader>
      <CardContent>
        <PolicyGate action="auth:changePassword">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" />
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (at least 8 characters)" autoComplete="new-password" />
          {change.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {change.error instanceof ApiError && change.error.status === 401 ? "That's not your current password." : "Couldn't change it - try again."}
              </AlertDescription>
            </Alert>
          )}
          {change.isSuccess && <p className="text-sm text-muted-foreground">Login password changed.</p>}
          <div>
            <Button type="submit" variant="secondary" disabled={change.isPending || !current || next.length < 8}>
              Change login password
            </Button>
          </div>
        </form>
        </PolicyGate>
      </CardContent>
    </Card>
  );
}

/**
 * Self-service features an organization's policy can turn off (module-host
 * IAM deny rules). Without IAM everything is allowed. Nothing renders while
 * permissions load, so a feature doesn't flash its "not allowed" note.
 */
function PolicyGate({ action, children }: { action: string; children: ReactNode }) {
  const state = useAccessState(action);
  if (state === "loading") return null;
  if (state === "denied") return <p className="text-sm text-muted-foreground">Your organization's policy doesn't allow this.</p>;
  return <>{children}</>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
