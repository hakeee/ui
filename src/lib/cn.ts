import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui's usual helper: merges conditional class lists, then resolves conflicting Tailwind utilities (e.g. two different `px-*`) in favor of the last one. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
