"use client";

import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { listActiveBindings } from "@/features/story-production/lib/story-binding-engine";
import type { Story } from "@/features/story-production/lib/story.model";

type BindingsDebugPanelProps = {
  story: Story;
  bindings: Record<string, string>;
  open?: boolean;
};

/**
 * Developer-mode active bindings list (Module 3.7 debug).
 */
export function BindingsDebugPanel({
  story,
  bindings,
  open = true,
}: BindingsDebugPanelProps) {
  if (!open) return null;

  const rows = listActiveBindings(story, bindings);

  return (
    <div className="border-t border-border/60 bg-muted/20">
      <div className="border-b border-border/40 px-3 py-2">
        <p className={EDITOR_UI.label}>Bindings Debug · Live SSOT</p>
        <p className="text-[12px] text-muted-foreground">
          {rows.length} active · Story → Preview
        </p>
      </div>
      <div className="max-h-40 overflow-auto px-3 py-2 font-mono text-[11px]">
        {rows.map((row) => (
          <div
            key={row.binding}
            className="grid grid-cols-[1fr_1.2fr_1.6fr] gap-2 border-b border-border/20 py-1"
          >
            <span className="truncate text-muted-foreground">{row.field}</span>
            <span className="truncate text-sky-600 dark:text-sky-400">
              {row.binding}
            </span>
            <span className="truncate">{row.value || "—"}</span>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="py-3 text-muted-foreground">No active bindings yet.</p>
        ) : null}
      </div>
    </div>
  );
}
