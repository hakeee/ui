/**
 * Formatting and date helpers shared by apps. Dates are ISO `YYYY-MM-DD`
 * strings in the user's local calendar (what a person means by "today"),
 * never UTC: `new Date().toISOString()` gives yesterday's date after
 * midnight in Europe.
 */

const moneyFormats = new Map<string, Intl.NumberFormat>();

/** `formatMoney(1450, "CZK", "cs-CZ")` → "1 450 Kč". Whole units unless the amount has a fraction. */
export function formatMoney(amount: number, currency: string, locale?: string): string {
  const fractional = !Number.isInteger(amount);
  const key = `${currency}|${locale ?? ""}|${fractional}`;
  let format = moneyFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: fractional ? 2 : 0, maximumFractionDigits: 2 });
    moneyFormats.set(key, format);
  }
  return format.format(amount);
}

/** 1.5 → "1.5 h", 2 → "2 h". At most two decimals. */
export function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100} h`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A local Date → "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → a local Date at midnight. */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Monday of the week containing `iso` (ISO weeks). */
export function startOfWeek(iso: string): string {
  const date = fromIsoDate(iso);
  return addDays(iso, -((date.getDay() + 6) % 7));
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const date = fromIsoDate(startOfMonth(iso));
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function addMonths(iso: string, months: number): string {
  const date = fromIsoDate(startOfMonth(iso));
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** "2026-11-20" → "Friday 20 November 2026" (or the locale's equivalent); options override the parts. */
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale?: string): string {
  return fromIsoDate(iso).toLocaleDateString(locale, options);
}
