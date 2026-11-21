import {
  ApiError,
  useAuthStatus,
  useConfirmTotp,
  useLogout,
  useMfaStatus,
  useNewRecoveryCodes,
  useRefreshVaultState,
  useRegisterLoginPasskey,
  useRemoveMfaFactor,
  useStartTotpSetup,
  useVerifyLoginPasskey,
  useVerifyRecoveryCode,
  useVerifyTotp,
  type MfaEnrolled,
  type MfaFactor,
} from "@hakeee/vault-service-react";
import { KeyRound, Smartphone } from "lucide-react";
import qrcode from "qrcode-generator";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  Checkbox,
  ChoiceTile,
  CopyField,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../index.js";
import { deviceLabel } from "./AddPasskey.js";

/** The server's message for a refused step, or something readable for the rest. */
function stepError(error: unknown, fallback = "Something went wrong - try again."): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many failed attempts. Wait a few minutes and try again.";
    if (error.status === 400 || error.status === 401 || error.status === 409) return `${error.message[0]?.toUpperCase() ?? ""}${error.message.slice(1)}.`;
  }
  if (error instanceof Error && error.name === "NotAllowedError") return "The passkey prompt was cancelled or timed out.";
  return fallback;
}

function ErrorNote({ error, fallback }: { error: unknown; fallback?: string }) {
  const text = stepError(error, fallback);
  if (!text) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}

/**
 * A QR code as SVG, always dark on white whatever the theme: scanners need
 * that contrast, so these two colours are deliberately not theme tokens.
 */
export function QrCode({ text, size = 200, label }: { text: string; size?: number; label: string }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
    return { count: n + 8, path: d };
  }, [text]);
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges" className="rounded-md">
      <rect width={count} height={count} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

/** Recovery codes, shown once, with a confirmation before moving on. */
export function RecoveryCodes({ codes, onDone, doneLabel = "Done" }: { codes: string[]; onDone: () => void; doneLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");
  function download() {
    const url = URL.createObjectURL(new Blob([`Recovery codes for ${window.location.host}\nEach works once.\n\n${text}\n`], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "recovery-codes.txt" });
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        If you lose your phone or passkey, each of these logs you in once. This is the only time they're shown: store them in a password manager or print them.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted p-3 font-mono text-sm" aria-label="Recovery codes">
        {codes.map((code) => (
          <li key={code} className="select-all text-center">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void navigator.clipboard?.writeText(text).catch(() => {})}>
          Copy
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={download}>
          Download
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="recovery-codes-saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
        <Label htmlFor="recovery-codes-saved">I've stored them somewhere safe</Label>
      </div>
      <div>
        <Button type="button" disabled={!saved} onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}

/** Adds an authenticator app: QR code (or the key typed in), then a code from the app proves it works. */
function TotpEnrol({ password, onEnrolled }: { password?: string; onEnrolled: (result: MfaEnrolled) => void }) {
  const start = useStartTotpSetup();
  const confirm = useConfirmTotp();
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirm.mutate({ code, ...(password !== undefined ? { password } : {}) }, { onSuccess: onEnrolled });
  }

  // Started by a click, not on mount: each start makes a new secret, and only the latest one is accepted.
  if (!start.data) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Use an app like Aegis, 2FAS, Google Authenticator, or your password manager.</p>
        <ErrorNote error={start.error} />
        <div>
          <Button type="button" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? "Preparing…" : "Show QR code"}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Scan this with your authenticator app, then type the 6-digit code it shows.</p>
      <div className="flex justify-center">
        <QrCode text={start.data.uri} label="QR code for your authenticator app" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Can't scan it? Type this key instead</summary>
        <CopyField className="mt-2" value={start.data.secret.replace(/(.{4})/g, "$1 ").trim()} />
      </details>
      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label="Code from your authenticator app"
      />
      <ErrorNote error={confirm.error} />
      <div>
        <Button type="submit" disabled={confirm.isPending || code.replace(/\s/g, "").length !== 6}>
          {confirm.isPending ? "Checking…" : "Confirm"}
        </Button>
      </div>
    </form>
  );
}

/** Adds a login passkey. Any authenticator works, password managers included (no PRF needed, unlike vault passkeys). */
function PasskeyEnrol({ password, onEnrolled }: { password?: string; onEnrolled: (result: MfaEnrolled) => void }) {
  const register = useRegisterLoginPasskey();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Your device, a security key or a password manager like Bitwarden asks to save a passkey for this site.</p>
      <ErrorNote error={register.error} fallback="Couldn't add the passkey - try again." />
      <div>
        <Button
          type="button"
          disabled={register.isPending}
          onClick={() => register.mutate({ label: deviceLabel(), ...(password !== undefined ? { password } : {}) }, { onSuccess: onEnrolled })}
        >
          {register.isPending ? "Waiting for passkey…" : "Add passkey"}
        </Button>
      </div>
    </div>
  );
}

