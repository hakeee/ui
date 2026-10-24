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

## v0.2 - HodyPesTracker integration (next)

Replace `web/src/components/ui/{Button,Card,Modal,SavedBadge}.tsx` with
this package's `Button`/`Card`/`Dialog`/`Badge`, updating call sites in
`src/pages/*.tsx` and `src/components/{Calendar,EntryModal}`. Lower risk
than Ebba - that app is already on Tailwind v4, so this is a straight
swap, not a styling-system migration too.

## v0.3 - Ebba integration (the actual migration)

Ebba has no Tailwind today - all styling is hand-written CSS
(`apps/web/src/index.css`, 1184 lines, 111 top-level classes across 9
screens). Scoped per-screen, not as one rewrite: add Tailwind v4 +
`@hakeee/ui` to `apps/web`, then convert screens one at a time (buttons/
banners/inputs onto this package's components, that screen's own layout
onto inline Tailwind utilities), starting with `Login`/`Unlock`/
`Settings`. Deliberately leaves `Trends`/`Timeline`'s chart/calendar/
cooccurrence-bar CSS alone - that's bespoke data-visualization layout,
not something a component library should own.

## v0.4 - stretch (not started)

Whatever both apps' real usage surfaces next - `Tabs` (Ebba's bottom nav
bar), `Select` (its tag-merge dropdown), `Toast` - built when there's an
actual screen that needs one, not speculatively ahead of that.

## Open questions

- No visual direction has been chosen yet (palette, radius, tone) -
  still shadcn's defaults. Revisit once this is live in a real screen in
  either app and there's something to react to rather than a blank
  canvas.
- `rollupTypes` / API Extractor's TypeScript-version lag (see v0.1) -
  worth rechecking on a `vite-plugin-dts` upgrade.
- Not published anywhere yet - consumed via `link:` from both apps, same
  unresolved state as `vault-service`/`ai-kit`.
