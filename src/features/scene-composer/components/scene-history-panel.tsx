"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  listMotionSceneVersionsAction,
  restoreMotionSceneVersionAction,
  saveMotionSceneVersionAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
import type { SceneVersion } from "@/features/motion-scene-engine/types/motion-scene.types";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";

type SceneHistoryPanelProps = {
  sceneId: string;
  sceneName: string;
  currentVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
  onVersionSaved: (version: number) => void;
  /** Persist live editor state to the scene file before checkpoint/restore. */
  persistLiveScene: () => Promise<void>;
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SceneHistoryPanel({
  sceneId,
  sceneName,
  currentVersion,
  open,
  onOpenChange,
  onRestored,
  onVersionSaved,
  persistLiveScene,
}: SceneHistoryPanelProps) {
  const [versions, setVersions] = useState<SceneVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listMotionSceneVersionsAction(sceneId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not load history");
      return;
    }
    setVersions(result.data);
  }, [sceneId]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const saveCheckpoint = async () => {
    setBusyId("checkpoint");
    await persistLiveScene();
    const result = await saveMotionSceneVersionAction({
      sceneId,
      label: `Checkpoint · ${formatWhen(new Date().toISOString())}`,
    });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error ?? "Checkpoint failed");
      return;
    }
    onVersionSaved(result.data.version);
    toast.success(`Saved checkpoint v${result.data.version}`);
    await refresh();
  };

  const restore = async (version: SceneVersion) => {
    const confirmed = window.confirm(
      `Restore "${version.name}" (v${version.version_number})?\n\n` +
        `Current live work will be checkpointed first. Scene name stays "${sceneName}".`,
    );
    if (!confirmed) return;

    setBusyId(version.id);
    await persistLiveScene();
    const result = await restoreMotionSceneVersionAction({
      sceneId,
      versionId: version.id,
    });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error ?? "Restore failed");
      return;
    }
    toast.success(`Restored v${version.version_number}`);
    onRestored();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" />
            Scene History
          </SheetTitle>
          <SheetDescription>
            {sceneName} keeps one live file. Checkpoints are separate and can be
            restored anytime.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 px-4">
          <Badge variant="secondary">Live v{currentVersion}</Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={EDITOR_UI.button}
            disabled={busyId !== null}
            onClick={() => void saveCheckpoint()}
          >
            {busyId === "checkpoint" ? "Saving…" : "Save checkpoint"}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checkpoints yet. Use Save in the editor (creates a checkpoint) or
              Save checkpoint here.
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="rounded-md border border-border/70 bg-background/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {version.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        v{version.version_number} · {formatWhen(version.created_at)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={EDITOR_UI.button}
                      disabled={busyId !== null}
                      onClick={() => void restore(version)}
                    >
                      <RotateCcw className="mr-1 size-3.5" />
                      {busyId === version.id ? "…" : "Restore"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
