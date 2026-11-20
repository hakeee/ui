import { Minus, Plus } from "lucide-react";
import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "./Button.js";
import { Input } from "./Input.js";

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max" | "step"> {
  value: number;
  onValueChange(value: number): void;
  min?: number;
  max?: number;
  /** Stepper increment, and the granularity of the keyboard's arrows. Default 1. */
  step?: number;
  /** Show − / + buttons beside the field (big touch targets for small counts). */
  steppers?: boolean;
  /** Text after the number inside the field, e.g. "Kč" or "h". */
  suffix?: string;
}

const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

/**
 * A number field that's quick to overwrite on a phone: selects everything
 * on focus, opens the numeric keyboard, and keeps the typed text while it
 * isn't a number yet ("", "1.") instead of snapping to 0 mid-typing.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, min, max, step = 1, steppers = false, suffix, className, onFocus, onBlur, disabled, ...props }, ref) => {
    const [text, setText] = useState(String(value));
    // Follow outside changes (a recomputed amount), but not while the text already means this value.
    useEffect(() => {
      setText((current) => (Number(current.replace(",", ".")) === value && current !== "" ? current : String(value)));
    }, [value]);

    const commit = (raw: string) => {
      setText(raw);
      const n = Number(raw.replace(",", "."));
      if (raw.trim() !== "" && Number.isFinite(n)) onValueChange(clamp(n, min, max));
    };
    const nudge = (direction: 1 | -1) => {
      const next = clamp(Math.round((value + direction * step) * 1000) / 1000, min, max);
      setText(String(next));
      onValueChange(next);
    };

    const field = (
      <div className="relative flex-1">
        <Input
          ref={ref}
          type="text"
          inputMode={Number.isInteger(step) && (min ?? 0) >= 0 ? "numeric" : "decimal"}
          value={text}
          disabled={disabled}
          onFocus={(e) => {
            e.currentTarget.select();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            // Leave the field showing what was actually stored.
            setText(String(value));
            onBlur?.(e);
          }}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              nudge(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          className={cn("tabular-nums", suffix && "pr-10", steppers && "text-center", className)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    );

    if (!steppers) return field;
    return (
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="icon" className="h-10 w-10 shrink-0" aria-label="Decrease" disabled={disabled || value <= (min ?? -Infinity)} onClick={() => nudge(-1)}>
          <Minus className="h-4 w-4" />
        </Button>
        {field}
        <Button type="button" variant="secondary" size="icon" className="h-10 w-10 shrink-0" aria-label="Increase" disabled={disabled || value >= (max ?? Infinity)} onClick={() => nudge(1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";
