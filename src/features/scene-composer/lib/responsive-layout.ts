import type {
  ComposerSceneDocument,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";

export const RESPONSIVE_FORMATS = {
  "1920x1080": { width: 1920, height: 1080 },
  "1080x1920": { width: 1080, height: 1920 },
  "1080x1080": { width: 1080, height: 1080 },
  "3840x2160": { width: 3840, height: 2160 },
} as const;

function scaleObject(
  object: SceneObject,
  scaleX: number,
  scaleY: number,
): SceneObject {
  return {
    ...object,
    transform: {
      ...object.transform,
      x: Math.round(object.transform.x * scaleX),
      y: Math.round(object.transform.y * scaleY),
      width: Math.max(1, Math.round(object.transform.width * scaleX)),
      height: Math.max(1, Math.round(object.transform.height * scaleY)),
    },
  };
}

export function buildResponsiveVariant(
  base: ComposerSceneDocument,
  from: { width: number; height: number },
  to: { width: number; height: number },
): ComposerSceneDocument {
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;

  const objects = base.objects.map((object) => scaleObject(object, scaleX, scaleY));
  return {
    ...base,
    layers: base.layers.map((layer) => ({
      ...layer,
      transform: {
        ...layer.transform,
        x: Math.round(layer.transform.x * scaleX),
        y: Math.round(layer.transform.y * scaleY),
      },
      style: {
        ...layer.style,
        width: Math.round(Number(layer.style.width ?? 0) * scaleX),
        height: Math.round(Number(layer.style.height ?? 0) * scaleY),
      },
    })),
    objects,
  };
}

export function buildAllResponsiveVariants(
  base: ComposerSceneDocument,
  from = RESPONSIVE_FORMATS["1920x1080"],
) {
  return {
    "1920x1080": base,
    "1080x1920": buildResponsiveVariant(base, from, RESPONSIVE_FORMATS["1080x1920"]),
    "1080x1080": buildResponsiveVariant(base, from, RESPONSIVE_FORMATS["1080x1080"]),
    "3840x2160": buildResponsiveVariant(base, from, RESPONSIVE_FORMATS["3840x2160"]),
  };
}
