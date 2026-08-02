"use client";

import { useEffect } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

type ShortcutOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
};

function matchesShortcut(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const needCtrl = parts.includes("ctrl") || parts.includes("cmd") || parts.includes("meta");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");

  const ctrlPressed = event.ctrlKey || event.metaKey;
  if (needCtrl !== ctrlPressed) return false;
  if (needShift !== event.shiftKey) return false;
  if (needAlt !== event.altKey) return false;

  return event.key.toLowerCase() === key;
}

/**
 * Register a keyboard shortcut. Ignores events inside editable fields unless allowInInputs.
 */
export function useKeyboardShortcut(
  combo: string,
  handler: ShortcutHandler,
  options: ShortcutOptions & { allowInInputs?: boolean } = {},
) {
  const { enabled = true, preventDefault = true, allowInInputs = false } = options;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!allowInInputs) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target?.isContentEditable
        ) {
          // Still allow Ctrl+K from inputs for command palette
          if (!(combo.toLowerCase() === "ctrl+k" || combo.toLowerCase() === "meta+k")) {
            return;
          }
        }
      }

      if (!matchesShortcut(event, combo)) return;
      if (preventDefault) event.preventDefault();
      handler(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, handler, enabled, preventDefault, allowInInputs]);
}
