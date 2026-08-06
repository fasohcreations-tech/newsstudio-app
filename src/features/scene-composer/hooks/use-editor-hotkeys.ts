"use client";

import { useEffect, useRef } from "react";

import type { EditorCommands } from "@/features/scene-composer/lib/editor-commands";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

type UseEditorHotkeysArgs = {
  enabled?: boolean;
  commands: EditorCommands;
  objects: SceneObject[];
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSelect: (ids: string[]) => void;
  onSelectAll: () => void;
  /** Internal clipboard (not OS clipboard for media security). */
  clipboardRef: React.MutableRefObject<SceneObject[]>;
};

/**
 * Feature 041 keyboard map for the Design Workspace.
 * Delete · Ctrl+C/V/D · Ctrl+Z/Shift+Z · Arrows · Shift+Arrows · Ctrl+A · Ctrl+G
 */
export function useEditorHotkeys({
  enabled = true,
  commands,
  objects,
  selectedIds,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onSelect,
  onSelectAll,
  clipboardRef,
}: UseEditorHotkeysArgs) {
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      const ids = selectedIdsRef.current;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          if (canRedo) onRedo();
        } else if (canUndo) {
          onUndo();
        }
        return;
      }

      if (mod && key === "y") {
        event.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      if (mod && key === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      if (mod && key === "a") {
        event.preventDefault();
        onSelectAll();
        return;
      }

      if (mod && key === "c") {
        if (ids.length === 0) return;
        event.preventDefault();
        clipboardRef.current = objectsRef.current
          .filter((object) => ids.includes(object.id))
          .map((object) => structuredClone(object));
        return;
      }

      if (mod && key === "v") {
        if (clipboardRef.current.length === 0) return;
        event.preventDefault();
        const created = commands.pasteLayers(clipboardRef.current);
        if (created.length > 0) onSelect(created);
        return;
      }

      if (mod && key === "d") {
        if (ids.length === 0) return;
        event.preventDefault();
        const created = commands.duplicateLayers(ids);
        if (created.length > 0) onSelect(created);
        return;
      }

      if (mod && key === "g") {
        if (ids.length < 2) return;
        event.preventDefault();
        if (event.shiftKey) {
          const primary = objectsRef.current.find(
            (object) => object.id === ids[0] && object.object_type === "group",
          );
          if (primary) {
            commands.ungroupLayer(primary.id);
            onSelect([]);
          }
        } else {
          commands.groupLayers(ids);
        }
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (ids.length === 0) return;
        event.preventDefault();
        const locked = objectsRef.current.some(
          (object) => ids.includes(object.id) && object.locked,
        );
        if (locked) return;
        commands.deleteLayers(ids);
        onSelect([]);
        return;
      }

      if (
        key === "arrowleft" ||
        key === "arrowright" ||
        key === "arrowup" ||
        key === "arrowdown"
      ) {
        if (ids.length === 0) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx =
          key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        commands.nudge(ids, dx, dy);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    clipboardRef,
    commands,
    enabled,
    onRedo,
    onSave,
    onSelect,
    onSelectAll,
    onUndo,
  ]);
}
