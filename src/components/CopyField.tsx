import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "./Button.js";
import { Input } from "./Input.js";

/** A read-only value (a link, a key) with a Copy button that confirms briefly. Clicking the field selects it all. */
export function CopyField({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className={cn("flex gap-2", className)}>
      <Input readOnly value={value} aria-label={label} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        onClick={async () => {
          // The clipboard API needs a secure context; elsewhere the field stays selectable by hand.
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            /* nothing to do */
          }
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : label}
      </Button>
    </div>
  );
}
