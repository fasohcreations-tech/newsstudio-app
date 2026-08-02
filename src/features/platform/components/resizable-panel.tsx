"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";

type ResizablePanelProps = {
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  side?: "left" | "right";
  className?: string;
  /** When true, panel is visible below xl breakpoints (editor workspaces). */
  alwaysVisible?: boolean;
  children: ReactNode;
};

/**
 * Horizontally resizable panel with persisted width.
 */
export function ResizablePanel({
  storageKey,
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 480,
  side = "right",
  className,
  alwaysVisible = false,
  children,
}: ResizablePanelProps) {
  const [width, setWidth] = usePersistedState(storageKey, defaultWidth);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      startX.current = event.clientX;
      startWidth.current = width;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);

      function onMove(e: PointerEvent) {
        const delta = e.clientX - startX.current;
        const next =
          side === "right"
            ? startWidth.current - delta
            : startWidth.current + delta;
        setWidth(Math.min(maxWidth, Math.max(minWidth, next)));
      }

      function onUp(e: PointerEvent) {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        try {
          event.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // already released
        }
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width, side, minWidth, maxWidth, setWidth],
  );

  return (
    <aside
      className={cn(
        "relative shrink-0 border-border/60 bg-background",
        alwaysVisible ? "flex flex-col" : "hidden xl:flex xl:flex-col",
        side === "right" ? "border-l" : "border-r",
        className,
      )}
      style={{ width }}
      aria-label="Resizable side panel"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(width)}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            setWidth(Math.min(maxWidth, width + (side === "right" ? 16 : -16)));
          }
          if (e.key === "ArrowRight") {
            setWidth(Math.min(maxWidth, Math.max(minWidth, width + (side === "right" ? -16 : 16))));
          }
        }}
        className={cn(
          "absolute inset-y-0 z-10 w-1.5 cursor-col-resize touch-none bg-transparent hover:bg-primary/20 focus-visible:bg-primary/30 focus-visible:outline-none",
          side === "right" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
          dragging && "bg-primary/30",
        )}
      />
      {children}
    </aside>
  );
}
