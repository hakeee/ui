import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button.js";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./Dialog.js";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Label of the confirming button. Default "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deletes and other things that can't be undone. */
  destructive?: boolean;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | undefined>(undefined);

/**
 * A themed replacement for `window.confirm`: `await confirm({...})`
 * resolves true or false. Mount `<ConfirmProvider>` once (`PlatformApp`
 * does); `useConfirm()` works anywhere below it.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | undefined>();
  const resolver = useRef<((ok: boolean) => void) | undefined>(undefined);

  const ask = useCallback<Ask>((next) => {
    // A second question replaces an unanswered one, which counts as "no".
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = undefined;
    setOptions(undefined);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Dialog open={options !== undefined} onOpenChange={(open) => !open && answer(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={() => answer(false)}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="button" variant={options?.destructive ? "destructive" : "default"} onClick={() => answer(true)} autoFocus>
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (await confirm({ title: "Delete?", destructive: true })) ...` */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  // Without a provider, fall back to the browser's dialog rather than failing.
  return ask ?? (async (o) => window.confirm(o.description && typeof o.description === "string" ? `${o.title}\n\n${o.description}` : o.title));
}
