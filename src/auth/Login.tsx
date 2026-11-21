import { ApiError, useLogin, useOidcLoginUrl, type AuthMode, type OidcLoginError } from "@hakeee/vault-service-react";
import { Alert, AlertDescription, Button, Input } from "../index.js";
import { useState, type FormEvent } from "react";

/** Email + password, or the OIDC button, depending on the server's auth mode. `oidcProvider` names the IdP on the button. */
export function LoginScreen({ mode, oidcProvider = "Zitadel" }: { mode: AuthMode; oidcProvider?: string }) {
  return mode === "oidc" ? <OidcLogin provider={oidcProvider} /> : <PasswordLogin />;
}

/**
 * The reason a refused OIDC login came back with (`?login_error=<code>`),
 * read once and removed from the address bar. Only known codes map to text:
 * anyone can craft that link, so it never shows words from the URL.
 */
function takeLoginError(provider: string): string | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("login_error") as OidcLoginError | null;
  if (code === null) return null;
  url.searchParams.delete("login_error");
  window.history.replaceState(window.history.state, "", url);
  const messages: Record<OidcLoginError, string> = {
    failed: "The login didn't go through. Try again.",
    "not-authorized": "Your account isn't allowed into this app. Ask an admin for access.",
    "mfa-required": `This app needs two-step login. Set it up in your ${provider} account, then log in again.`,
    "invite-invalid": "That invite link has expired or was already used. Ask for a new one.",
    "identity-taken": `That ${provider} login is already tied to another account here.`,
    "use-invite": "An account with your email already exists. Open the invite link you were sent.",
    "signup-closed": "There's no account for you here. Ask an admin for an invite.",
    disabled: "Your account is disabled.",
  };
  return messages[code] ?? messages.failed;
}

function OidcLogin({ provider }: { provider: string }) {
  const url = useOidcLoginUrl();
  const [error] = useState(() => takeLoginError(provider));
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold">Log in</h1>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="button" onClick={() => window.location.assign(url)}>
          Log in with {provider}
        </Button>
      </div>
    </main>
  );
}

function PasswordLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email && password) login.mutate({ email, password });
  }

  const error =
    login.error instanceof ApiError && login.error.status === 401
      ? "Wrong email or password."
      : login.error instanceof ApiError && login.error.status === 429
        ? "Too many failed attempts. Wait a few minutes and try again."
        : login.error instanceof ApiError && login.error.status === 400
          ? `${login.error.message[0]?.toUpperCase() ?? ""}${login.error.message.slice(1)}.`
          : login.isError
        ? "Couldn't reach the server - try again."
        : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <Input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={login.isPending || !email || !password}>
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </main>
  );
}
