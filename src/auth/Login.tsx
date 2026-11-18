import { ApiError, useLogin, useOidcLoginUrl, type AuthMode } from "@hakeee/vault-service-react";
import { Alert, AlertDescription, Button, Input } from "../index.js";
import { useState, type FormEvent } from "react";

/** Email + password, or the OIDC button, depending on the server's auth mode. `oidcProvider` names the IdP on the button. */
export function LoginScreen({ mode, oidcProvider = "Zitadel" }: { mode: AuthMode; oidcProvider?: string }) {
  return mode === "oidc" ? <OidcLogin provider={oidcProvider} /> : <PasswordLogin />;
}

function OidcLogin({ provider }: { provider: string }) {
  const url = useOidcLoginUrl();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold">Log in</h1>
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
      : login.isError
        ? "Couldn't reach the server - try again."
        : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground">The first login for an email creates the account.</p>
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
