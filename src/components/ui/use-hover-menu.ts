"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Controlled open state for menus that preview on hover and stay open when clicked.
 * Hover opens; leaving closes after a short delay unless the menu was pinned by click/keyboard.
 */
export function useHoverMenu(closeDelayMs = 140) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      clearCloseTimer();
      if (next) {
        setOpen(true);
        setPinned(true);
      } else {
        setOpen(false);
        setPinned(false);
      }
    },
    [clearCloseTimer],
  );

  const keepOpen = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    if (pinnedRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelayMs);
  }, [clearCloseTimer, closeDelayMs]);

  const onTriggerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Already open from hover: pin instead of letting Radix toggle closed.
      if (open && !pinnedRef.current) {
        event.preventDefault();
        clearCloseTimer();
        setPinned(true);
        setOpen(true);
      }
    },
    [open, clearCloseTimer],
  );

  return {
    open,
    onOpenChange,
    triggerProps: {
      onPointerEnter: keepOpen,
      onPointerLeave: scheduleClose,
      onPointerDown: onTriggerPointerDown,
    },
    contentProps: {
      onPointerEnter: keepOpen,
      onPointerLeave: scheduleClose,
    },
  };
}
