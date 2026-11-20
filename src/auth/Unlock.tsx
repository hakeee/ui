import {
  ApiError,
  PasskeyUnsupportedError,
  useUnlockWithPasskey,
  useUnlockWithPassword,
  useUnlockWithRecoveryKey,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "../index.js";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { markRecovered } from "./recovered.js";

export interface VaultInfo {
  unlocked: boolean;
  hasVault: boolean;
  hasPasskey: boolean;
  hasRecoveryKey: boolean;
}

const UnlockContext = createContext<{ open(): void } | null>(null);

/** Opens the unlock dialog, from anywhere under `<UnlockProvider>`. */
export function useUnlock(): { open(): void } {
  const value = useContext(UnlockContext);
  if (!value) throw new Error("useUnlock needs <UnlockProvider>");
  return value;
}

/**
 * Owns the unlock dialog for the logged-in shell. Pages stay usable while
 * locked; the header's Unlock button and `<LockedNotice>` open this. The
 * very first time (no vault yet) it opens by itself to set a passphrase,
 * unless `askForPassphrase` is false (apps whose everyday use needs no
 * vault). `onRecovered` runs after a recovery-key unlock - send the user
 * to pick a new passphrase (`<SecurityPage>` then asks for one).
 */
export function UnlockProvider({
  vault,
  onRecovered,
  askForPassphrase = true,
  children,
}: {
  vault: VaultInfo;
  onRecovered?: () => void;
  askForPassphrase?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(askForPassphrase && !vault.unlocked && !vault.hasVault);
  useEffect(() => {
    if (vault.unlocked) setOpen(false);
  }, [vault.unlocked]);

  return (
    <UnlockContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={open && !vault.unlocked} onOpenChange={setOpen}>
        <DialogContent>{open && <UnlockForm vault={vault} onRecovered={onRecovered} />}</DialogContent>
      </Dialog>
    </UnlockContext.Provider>
  );
}

/** A page section's fallback while locked. */
export function LockedNotice({ what = "this" }: { what?: string }) {
  const unlock = useUnlock();
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Locked</CardTitle>
        <CardDescription>Unlock your vault to see {what}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={unlock.open}>
          Unlock
        </Button>
      </CardContent>
    </Card>
  );
}

function UnlockForm({ vault, onRecovered }: { vault: VaultInfo; onRecovered?: () => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const unlock = useUnlockWithPassword();
  const passkey = useUnlockWithPasskey();

  if (useRecovery) return <RecoveryUnlock onBack={() => setUseRecovery(false)} onRecovered={onRecovered} />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password) unlock.mutate(password);
  }

  const error =
    unlock.error instanceof ApiError && unlock.error.status === 401
      ? "That's not the right passphrase."
      : unlock.isError
        ? "Couldn't reach the server - try again."
        : passkeyError(passkey.error);

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>{vault.hasVault ? "Unlock" : "Choose a passphrase"}</DialogTitle>
        <DialogDescription>
          {vault.hasVault
            ? "Your data is encrypted. Unlock it for this session."
            : "It encrypts your data. Pick one you'll remember; a recovery key (Security page) is the only backup."}
        </DialogDescription>
      </DialogHeader>
      {vault.hasPasskey && (
        <Button type="button" disabled={passkey.isPending} onClick={() => passkey.mutate()}>
          {passkey.isPending ? "Waiting for passkey…" : "Unlock with passkey"}
        </Button>
      )}
      <Input
        type="password"
        autoFocus={!vault.hasPasskey}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Passphrase"
        autoComplete={vault.hasVault ? "current-password" : "new-password"}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant={vault.hasPasskey ? "secondary" : "default"} disabled={unlock.isPending || !password}>
        {unlock.isPending ? "Unlocking…" : vault.hasVault ? "Unlock" : "Set passphrase"}
      </Button>
      {vault.hasRecoveryKey && (
        <Button type="button" variant="link" size="sm" onClick={() => setUseRecovery(true)}>
          Forgot your passphrase? Use your recovery key
        </Button>
      )}
    </form>
  );
}

function RecoveryUnlock({ onBack, onRecovered }: { onBack: () => void; onRecovered?: () => void }) {
  const [key, setKey] = useState("");
  const unlock = useUnlockWithRecoveryKey();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim()) return;
    // Straight to setting a new passphrase: the old one is presumably forgotten.
    unlock.mutate(key.trim(), {
      onSuccess: () => {
        markRecovered();
        onRecovered?.();
      },
    });
  }

  const error =
    unlock.error instanceof ApiError && unlock.error.status === 401
      ? "That recovery key doesn't match."
      : unlock.isError
        ? "Couldn't reach the server - try again."
        : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Recovery key</DialogTitle>
        <DialogDescription>Enter the recovery key you saved. Dashes and spaces don't matter.</DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="xxxx-xxxx-xxxx-…"
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={unlock.isPending || !key.trim()}>
        {unlock.isPending ? "Unlocking…" : "Unlock"}
      </Button>
      <Button type="button" variant="link" size="sm" onClick={onBack}>
        Back
      </Button>
    </form>
  );
}

function passkeyError(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof PasskeyUnsupportedError) return error.message;
  if (error.name === "NotAllowedError") return null; // dismissed the browser prompt
  if (error instanceof ApiError && error.status === 401) return "That passkey didn't unlock this vault.";
  return "Passkey unlock failed - use your passphrase.";
}
