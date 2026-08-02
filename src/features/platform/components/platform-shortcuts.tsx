"use client";

import { useRouter } from "next/navigation";

import { useNotifications } from "@/features/platform/context/notification-context";
import { useKeyboardShortcut } from "@/features/platform/hooks/use-keyboard-shortcut";

/**
 * Global productivity shortcuts for the newsroom OS shell.
 */
export function PlatformShortcuts() {
  const router = useRouter();
  const { setPanelOpen } = useNotifications();

  useKeyboardShortcut("ctrl+shift+s", () => {
    router.push("/newsroom/new");
  });

  useKeyboardShortcut("ctrl+shift+n", () => {
    setPanelOpen(true);
  });

  return null;
}
