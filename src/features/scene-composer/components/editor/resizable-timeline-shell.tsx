"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";
import {
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
} from "@/features/scene-composer/components/editor/editor.constants";

type ResizableTimelineShellProps = {
  storageKey?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Vertically resizable bottom timeline shell (180–400px).
 */
export function ResizableTimelineShell({
  storageKey = "mediaos.composer.timeline-height",
  children,
  className,
}: ResizableTimelineShellProps) {
  const [height, setHeight] = usePersistedState(
    storageKey,
    TIMELINE_DEFAULT_HEIGHT,
  );
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(height);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      startY.current = event.clientY;
      startHeight.current = height;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);

      function onMove(e: PointerEvent) {
        const delta = startY.current - e.clientY;
        setHeight(
          Math.min(
            TIMELINE_MAX_HEIGHT,
            Math.max(TIMELINE_MIN_HEIGHT, startHeight.current + delta),
          ),
        );
      }

      function onUp() {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [height, setHeight],
  );

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col border-t border-border/60 bg-card",
        className,
      )}
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(height)}
        aria-valuemin={TIMELINE_MIN_HEIGHT}
        aria-valuemax={TIMELINE_MAX_HEIGHT}
        tabIndex={0}
        onPointerDown={onPointerDown}
        className={cn(
          "absolute inset-x-0 top-0 z-20 h-2 -translate-y-1/2 cursor-row-resize touch-none hover:bg-primary/20",
          dragging && "bg-primary/30",
        )}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
