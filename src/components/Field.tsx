import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Label } from "./Label.js";

/**
 * A labelled form control: `<Field label="Amount"><NumberInput .../></Field>`.
 * Wires the label to the control (its `id`) and the hint/error to
 * `aria-describedby`, so callers don't juggle ids.
 */
export function Field({
  label,
  hint,
  error,
  aside,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Right of the label, e.g. a `<SavedBadge>`. */
  aside?: ReactNode;
  className?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const generated = useId();
  const id = (isValidElement(children) && children.props.id) || generated;
  const describedBy = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {(error || hint) && (
        <p id={describedBy} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
