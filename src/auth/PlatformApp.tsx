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
import { Ellipsis, Lock, LockOpen, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, ConfirmProvider, PaletteSelect, Sheet, SheetContent, SheetHeader, SheetTitle, ThemeToggle, cn, type PaletteOption } from "../index.js";
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
  /** OIDC mode: the IdP's name on the login button. Default "Zitadel". */
  oidcProvider?: string;
  /** Show a light / dark / system toggle in the header. Off by default: an app needs dark values for every colour it styles itself first. */
  themeToggle?: boolean;
  /** Colour palettes the app defines in its CSS (`:root[data-palette="<id>"]`); shows a picker in the header. */
  palettes?: PaletteOption[];
  /**
   * Phone layout: below `md`, the nav becomes a bottom tab bar (the first
   * `tabs` nav entries, with their `icon`) and everything else - the rest of
   * the nav, theme, Lock, Log out - moves into a "More" sheet. Default off.
   */
  mobileNav?: boolean | { tabs?: number };
  /**
   * Open the "choose a passphrase" dialog by itself until the user has a
   * vault. Default on; turn it off when everyday use works without one
   * (they set it when something first needs the vault, or via Unlock).
   */
  askForPassphrase?: boolean;
}

/**
 * A whole platform app's frame: logged out → `<LoginScreen>`; logged in
 * → the shell (nav from the modules, Lock/Unlock, Log out) and the current
 * page, locked or not. Pages decide what they show while locked
 * (`vault: false` data, `<WhenUnlocked>` / `<LockedNotice>`). Needs
 * `<QueryClientProvider>` and vault-service-react's `<VaultServiceProvider>`
 * above it.
 */
export function PlatformApp({
  host,
  title = "App",
  iam = false,
  securityPage,
  oidcProvider,
  themeToggle = false,
  palettes,
  mobileNav = false,
  askForPassphrase = true,
}: PlatformAppProps) {
  const gate = useVaultGate();
  switch (gate.status) {
    case "pending":
      return null;
    case "offline":
      return <main className="p-6">Can't reach the server.</main>;
    case "login-required":
      return <LoginScreen mode={gate.mode} oidcProvider={oidcProvider} />;
    case "vault-locked":
    case "unlocked": {
      const vault: VaultInfo =
        gate.status === "unlocked"
          ? { unlocked: true, hasVault: true, hasPasskey: false, hasRecoveryKey: false }
          : { unlocked: false, hasVault: gate.hasVault, hasPasskey: gate.hasPasskey, hasRecoveryKey: gate.hasRecoveryKey };
      const shell = (
        <Unlocking vault={vault} securityPage={securityPage} askForPassphrase={askForPassphrase}>
          <ConfirmProvider>
            <Shell
              title={title}
              unlocked={vault.unlocked}
              themeToggle={themeToggle}
              palettes={palettes}
              mobileTabs={mobileNav === false ? undefined : mobileNav === true ? 4 : (mobileNav.tabs ?? 4)}
            />
          </ConfirmProvider>
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

function Unlocking({ vault, securityPage, askForPassphrase, children }: { vault: VaultInfo; securityPage?: PageRef; askForPassphrase: boolean; children: ReactNode }) {
  const host = useWebHost();
  return (
    <UnlockProvider vault={vault} askForPassphrase={askForPassphrase} onRecovered={securityPage ? () => host.history.push(host.href(securityPage)) : undefined}>
      {children}
    </UnlockProvider>
  );
}

function Shell({
  title,
  unlocked,
  themeToggle,
  palettes,
  mobileTabs,
}: {
  title: ReactNode;
  unlocked: boolean;
  themeToggle: boolean;
  palettes?: PaletteOption[];
  /** Set: phone layout with this many bottom tabs. */
  mobileTabs?: number;
}) {
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

  const mobile = mobileTabs !== undefined;
  return (
    <div className={cn("min-h-dvh", mobile && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0")}>
      {/* Also reports locks from elsewhere (another tab, the idle timeout) right away. */}
      <LiveConnection onVaultChange={(nowUnlocked) => nowUnlocked !== unlocked && refresh()} />
      {/* Wraps instead of overflowing when an app has more nav entries than fit on one line. */}
      <header className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border px-6 py-3", mobile && "hidden md:flex")}>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
        <div className="ml-auto flex items-center gap-2">
          {palettes && palettes.length > 0 && <PaletteSelect palettes={palettes} />}
          {themeToggle && <ThemeToggle />}
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
      {mobile && (
        <MobileNav
          title={title}
          tabs={mobileTabs}
          unlocked={unlocked}
          themeToggle={themeToggle}
          palettes={palettes}
          onLock={() => lock.mutate()}
          onUnlock={unlock.open}
          onLogOut={logOut}
        />
      )}
      <RouterOutlet
        notFound={<main className="p-6">Nothing here.</main>}
        forbidden={<main className="p-6">You don't have access to this page.</main>}
      />
    </div>
  );
}

/**
 * Phone chrome: a slim title bar on top, tabs at the bottom (thumb reach),
 * and a "More" sheet for the nav entries that don't fit plus the account
 * actions.
 */
function MobileNav({
  title,
  tabs,
  unlocked,
  themeToggle,
  palettes,
  onLock,
  onUnlock,
  onLogOut,
}: {
  title: ReactNode;
  tabs: number;
  unlocked: boolean;
  themeToggle: boolean;
  palettes?: PaletteOption[];
  onLock(): void;
  onUnlock(): void;
  onLogOut(): void;
}) {
  const nav = useNav();
  const go = useNavigateHref();
  const [moreOpen, setMoreOpen] = useState(false);
  const shown = nav.slice(0, tabs);
  const rest = nav.slice(tabs);
  const moreActive = rest.some((item) => item.active);
  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 bg-transparent px-1 py-2 text-[11px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <span className="font-semibold">{title}</span>
        {!unlocked && (
          <Button type="button" size="sm" onClick={onUnlock}>
            <LockOpen className="h-4 w-4" /> Unlock
          </Button>
        )}
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {shown.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href} onClick={go(item.href)} aria-current={item.active ? "page" : undefined} className={tabClass(item.active)}>
              {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5" />}
              <span className="max-w-full truncate">{item.label}</span>
            </a>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreActive)} aria-haspopup="dialog">
          <Ellipsis className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          {rest.length > 0 && (
            <div className="flex flex-col">
              {rest.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(event) => {
                      go(item.href)(event);
                      setMoreOpen(false);
                    }}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-accent",
                      item.active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                    {item.label}
                  </a>
                );
              })}
            </div>
          )}
          {(themeToggle || (palettes && palettes.length > 0)) && (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Appearance</span>
              <div className="flex items-center gap-2">
                {palettes && palettes.length > 0 && <PaletteSelect palettes={palettes} />}
                {themeToggle && <ThemeToggle />}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            {unlocked ? (
              <Button type="button" variant="secondary" onClick={() => (onLock(), setMoreOpen(false))}>
                <Lock className="h-4 w-4" /> Lock
              </Button>
            ) : (
              <Button type="button" onClick={() => (onUnlock(), setMoreOpen(false))}>
                <LockOpen className="h-4 w-4" /> Unlock
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onLogOut}>
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
