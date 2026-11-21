# @hakeee/ui

A shared React component library on top of [shadcn/ui](https://ui.shadcn.com/)
conventions and Tailwind v4, so Ebba and HodyPesTracker (and whatever's next)
don't each grow their own ad-hoc buttons and modals.

Unlike shadcn's own CLI-driven "copy the source into your project" model,
this ships as a real compiled package - `import { Button } from "@hakeee/ui"`,
plus one stylesheet import. That trade-off (simpler to consume, update once
instead of N times; less "every project can tweak its own copy") was a
deliberate choice, not an accident - see the repo this was split out of if
you want the reasoning.

## Using it

```ts
import { Button, Dialog, DialogContent, DialogTitle } from "@hakeee/ui";
import "@hakeee/ui/style.css";
```

That's it - no Tailwind config needed in the consuming app for this
package's own classes; the stylesheet is pre-compiled. If the consuming
app also uses Tailwind for its own styling, the two coexist fine as
separate stylesheets.

## What's here (v0.1)

`Button`, `Input`, `Card` (+ `CardHeader`/`Title`/`Description`/`Content`/
`Footer`), `Badge`, `Alert` (+ `AlertTitle`/`AlertDescription`), `Dialog`
(+ `DialogTrigger`/`Content`/`Header`/`Footer`/`Title`/`Description`) -
chosen because both consumer apps' *existing* screens already use
something shaped exactly like these, not from shadcn's full catalog.

Since then, also `Label`, `Checkbox`, `Select`, `Tabs`, `Table`, `Textarea`,
theming (`ThemeToggle`, `PaletteSelect`, `configureTheme`), and the
phone-first pieces HodyPesTracker v2 needed:

- `Sheet` (bottom drawer on phones, centred dialog from `sm` up),
  `ConfirmProvider` / `useConfirm()` (themed `window.confirm`, promise-based)
- Form bits: `Field` (label + hint/error wired to the control),
  `NumberInput` (select-all on focus, numeric keyboard, decimal comma,
  optional steppers and suffix), `SegmentedControl`, `ChoiceTile` (big
  tappable option), `SavedBadge` + `useSavedFlash`
- `MonthGrid` (Monday-first month calendar, you render each day's content),
  `DateRangePicker` (from/to with presets), `StatTile`, `EmptyState`
- Helpers: `formatMoney`, `formatHours`, and local-calendar ISO date maths
  (`todayIso`, `addDays`, `startOfWeek`, `startOfMonth`, `endOfMonth`,
  `addMonths`, `formatDate`): never `toISOString()`, which is yesterday
  after midnight in Europe

## Ready-made platform screens

Two optional entries for apps on the self-hosted platform (vault-service +
module-host). They need `@hakeee/vault-service-react`, `@hakeee/module-host`
and `@tanstack/react-query`, which are optional peers: the core entry never
loads them.

- **`@hakeee/ui/auth`**:
  - `PlatformApp` is a whole app frame: the login gate, the shell (module
    nav, Lock/Unlock, Log out), the unlock dialog, the live socket, and
    module-host IAM if you pass `iam`. `mobileNav` turns the nav into a
    bottom tab bar on phones (the first nav entries, with their `icon`, plus
    a "More" sheet); `askForPassphrase={false}` stops the first-run
    passphrase prompt for apps that work without the vault.
  - The pieces: `LoginScreen` (shows an OIDC `login_error`),
    `UnlockProvider` / `useUnlock` / `LockedNotice`, `SecurityPage`
    (two-step login, passkeys, recovery key, vault passphrase, login
    password) and its cards.
  - Two-step login (vault-service `mfa`): `PlatformApp` shows
    `MfaVerifyScreen` after the password, or `MfaSetupScreen` when a factor
    is required and missing (authenticator app with a QR code, or a login
    passkey; recovery codes shown once). `TwoStepLoginCard` on the Security
    page manages factors (each change asks for the login password) and
    hides itself without `mfa` on the server.
  - Invites: a page at `…/invite/<token>` shows `InviteScreen` instead of the
    app: set a password (single) or continue to the IdP (OIDC). Static
    hosting must serve `index.html` for that path.
- **`@hakeee/ui/access`**: `accessWeb`, the admin pages for module-host's
  built-in IAM (Users, Roles, Policies). Users invites people when IAM has
  `invites` (status, new link, revoke) and resets two-step login. Install it in
  `createWebHost({ modules })`.

```tsx
import { PlatformApp } from "@hakeee/ui/auth";
import { accessWeb } from "@hakeee/ui/access";

const host = createWebHost({ modules: [homeWeb, accessWeb], baseUrl });
<QueryClientProvider client={queryClient}>
  <VaultServiceProvider baseUrl={api}>
    <PlatformApp host={host} title="My app" iam securityPage={homeContract.pages.security} />
  </VaultServiceProvider>
</QueryClientProvider>
```

The platform packages stay external in the build, so the screens share
the app's single copy of each. Their React contexts only work that way.

## What's next

See `ROADMAP.md` - HodyPesTracker integration, then Ebba's Tailwind
migration, in that order (lower-risk consumer first).
