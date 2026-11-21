import { ApiError, useAcceptInvite, useInvite, useInviteStartUrl, useLogout } from "@hakeee/vault-service-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert, AlertDescription, Button, Input } from "../index.js";

export { inviteTokenFrom } from "./inviteLink.js";

/**
 * Where an invite link lands. Single mode: choose a login password (then,
 * usually, set up two-step login). OIDC: continue to the identity provider,
 * whose login is then tied to this account by the link itself.
 */
export function InviteScreen({
  token,
  loggedIn,
  oidcProvider = "Zitadel",
  onDone,
}: {
  token: string;
  /** Someone is already logged in in this browser. */
  loggedIn: boolean;
  oidcProvider?: string;
  /** Leave the invite page (accepted, or giving up on it). */
  onDone: () => void;
}) {
  const invite = useInvite(token);
  const logout = useLogout();

  if (invite.isPending) return null;
  if (invite.isError) {
    const gone = invite.error instanceof ApiError && invite.error.status === 404;
    return (
      <Frame title={gone ? "This invite link doesn't work" : "Couldn't open the invite"}>
        <p className="text-sm text-muted-foreground">
          {gone ? "It has expired or was already used. Ask whoever invited you for a new one." : invite.error instanceof ApiError && invite.error.status === 429 ? "Too many tries. Wait a few minutes." : "Can't reach the server - try again."}
        </p>
        <Button type="button" variant="secondary" onClick={onDone}>
          Go to the login page
        </Button>
      </Frame>
    );
  }
  const { displayName, email, mode } = invite.data;

  if (loggedIn) {
    return (
      <Frame title="You're already logged in">
        <p className="text-sm text-muted-foreground">This invite is for {email}. To accept it, log out of the account you're using first.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={logout.isPending} onClick={() => logout.mutate()}>
            Log out
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Back to the app
          </Button>
        </div>
      </Frame>
    );
  }
  return (
    <Frame title={`Welcome${displayName && displayName !== email ? `, ${displayName}` : ""}`}>
      <p className="text-sm text-muted-foreground">You've been invited as {email}.</p>
      {mode === "oidc" ? <OidcAccept token={token} provider={oidcProvider} /> : <PasswordAccept token={token} email={email} onDone={onDone} />}
    </Frame>
  );
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function OidcAccept({ token, provider }: { token: string; provider: string }) {
  const url = useInviteStartUrl(token);
  return (
    <>
      <p className="text-sm text-muted-foreground">Log in with {provider} to finish. If you don't have a login there yet, check your email for how to set one up.</p>
      <Button type="button" onClick={() => window.location.assign(url)}>
        Continue with {provider}
      </Button>
    </>
  );
}

function PasswordAccept({ token, email, onDone }: { token: string; email: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const accept = useAcceptInvite(token);
  const mismatch = repeat !== "" && password !== repeat;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length >= 8 && password === repeat) accept.mutate({ password }, { onSuccess: onDone });
  }

  const error =
    accept.error instanceof ApiError && accept.error.status === 429
      ? "Too many tries. Wait a few minutes."
      : accept.error instanceof ApiError && accept.error.status === 404
        ? "This invite link has expired or was already used. Ask for a new one."
        : accept.error instanceof ApiError && accept.error.status === 400
          ? "Choose a password of at least 8 characters."
          : accept.isError
            ? "Couldn't accept the invite - try again."
            : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {/* The username field lets password managers save the new login under the right email. */}
      <input type="email" value={email} autoComplete="username" readOnly hidden />
      <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password (at least 8 characters)" autoComplete="new-password" />
      <Input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="Repeat it" autoComplete="new-password" />
      {mismatch && <p className="text-sm text-destructive">The passwords don't match.</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={accept.isPending || password.length < 8 || password !== repeat}>
        {accept.isPending ? "Saving…" : "Set password and continue"}
      </Button>
    </form>
  );
}
