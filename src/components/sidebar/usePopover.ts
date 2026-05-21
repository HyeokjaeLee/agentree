import {
  autoUpdate,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useState } from "react";

export const POPOVER_CLASS =
  "z-50 rounded-md border border-border bg-popover shadow-md animate-fade-in animate-duration-150";

export function usePopover(placement: "bottom-start" | "bottom-end" = "bottom-start") {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: "fixed",
    middleware: [offset(4), shift({ padding: 8, crossAxis: true })],
    whileElementsMounted: (...args) => autoUpdate(...args, { animationFrame: true }),
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return { open, setOpen, refs, floatingStyles, context, getReferenceProps, getFloatingProps };
}
