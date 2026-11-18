import { IamAccess } from "@hakeee/module-host/iam/web";
import {
  LiveConnection,
  ModuleHostProvider,
  RouterOutlet,
  useNav,
  useNavigateHref,
  useWebHost,
  type WebHost,
} from "@hakeee/module-host/web";
import type { PageRef } from "@hakeee/module-host";
import { useLockVault, useLogout, useRefreshVaultState, useVaultGate, vaultServiceQueryKey } from "@hakeee/vault-service-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "../index.js";
import { LoginScreen } from "./Login.js";
import { UnlockProvider, useUnlock, type VaultInfo } from "./Unlock.js";

export interface PlatformAppProps {
  /** From module-host's `createWebHost`. */
  host: WebHost;
  /** Shown in the header. */
  title?: ReactNode;
  /** Wrap the app in module-host IAM's `<IamAccess>`, so nav, pages and `useCan` follow the user's permissions. */
  iam?: boolean;
  /** Where to go after a recovery-key unlock to pick a new passphrase - the page rendering `<SecurityPage>`. */
  securityPage?: PageRef;
}

/**
 * A whole platform app's frame: logged out → `<LoginScreen>`; logged in
 * → the shell (nav from the modules, Lock/Unlock, Log out) and the current
 * page, locked or not. Pages decide what they show while locked
 * (`vault: false` data, `<WhenUnlocked>` / `<LockedNotice>`). Needs
 * `<QueryClientProvider>` and vault-service-react's `<VaultServiceProvider>`
 * above it.
 */
export function PlatformApp({ host, title = "App", iam = false, securityPage }: PlatformAppProps) {
  const gate = useVaultGate();
  switch (gate.status) {
    case "pending":
      return null;
    case "offline":
      return <main className="p-6">Can't reach the server.</main>;
    case "login-required":
      return <LoginScreen mode={gate.mode} />;
    case "vault-locked":
    case "unlocked": {
      const vault: VaultInfo =
        gate.status === "unlocked"
          ? { unlocked: true, hasVault: true, hasPasskey: false, hasRecoveryKey: false }
          : { unlocked: false, hasVault: gate.hasVault, hasPasskey: gate.hasPasskey, hasRecoveryKey: gate.hasRecoveryKey };
      const shell = (
        <Unlocking vault={vault} securityPage={securityPage}>
          <Shell title={title} unlocked={vault.unlocked} />
        </Unlocking>
      );
      return (
        <ModuleHostProvider host={host} unlocked={vault.unlocked}>
          {/* Permissions for useCan / nav / page actions; the server enforces them on every call. */}
          {iam ? <IamAccess>{shell}</IamAccess> : shell}
        </ModuleHostProvider>
      );
    }
  }
}

function Unlocking({ vault, securityPage, children }: { vault: VaultInfo; securityPage?: PageRef; children: ReactNode }) {
  const host = useWebHost();
  return (
    <UnlockProvider vault={vault} onRecovered={securityPage ? () => host.history.push(host.href(securityPage)) : undefined}>
      {children}
    </UnlockProvider>
  );
}

function Shell({ title, unlocked }: { title: ReactNode; unlocked: boolean }) {
  const logout = useLogout();
  const lock = useLockVault();
  const unlock = useUnlock();
  const refresh = useRefreshVaultState();
  const queryClient = useQueryClient();
  const host = useWebHost();
  const nav = useNav();
  const go = useNavigateHref();
  // Module data from this account must not show up for the next login, and
  // the next login shouldn't land on a page this account happened to be on.
  const logOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== vaultServiceQueryKey[0] });
        host.history.push("/");
      },
    });

  return (
    <div className="min-h-dvh">
      {/* Also reports locks from elsewhere (another tab, the idle timeout) right away. */}
      <LiveConnection onVaultChange={(nowUnlocked) => nowUnlocked !== unlocked && refresh()} />
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold">{title}</span>
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={go(item.href)}
              className={item.active ? "text-sm font-medium" : "text-sm text-muted-foreground hover:text-foreground"}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {unlocked ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => lock.mutate()}>
              Lock
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={unlock.open}>
              Unlock
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={logOut}>
            Log out
          </Button>
        </div>
      </header>
      <RouterOutlet
        notFound={<main className="p-6">Nothing here.</main>}
        forbidden={<main className="p-6">You don't have access to this page.</main>}
      />
    </div>
  );
}
