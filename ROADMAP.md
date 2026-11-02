# @hakeee/ui roadmap

## v0.1 - initial component set (done)

`Button`, `Input`, `Card`, `Badge`, `Alert`, `Dialog` - built on
`@radix-ui/react-dialog`, `@radix-ui/react-slot`, `class-variance-authority`,
`clsx`/`tailwind-merge` (the `cn` helper, `src/lib/cn.ts`), and
`lucide-react` for icons, matching shadcn/ui's own standard recipes and
dependency set rather than hand-rolled equivalents.

Variant names follow shadcn's own convention (`destructive`, not `danger`)
even though neither consumer app used that exact word yet - Ebba's
`secondary`/`danger`/`link-button` CSS modifiers and HodyPesTracker's
`primary`/`secondary`/`danger` `Button.tsx` variants already agreed on
the same four-way split, just under different names.

Shipped as a compiled Vite library build: `dist/index.js` (ESM) +
`dist/style.css` (Tailwind pre-compiled from this package's own component
source, via `@tailwindcss/vite` - see `vite.config.ts`). Consumers import
the stylesheet once; no Tailwind content-scanning config needed on their
side for this package's classes.

**Known rough edge:** type declarations land at `dist/src/index.d.ts`
(mirroring `src/`'s structure) rather than a flat `dist/index.d.ts` -
`vite-plugin-dts`'s `rollupTypes: true` would consolidate them, but its
bundled API Extractor only understands TypeScript 5.9.x and silently
emits an empty declaration file against this project's TypeScript 6.0.
`package.json`'s `types`/`exports` fields point at the real
`dist/src/...` path directly instead, which works fine - worth revisiting
once API Extractor (or vite-plugin-dts's dependency on it) catches up to
newer TypeScript.

Starts from shadcn's unmodified default theme (`src/styles.css`) - no
visual direction was specified yet, trimmed to only the CSS variables
this component set actually uses (no `accent`, `popover`, `chart-*`, etc.
- add them when a component actually needs them, not speculatively).

## v0.2 - Ebba integration (done, all 9 screens)

Added `Textarea` (Capture, Timeline's entry edit) along the way - the
one gap found during v0.1 that actually blocked a screen. Ebba had no
Tailwind at all going in; added `@tailwindcss/vite` to `apps/web` and
bridged this package's theme tokens (`--primary`, `--ring`, `--border`,
etc.) onto Ebba's own `--accent`/`--bg`/`--border` variables via an
unlayered `:root` override in Ebba's own `index.css` - no changes
needed here, since components read theme values from CSS custom
properties at runtime. That's also where a real bug turned up: Ebba's
pre-Tailwind CSS was unlayered, which beats *any* Tailwind/this
package's class regardless of specificity - fixed with an explicit
`@layer legacy, theme, base, components, utilities;` order statement on
Ebba's side (a documented Tailwind v4 pattern, not a workaround). Every
plain button/input/textarea/banner across all 9 of Ebba's screens now
goes through `Button`/`Input`/`Textarea`/`Alert`. Deliberately left
alone: the calendar date picker, chart/heatmap/cooccurrence SVGs, tag
chips, native `<select>`s, and nav tabs - bespoke layout, or lacking a
library equivalent (no `Select`/`Tabs` yet - see v0.4).

## v0.3 - HodyPesTracker integration (next)

Replace `web/src/components/ui/{Button,Card,Modal,SavedBadge}.tsx` with
this package's `Button`/`Card`/`Dialog`/`Badge`, updating call sites in
`src/pages/*.tsx` and `src/components/{Calendar,EntryModal}`. Lower risk
than Ebba was - that app is already on Tailwind v4, so this is a
straight swap, not a styling-system migration too. Will also be the
first real test of whether this package's theme-token bridge pattern
(see v0.2) generalizes, or whether HodyPesTracker wants Ebba's green
accent, its own `sky`/`slate` Tailwind palette, or something new.

## v0.4 - Select, Tabs, Checkbox, Label, Table (done)

Built for Mernel's BrokerAdmin keyed ACL editor (its first real need),
as the standard shadcn recipes on their Radix primitives
(`@radix-ui/react-select`, `-tabs`, `-checkbox`, `-label`; `Table` is plain
elements). `Select` brought in shadcn's `popover`/`accent` theme tokens.
Purely additive - no existing component changed shape, so Ebba and
HodyPesTracker need no changes; they can now replace their native
`<select>`s, bottom-nav tabs and bare checkboxes when convenient.
Still deferred: `Toast`.

## Open questions

- No visual direction has been chosen yet (palette, radius, tone) -
  still shadcn's defaults. Revisit once this is live in a real screen in
  either app and there's something to react to rather than a blank
  canvas.
- `rollupTypes` / API Extractor's TypeScript-version lag (see v0.1) -
  worth rechecking on a `vite-plugin-dts` upgrade.
- Not published anywhere yet - consumed via `link:` from both apps, same
  unresolved state as `vault-service`/`ai-kit`.
