import type { UndoRedoService } from "@/features/creative-studio/services/interfaces/undo-redo.service";
import type { UndoableCommand } from "@/features/creative-studio/types/timeline-engine.types";

const MAX_STACK = 50;

export class LocalUndoRedoService implements UndoRedoService {
  private undoStack: UndoableCommand[] = [];
  private redoStack: UndoableCommand[] = [];
  private listeners = new Set<() => void>();

  private emit() {
    for (const listener of this.listeners) listener();
  }

  push(command: UndoableCommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_STACK) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.emit();
  }

  async undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    await command.undo();
    this.redoStack.push(command);
    this.emit();
    return true;
  }

  async redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    await command.redo();
    this.undoStack.push(command);
    this.emit();
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createUndoRedoService(): UndoRedoService {
  return new LocalUndoRedoService();
}
