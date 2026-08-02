"use client";

import { useCallback, useEffect, useState } from "react";

import { createUndoRedoService } from "@/features/creative-studio/services/undo-redo.service.impl";
import type { UndoableCommand } from "@/features/creative-studio/types/timeline-engine.types";

const undoRedoService = createUndoRedoService();

export function useUndoRedo() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return undoRedoService.subscribe(() => setRevision((n) => n + 1));
  }, []);

  const push = useCallback((command: UndoableCommand) => {
    undoRedoService.push(command);
  }, []);

  const undo = useCallback(async () => {
    await undoRedoService.undo();
  }, []);

  const redo = useCallback(async () => {
    await undoRedoService.redo();
  }, []);

  const clear = useCallback(() => {
    undoRedoService.clear();
  }, []);

  return {
    revision,
    canUndo: undoRedoService.canUndo(),
    canRedo: undoRedoService.canRedo(),
    push,
    undo,
    redo,
    clear,
  };
}
