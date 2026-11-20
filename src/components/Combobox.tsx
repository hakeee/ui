import { Plus, X } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../lib/cn.js";
import { Input } from "./Input.js";

export interface ComboboxOption {
  value: string;
  label: string;
  /** A second line, e.g. "archived". */
  hint?: string;
}

/**
 * Search and pick one option, with an optional "add new" row for what was
 * typed. The caller owns the search (`query` / `onQueryChange`), so options
 * can come from the server. Picked, it shows the choice with a clear button.
 */
export function Combobox({
  value,
  onChange,
  options,
  query,
  onQueryChange,
  placeholder = "Search…",
  emptyText = "No matches",
  createLabel,
  onCreate,
  loading = false,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  id,
}: {
  value: ComboboxOption | null;
  onChange(option: ComboboxOption | null): void;
  options: readonly ComboboxOption[];
  query: string;
  onQueryChange(query: string): void;
  placeholder?: string;
  emptyText?: string;
  /** Text of the "add new" row; the row shows only with this, `onCreate` and a non-empty query. */
  createLabel?: (query: string) => string;
  onCreate?(query: string): void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const creatable = !!onCreate && !!createLabel && query.trim().length > 0 && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const rows = options.length + (creatable ? 1 : 0);

  const pick = (index: number) => {
    if (index < options.length) onChange(options[index]!);
    else if (creatable) onCreate!(query.trim());
    setOpen(false);
    onQueryChange("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (rows) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : rows - 1)) % rows);
    } else if (e.key === "Enter" && open && rows) {
      e.preventDefault();
      pick(Math.min(active, rows - 1));
    } else if (e.key === "Escape") setOpen(false);
  };

  if (value) {
    return (
      <div className={cn("flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm", className)}>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className="min-w-0 flex-1 truncate bg-transparent text-left"
          aria-label={ariaLabel ? `${ariaLabel}: ${value.label}, change` : `Change ${value.label}`}
          onClick={() => {
            onChange(null);
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          {value.label}
        </button>
        <button type="button" disabled={disabled} className="bg-transparent text-muted-foreground hover:text-foreground" aria-label={`Clear ${value.label}`} onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && rows ? `${listId}-${Math.min(active, rows - 1)}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Let a click on an option land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn("flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm", i === active && "bg-accent text-accent-foreground")}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
            >
              <span>{option.label}</span>
              {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
            </li>
          ))}
          {creatable && (
            <li
              id={`${listId}-${options.length}`}
              role="option"
              aria-selected={active === options.length}
              className={cn("flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-primary", active === options.length && "bg-accent")}
              onMouseEnter={() => setActive(options.length)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(options.length)}
            >
              <Plus className="h-4 w-4" />
              {createLabel!(query.trim())}
            </li>
          )}
          {rows === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">{loading ? "Searching…" : emptyText}</li>}
        </ul>
      )}
    </div>
  );
}
