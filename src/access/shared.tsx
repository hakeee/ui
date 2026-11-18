import { Checkbox, Label } from "../index.js";
import { Link, ModuleRpcError, useCan, useVaultUnlocked, webModule, type WebModuleBuilder } from "@hakeee/module-host/web";
import { iamContract } from "@hakeee/module-host/iam";
import type { ReactNode } from "react";

/** The app's web module for module-host's built-in IAM: these pages are the admin UI. */
export const iamUi: WebModuleBuilder<typeof iamContract, readonly []> = webModule({ contract: iamContract });

const tabs = [
  { page: iamContract.pages.users, label: "Users" },
  { page: iamContract.pages.roles, label: "Roles" },
  { page: iamContract.pages.policies, label: "Policies" },
] as const;

export function AccessLayout({ current, actions, children }: { current: "users" | "roles" | "policies"; actions?: ReactNode; children: ReactNode }) {
  const unlocked = useVaultUnlocked();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Access</h1>
          <nav className="flex gap-3 text-sm">
            {tabs.map((t) => (
              <Tab key={t.label} action={t.page.action!} active={t.page.name === current}>
                <Link to={t.page}>{t.label}</Link>
              </Tab>
            ))}
          </nav>
        </div>
        {actions}
      </div>
      {!unlocked && <p className="text-sm text-muted-foreground">Unlock your vault to make changes.</p>}
      {children}
    </main>
  );
}

function Tab({ action, active, children }: { action: string; active: boolean; children: ReactNode }) {
  if (!useCan(action)) return null;
  return <span className={active ? "font-medium" : "text-muted-foreground hover:text-foreground"}>{children}</span>;
}

/** Checkboxes for a set of names (roles, policies). */
export function Checklist({ options, value, onChange, disabled }: { options: { name: string; hint?: string }[]; value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <div key={o.name} className="flex items-start gap-2">
          <Checkbox
            id={`opt-${o.name}`}
            checked={value.includes(o.name)}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(checked === true ? [...value, o.name] : value.filter((v) => v !== o.name))}
          />
          <Label htmlFor={`opt-${o.name}`} className="flex flex-col gap-0.5">
            <span>{o.name}</span>
            {o.hint && <span className="text-xs font-normal text-muted-foreground">{o.hint}</span>}
          </Label>
        </div>
      ))}
    </div>
  );
}

export function errorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ModuleRpcError) {
    if (error.status === 423) return "Unlock your vault first.";
    if (error.status === 403) return "You're not allowed to do that.";
    return error.message;
  }
  return "Something went wrong - try again.";
}