function LoginStepFrame({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const logout = useLogout();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
        <button type="button" className="self-start bg-transparent text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => logout.mutate()}>
          Cancel and log out
        </button>
      </div>
    </main>
  );
}

type Method = "totp" | "passkey" | "recovery";

/** The second step of a login: a code from the authenticator app, a passkey, or a recovery code. */
export function MfaVerifyScreen() {
  const status = useMfaStatus();
  const kinds = status.data?.kinds ?? [];
  const preferred: Method = kinds.includes("totp") ? "totp" : kinds.includes("passkey") ? "passkey" : "recovery";
  const [picked, setPicked] = useState<Method | null>(null);
  const method = picked ?? preferred;
  const others = (["totp", "passkey", "recovery"] as const).filter((m) => m !== method && kinds.includes(m));
  const otherLabel: Record<Method, string> = { totp: "Use your authenticator app", passkey: "Use a passkey", recovery: "Use a recovery code" };

  if (status.isPending) return null;
  return (
    <LoginStepFrame title="Two-step login" description="Your password was right. Now confirm it's you.">
      {method === "totp" && <VerifyTotp />}
      {method === "passkey" && <VerifyPasskey />}
      {method === "recovery" && <VerifyRecovery />}
      {others.length > 0 && (
        <div className="flex flex-col items-start gap-1 border-t border-border pt-3">
          {others.map((m) => (
            <button key={m} type="button" className="bg-transparent text-sm text-primary underline-offset-4 hover:underline" onClick={() => setPicked(m)}>
              {otherLabel[m]}
            </button>
          ))}
        </div>
      )}
    </LoginStepFrame>
  );
}

function VerifyTotp() {
  const verify = useVerifyTotp();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        verify.mutate(code, { onError: () => setCode("") });
      }}
    >
      <Input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        placeholder="6-digit code from your app"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label="Code from your authenticator app"
      />
      <ErrorNote error={verify.error} />
      <Button type="submit" disabled={verify.isPending || code.replace(/\s/g, "").length !== 6}>
        {verify.isPending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

function VerifyPasskey() {
  const verify = useVerifyLoginPasskey();
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote error={verify.error} fallback="That passkey didn't work - try again." />
      <Button type="button" autoFocus disabled={verify.isPending} onClick={() => verify.mutate()}>
        {verify.isPending ? "Waiting for passkey…" : "Use passkey"}
      </Button>
    </div>
  );
}

