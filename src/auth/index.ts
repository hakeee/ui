// Ready-made auth screens for platform apps (vault-service + module-host).
// Needs @hakeee/vault-service-react, @hakeee/module-host and
// @tanstack/react-query; the core `@hakeee/ui` entry needs none of them.
export { PlatformApp, type PlatformAppProps } from "./PlatformApp.js";
export { LoginScreen } from "./Login.js";
export { LockedNotice, UnlockProvider, useUnlock, type VaultInfo } from "./Unlock.js";
export { LoginPasswordCard, PassphraseCard, PasskeysCard, RecoveryKeyCard, SecurityPage } from "./Security.js";
export { AddPasskey } from "./AddPasskey.js";
