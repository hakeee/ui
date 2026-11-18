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

## Ready-made platform screens

Two optional entries for apps on the self-hosted platform (vault-service +
module-host). They need `@hakeee/vault-service-react`, `@hakeee/module-host`
and `@tanstack/react-query`, which are optional peers: the core entry never
loads them.

- **`@hakeee/ui/auth`**:
  - `PlatformApp` is a whole app frame: the login gate, the shell (module
    nav, Lock/Unlock, Log out), the unlock dialog, the live socket, and
    module-host IAM if you pass `iam`.
  - The pieces: `LoginScreen`, `UnlockProvider` / `useUnlock` /
    `LockedNotice`, `SecurityPage` (passkeys, recovery key, vault
    passphrase, login password) and its cards.
- **`@hakeee/ui/access`**: `accessWeb`, the admin pages for module-host's
  built-in IAM (Users, Roles, Policies). Install it in
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
