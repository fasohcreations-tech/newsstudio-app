"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  applyBindingsToDocument,
  buildDefaultBindings,
} from "@/features/motion-scene-engine/lib/variable-binding";
import type { MotionSceneDocument } from "@/features/motion-scene-engine/types/motion-scene.types";

type MotionSceneOverlayProps = {
  sceneDocument: MotionSceneDocument;
  canvasWidth?: number;
  canvasHeight?: number;
  resolvedBindings?: Record<string, string>;
  className?: string;
  style?: CSSProperties;
};

export function MotionSceneOverlay({
  sceneDocument,
  canvasWidth = 1920,
  canvasHeight = 1080,
  resolvedBindings = {},
  className,
  style,
}: MotionSceneOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const document = useMemo(
    () =>
      applyBindingsToDocument(sceneDocument, {
        ...buildDefaultBindings(),
        ...resolvedBindings,
      }),
    [sceneDocument, resolvedBindings],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setFitScale(
        Math.min(width / canvasWidth, height / canvasHeight),
      );
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, position: style?.position ?? "absolute" }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `translate(-50%, -50%) scale(${fitScale})`,
          transformOrigin: "center center",
        }}
      >
        {document.layers.map((layer) => {
          if (!layer.visible) return null;
          const text =
            typeof layer.content.text === "string"
              ? layer.content.text
              : layer.name;
          const width = Number(layer.style.width ?? 0);
          const height = Number(layer.style.height ?? 0);
          const hasSize = width > 0 && height > 0;

          return (
            <div
              key={layer.id}
              className="absolute overflow-hidden rounded"
              style={{
                left: layer.transform.x,
                top: layer.transform.y,
                width: hasSize ? width : undefined,
                height: hasSize ? height : undefined,
                maxWidth: hasSize ? undefined : "80%",
                transform: `scale(${layer.transform.scale}) rotate(${layer.transform.rotation}deg)`,
                transformOrigin: "top left",
                opacity: layer.transform.opacity,
                background:
                  (layer.style.fill as string | undefined) ??
                  "rgba(0,0,0,0.75)",
                borderRadius: (layer.style.corner_radius as number) ?? 4,
                fontFamily: (layer.style.font_family as string) ?? "Inter",
                fontSize: (layer.style.font_size as number) ?? 24,
                fontWeight: (layer.style.font_weight as number) ?? 600,
                color: (layer.style.color as string) ?? "#fff",
                padding: hasSize ? "8px 12px" : "8px 12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
