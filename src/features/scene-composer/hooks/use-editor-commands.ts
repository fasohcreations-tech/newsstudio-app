"use client";

import { useMemo, useRef } from "react";

import { createEditorCommands } from "@/features/scene-composer/lib/editor-commands/create-commands";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type UseEditorCommandsArgs = {
  getObjects: () => SceneObject[];
  replaceSilent: (objects: SceneObject[]) => void;
  commitChange: (
    next: SceneObject[],
    previous: SceneObject[],
    label: string,
  ) => void;
  onAfterChange?: () => void;
};

/**
 * Feature 041 — single editing API for the Design Workspace.
 * All object mutations should go through the returned command bag.
 */
export function useEditorCommands({
  getObjects,
  replaceSilent,
  commitChange,
  onAfterChange,
}: UseEditorCommandsArgs) {
  const getObjectsRef = useRef(getObjects);
  getObjectsRef.current = getObjects;
  const replaceSilentRef = useRef(replaceSilent);
  replaceSilentRef.current = replaceSilent;
  const commitChangeRef = useRef(commitChange);
  commitChangeRef.current = commitChange;
  const onAfterChangeRef = useRef(onAfterChange);
  onAfterChangeRef.current = onAfterChange;

  return useMemo(
    () =>
      createEditorCommands({
        getObjects: () => getObjectsRef.current(),
        live: (next) => {
          replaceSilentRef.current(next);
          onAfterChangeRef.current?.();
        },
        commit: (next, previous, label) => {
          commitChangeRef.current(next, previous, label);
          onAfterChangeRef.current?.();
        },
      }),
    [],
  );
}
