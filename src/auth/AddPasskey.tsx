import { PasskeyUnsupportedError, usePasskeyRegistration } from "@hakeee/vault-service-react";
import { Button } from "../index.js";

/**
 * Registers a passkey that wraps this session's vault key, so this device
 * can later unlock without the passphrase. Needs an unlocked vault.
 */
export function AddPasskey() {
  const register = usePasskeyRegistration();

  const message = register.isSuccess
    ? "Passkey added."
    : register.error instanceof PasskeyUnsupportedError
      ? register.error.message
      : register.error?.name === "NotAllowedError"
        ? "The passkey prompt was cancelled or timed out."
        : register.isError
          ? "Couldn't add the passkey."
          : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={register.isPending}
        onClick={() => register.mutate(deviceLabel())}
      >
        {register.isPending ? "Waiting for passkey…" : "Add passkey"}
      </Button>
      {message && (
        <p className={register.isSuccess ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{message}</p>
      )}
    </div>
  );
}

/** Shown in method lists (vault passkeys, login passkeys), so something that tells devices apart. */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Firefox\//.test(ua) ? "Firefox" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
