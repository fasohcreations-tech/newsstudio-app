"use client";

import { useEffect } from "react";

import { STUDIO_SHORTCUTS } from "@/features/creative-studio/constants/studio-shortcuts";

type StudioShortcutHandlers = {
  onPlayPause?: () => void;
  onFrameBack?: () => void;
  onFrameForward?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleSnap?: () => void;
  onFullscreen?: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useStudioShortcuts(handlers: StudioShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key;
      const ctrl = event.ctrlKey || event.metaKey;

      if (key === STUDIO_SHORTCUTS.playPause) {
        event.preventDefault();
        handlers.onPlayPause?.();
        return;
      }

      if (key === STUDIO_SHORTCUTS.frameBack) {
        event.preventDefault();
        handlers.onFrameBack?.();
        return;
      }

      if (key === STUDIO_SHORTCUTS.frameForward) {
        event.preventDefault();
        handlers.onFrameForward?.();
        return;
      }

      if (key === STUDIO_SHORTCUTS.toggleSnap && !ctrl) {
        event.preventDefault();
        handlers.onToggleSnap?.();
        return;
      }

      if (key === STUDIO_SHORTCUTS.fullscreen && !ctrl) {
        event.preventDefault();
        handlers.onFullscreen?.();
        return;
      }

      if (ctrl && (key === "=" || key === "+")) {
        event.preventDefault();
        handlers.onZoomIn?.();
        return;
      }

      if (ctrl && key === "-") {
        event.preventDefault();
        handlers.onZoomOut?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
