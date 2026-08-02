import type {
  ComposerSettings,
  ComposerViewportState,
  ObjectTransform,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";

export function snapValue(value: number, gridSize: number, enabled: boolean) {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ComposerViewportState,
  rect: DOMRect,
) {
  const localX = screenX - rect.left;
  const localY = screenY - rect.top;
  return {
    x: (localX - viewport.panX) / viewport.zoom,
    y: (localY - viewport.panY) / viewport.zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: ComposerViewportState,
) {
  return {
    x: canvasX * viewport.zoom + viewport.panX,
    y: canvasY * viewport.zoom + viewport.panY,
  };
}

export function getArtboardDimensions(settings: ComposerSettings) {
  if (settings.resolution_preset === "custom") {
    return { width: settings.custom_width, height: settings.custom_height };
  }
  const [width, height] = settings.resolution_preset.split("x").map(Number);
  return { width, height };
}

export function clampTransform(
  transform: ObjectTransform,
  artboard: { width: number; height: number },
): ObjectTransform {
  return {
    ...transform,
    x: Math.max(-transform.width, Math.min(artboard.width, transform.x)),
    y: Math.max(-transform.height, Math.min(artboard.height, transform.y)),
    opacity: Math.max(0, Math.min(1, transform.opacity)),
    scale: Math.max(0.05, transform.scale),
  };
}

export function getObjectBounds(object: SceneObject) {
  return {
    left: object.transform.x,
    top: object.transform.y,
    width: object.transform.width * object.transform.scale,
    height: object.transform.height * object.transform.scale,
    right: object.transform.x + object.transform.width * object.transform.scale,
    bottom: object.transform.y + object.transform.height * object.transform.scale,
  };
}

export function hitTestObject(
  objects: SceneObject[],
  point: { x: number; y: number },
): SceneObject | null {
  const sorted = [...objects].sort((a, b) => b.sort_order - a.sort_order);
  for (const object of sorted) {
    if (!object.visible) continue;
    const b = getObjectBounds(object);
    if (
      point.x >= b.left &&
      point.x <= b.right &&
      point.y >= b.top &&
      point.y <= b.bottom
    ) {
      return object;
    }
  }
  return null;
}

export function alignObjects(
  objects: SceneObject[],
  mode: "left" | "center" | "right" | "top" | "middle" | "bottom",
): SceneObject[] {
  if (objects.length < 2) return objects;
  const bounds = objects.map(getObjectBounds);
  const minLeft = Math.min(...bounds.map((b) => b.left));
  const maxRight = Math.max(...bounds.map((b) => b.right));
  const minTop = Math.min(...bounds.map((b) => b.top));
  const maxBottom = Math.max(...bounds.map((b) => b.bottom));
  const centerX = (minLeft + maxRight) / 2;
  const centerY = (minTop + maxBottom) / 2;

  return objects.map((object, index) => {
    const b = bounds[index];
    let x = object.transform.x;
    let y = object.transform.y;
    switch (mode) {
      case "left":
        x = minLeft;
        break;
      case "center":
        x = centerX - b.width / 2;
        break;
      case "right":
        x = maxRight - b.width;
        break;
      case "top":
        y = minTop;
        break;
      case "middle":
        y = centerY - b.height / 2;
        break;
      case "bottom":
        y = maxBottom - b.height;
        break;
    }
    return { ...object, transform: { ...object.transform, x, y } };
  });
}

export function computeFitZoom(
  artboard: { width: number; height: number },
  container: { width: number; height: number },
  padding = 48,
): number {
  if (container.width <= 0 || container.height <= 0) return 0.5;
  const scaleX = (container.width - padding * 2) / artboard.width;
  const scaleY = (container.height - padding * 2) / artboard.height;
  return Math.max(0.1, Math.min(scaleX, scaleY, 1));
}

export function createCanvasService() {
  return {
    snapValue,
    screenToCanvas,
    canvasToScreen,
    getArtboardDimensions,
    clampTransform,
    getObjectBounds,
    hitTestObject,
    alignObjects,
    computeFitZoom,
  };
}
