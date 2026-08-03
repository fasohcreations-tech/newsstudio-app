import type { ComposerHistoryCommand } from "@/features/scene-composer/types/scene-composer.types";

const MAX_STACK = 80;

export class ComposerHistoryService {
  private undoStack: ComposerHistoryCommand[] = [];
  private redoStack: ComposerHistoryCommand[] = [];
  private listeners = new Set<() => void>();

  private emit() {
    for (const listener of this.listeners) listener();
  }

  push(command: ComposerHistoryCommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_STACK) this.undoStack.shift();
    this.redoStack = [];
    this.emit();
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    this.emit();
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.redo();
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
    if (this.undoStack.length === 0 && this.redoStack.length === 0) return;
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function createComposerHistoryService() {
  return new ComposerHistoryService();
}