function VerifyRecovery() {
  const verify = useVerifyRecoveryCode();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        verify.mutate(code);
      }}
    >
      <p className="text-sm text-muted-foreground">Each recovery code works once. Afterwards, check your two-step login on the Security page.</p>
      <Input autoFocus autoComplete="off" placeholder="xxxxx-xxxxx" className="font-mono" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Recovery code" />
      <ErrorNote error={verify.error} />
      <Button type="submit" disabled={verify.isPending || code.replace(/[\s-]/g, "").length < 10}>
        {verify.isPending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

/** Right after the password, when this account must have two-step login and has no factor yet. */
export function MfaSetupScreen() {
  const refresh = useRefreshVaultState();
  const [method, setMethod] = useState<"totp" | "passkey" | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  // The login finished on the server already; it shows here once the codes are put away.
  const enrolled = (result: MfaEnrolled) => (result.recoveryCodes ? setCodes(result.recoveryCodes) : refresh());

  if (codes) {
    return (
      <LoginStepFrame title="Save your recovery codes">
        <RecoveryCodes codes={codes} onDone={refresh} doneLabel="Continue" />
      </LoginStepFrame>
    );
  }
  return (
    <LoginStepFrame title="Set up two-step login" description="This account needs a second step when you log in, besides your password. Pick one; you can add more later.">
      <div className="flex flex-col gap-2">
        <ChoiceTile icon={<Smartphone className="h-5 w-5" />} title="Authenticator app" detail="A 6-digit code from an app on your phone" selected={method === "totp"} onClick={() => setMethod("totp")} />
        <ChoiceTile icon={<KeyRound className="h-5 w-5" />} title="Passkey" detail="Your device, a security key or a password manager" selected={method === "passkey"} onClick={() => setMethod("passkey")} />
      </div>
      {method === "totp" && <TotpEnrol onEnrolled={enrolled} />}
      {method === "passkey" && <PasskeyEnrol onEnrolled={enrolled} />}
    </LoginStepFrame>
  );
}

type CardAction = { kind: "totp" } | { kind: "passkey" } | { kind: "recovery" } | { kind: "remove"; factor: MfaFactor };

/** Security page: your second factors (email + password logins only; with OIDC, the identity provider handles this). */
export function TwoStepLoginCard() {
  const mode = useAuthStatus().data?.mode;
  const status = useMfaStatus({ enabled: mode === "single" });
  const [action, setAction] = useState<CardAction | null>(null);
  // Not offered: another login mode (the IdP handles it), or a server without two-step login set up.
  if (mode !== "single" || (status.error instanceof ApiError && status.error.status === 404)) return null;

  const factors = status.data?.factors ?? [];
  const primary = factors.filter((f) => f.kind !== "recovery");
  const recovery = factors.find((f) => f.kind === "recovery");
  const kindLabel = (f: MfaFactor) => (f.kind === "totp" ? "Authenticator app" : "Passkey");

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Two-step login {status.data?.required && <Badge variant="secondary">required</Badge>}
        </CardTitle>
        <CardDescription>After your password, a code from your phone or a passkey. Someone who learns your password still can't log in.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status.isError && <ErrorNote error={status.error} fallback="Couldn't load your two-step login." />}
        {status.data && primary.length === 0 && (
          <p className="text-sm text-muted-foreground">{status.data.required ? "You'll be asked to set it up at your next login." : "Not set up."}</p>
        )}
        {primary.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{f.label ?? kindLabel(f)}</span>
              <span className="text-xs text-muted-foreground">
                {f.label && f.label !== kindLabel(f) ? `${kindLabel(f)} · ` : ""}added {formatDate(f.createdAt)} · {f.lastUsedAt ? `last used ${formatDate(f.lastUsedAt)}` : "never used"}
              </span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAction({ kind: "remove", factor: f })}>
              Remove
            </Button>
          </div>
        ))}
        {recovery && (
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Recovery codes</span>
              <span className={(recovery.remaining ?? 0) <= 2 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{recovery.remaining ?? 0} of 10 left</span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAction({ kind: "recovery" })}>
              New codes
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAction({ kind: "totp" })}>
            Add authenticator app
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAction({ kind: "passkey" })}>
            Add passkey
          </Button>
        </div>
      </CardContent>
      {action && <TwoStepDialog action={action} onClose={() => setAction(null)} />}
    </Card>
  );
}

/** Every change asks for the login password: a session left open somewhere shouldn't be enough to swap someone's second factor. */
function TwoStepDialog({ action, onClose }: { action: CardAction; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [added, setAdded] = useState(false);
  const newCodes = useNewRecoveryCodes();
  const remove = useRemoveMfaFactor();
  const enrolled = (result: MfaEnrolled) => (result.recoveryCodes ? setCodes(result.recoveryCodes) : setAdded(true));
  const title = { totp: "Add an authenticator app", passkey: "Add a passkey", recovery: "New recovery codes", remove: "Remove this factor?" }[action.kind];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{codes ? "Your recovery codes" : added ? "Added" : title}</DialogTitle>
          {!codes && !added && (
            <DialogDescription>
              {action.kind === "recovery"
                ? "Your current codes stop working."
                : action.kind === "remove"
                  ? `“${action.factor.label ?? "This factor"}” will no longer work for logging in.`
                  : "Confirm with your login password first."}
            </DialogDescription>
          )}
        </DialogHeader>
        {codes ? (
          <RecoveryCodes codes={codes} onDone={onClose} />
        ) : added ? (
          <>
            <p className="text-sm text-muted-foreground">You can use it at your next login.</p>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Input type="password" autoFocus placeholder="Login password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {action.kind === "totp" && password && <TotpEnrol password={password} onEnrolled={enrolled} />}
            {action.kind === "passkey" && password && <PasskeyEnrol password={password} onEnrolled={enrolled} />}
            {action.kind === "recovery" && (
              <>
                <ErrorNote error={newCodes.error} />
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" disabled={!password || newCodes.isPending} onClick={() => newCodes.mutate({ password }, { onSuccess: (r) => setCodes(r.recoveryCodes) })}>
                    Create new codes
                  </Button>
                </DialogFooter>
              </>
            )}
            {action.kind === "remove" && (
              <>
                <ErrorNote error={remove.error} />
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" disabled={!password || remove.isPending} onClick={() => remove.mutate({ id: action.factor.id, password }, { onSuccess: onClose })}>
                    Remove
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
