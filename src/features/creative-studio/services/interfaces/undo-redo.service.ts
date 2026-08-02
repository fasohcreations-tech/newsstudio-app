import type { UndoableCommand } from "@/features/creative-studio/types/timeline-engine.types";

/**
 * Undo / redo stack for timeline edits.
 * Client-side only in Module 3.1 — no server persistence.
 */
export interface UndoRedoService {
  push(command: UndoableCommand): void;
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export type { UndoableCommand };
