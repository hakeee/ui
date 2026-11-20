import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn.js";

/**
 * Which field was saved last, for a moment: `flash("rate-3")` after a
 * save, `<SavedBadge show={saved === "rate-3"} />` next to the field.
 */
export function useSavedFlash(durationMs = 1800) {
  const [saved, setSaved] = useState<string | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(
    (key: string) => {
      clearTimeout(timer.current);
      setSaved(key);
      timer.current = setTimeout(() => setSaved(undefined), durationMs);
    },
    [durationMs],
  );
  return { saved, flash };
}

/** A small "✓ Saved" that fades in and out; keeps its space so the layout doesn't jump. */
export function SavedBadge({ show, className }: { show: boolean; className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1 text-xs font-medium text-success transition-opacity", show ? "opacity-100" : "opacity-0", className)}
    >
      <Check className="h-3 w-3" />
      {show ? "Saved" : ""}
    </span>
  );
}
