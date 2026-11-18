// Carries "just unlocked with the recovery key" from the Unlock screen to
// the Security page, which then asks for a new passphrase. Per tab, and
// harmless if storage is unavailable: the page just doesn't nag.
const KEY = "app.recoveredWithKey";

export function markRecovered(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
}

export function wasRecovered(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearRecovered(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
