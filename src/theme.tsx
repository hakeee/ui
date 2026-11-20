import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "./components/Button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/Select.js";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * localStorage keys. Apps' index.html reads the same keys in a tiny inline
 * script so <html> has the right class and palette before the first paint,
 * without a white flash on reload in dark mode.
 */
export const THEME_STORAGE_KEY = "hakeee-ui-theme";
export const PALETTE_STORAGE_KEY = "hakeee-ui-palette";

/**
 * A palette is plain CSS in the app: token overrides under
 * `:root[data-palette="<id>"]` and `:root.dark[data-palette="<id>"]`.
 * "default" (no attribute) is this package's own neutral theme.
 */
export interface PaletteOption {
  id: string;
  label: string;
}

const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;
const listeners = new Set<() => void>();

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage blocked (private mode, sandboxed frame): use the defaults.
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Not remembered, but still applied for this page.
  }
}

function readTheme(): ThemePreference {
  const v = readStored(THEME_STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

const inBrowser = typeof window !== "undefined";
let preference: ThemePreference = inBrowser ? readTheme() : "system";
// null = never picked, so the app's default applies (and follows it if it changes).
let palette: string | null = inBrowser ? readStored(PALETTE_STORAGE_KEY) : null;
let defaultPalette = "default";

/**
 * Set the app's palette for people who haven't picked one. Call it before
 * the first render (module scope in main.tsx), and use the same id as the
 * fallback in index.html's inline script.
 */
export function configureTheme({ defaultPalette: id }: { defaultPalette?: string }) {
  if (id) defaultPalette = id;
  apply();
}

const effectivePalette = () => palette ?? defaultPalette;

function resolve(p: ThemePreference): ResolvedTheme {
  return p === "system" ? (media?.matches ? "dark" : "light") : p;
}

function apply() {
  if (typeof document === "undefined") return;
  const resolved = resolve(preference);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Native controls and scrollbars follow too.
  root.style.colorScheme = resolved;
  const p = effectivePalette();
  if (p === "default") root.removeAttribute("data-palette");
  else root.setAttribute("data-palette", p);
}

function emit() {
  apply();
  for (const l of listeners) l();
}

if (inBrowser) {
  media?.addEventListener("change", () => preference === "system" && emit());
  // Another tab changed it.
  window.addEventListener("storage", (e) => {
    if (e.key !== THEME_STORAGE_KEY && e.key !== PALETTE_STORAGE_KEY) return;
    preference = readTheme();
    palette = readStored(PALETTE_STORAGE_KEY);
    emit();
  });
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  writeStored(THEME_STORAGE_KEY, next === "system" ? null : next);
  emit();
}

export function setPalette(next: string) {
  // Picking the app's default stores nothing, so a later default change applies.
  palette = next === defaultPalette ? null : next;
  writeStored(PALETTE_STORAGE_KEY, palette);
  emit();
}

function subscribe(listener: () => void) {
  // The first subscriber makes sure <html> matches even if the app's
  // index.html has no inline script.
  if (listeners.size === 0) apply();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The user's light / dark / system choice, remembered per browser. `resolved` is what's actually showing. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, () => preference, () => "system" as ThemePreference);
  // Re-render on OS changes too, when following the system.
  const resolved = useSyncExternalStore(subscribe, () => resolve(preference), () => "light" as ResolvedTheme);
  return { preference: pref, resolved, setPreference: setThemePreference };
}

/** The palette showing: the user's pick, else the app's default ("default" = this package's neutral theme). */
export function usePalette() {
  const current = useSyncExternalStore(subscribe, effectivePalette, () => defaultPalette);
  return { palette: current, setPalette };
}

const order: ThemePreference[] = ["system", "light", "dark"];
const icons = { system: Monitor, light: Sun, dark: Moon };
const labels = { system: "Theme: match system", light: "Theme: light", dark: "Theme: dark" };

/** Icon button that cycles system → light → dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference: pref, setPreference } = useTheme();
  const Icon = icons[pref];
  const next = order[(order.indexOf(pref) + 1) % order.length] ?? "system";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`${labels[pref]}. Switch to ${next}.`}
      title={labels[pref]}
      onClick={() => setPreference(next)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

/** Dropdown of the app's palettes, plus this package's neutral theme. */
export function PaletteSelect({ palettes, className }: { palettes: PaletteOption[]; className?: string }) {
  const { palette: current, setPalette: set } = usePalette();
  // A saved palette the app no longer defines falls back to the default.
  const value = palettes.some((p) => p.id === current) ? current : "default";
  return (
    <Select value={value} onValueChange={set}>
      <SelectTrigger className={className ?? "h-9 w-36"} aria-label="Colour palette">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Neutral</SelectItem>
        {palettes.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
