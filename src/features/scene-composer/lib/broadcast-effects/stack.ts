import {
  DEFAULT_BLUR,
  DEFAULT_COLOR_GRADE,
  DEFAULT_DROP_SHADOW,
  DEFAULT_GLASS,
  DEFAULT_INNER_GLOW,
  DEFAULT_INNER_SHADOW,
  DEFAULT_LIGHT_SWEEP,
  DEFAULT_NOISE,
  DEFAULT_OUTLINE,
  DEFAULT_OUTER_GLOW,
  DEFAULT_PARTICLE,
  EFFECT_CATALOG,
} from "@/features/scene-composer/lib/broadcast-effects/defaults";
import type {
  BroadcastEffectInstance,
  BroadcastEffectStack,
  BroadcastEffectType,
} from "@/features/scene-composer/lib/broadcast-effects/types";
import { EFFECTS_METADATA_KEY } from "@/features/scene-composer/lib/broadcast-effects/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createEmptyEffectStack(): BroadcastEffectStack {
  return { version: 1, effects: [] };
}

export function createEffectInstance(
  type: BroadcastEffectType,
): BroadcastEffectInstance {
  const meta = EFFECT_CATALOG.find((item) => item.type === type);
  const name = meta?.name ?? type;
  const category = meta?.category ?? "lighting";

  switch (type) {
    case "light_sweep":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_LIGHT_SWEEP },
      };
    case "outer_glow":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_OUTER_GLOW },
      };
    case "inner_glow":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_INNER_GLOW },
      };
    case "drop_shadow":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_DROP_SHADOW },
      };
    case "inner_shadow":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_INNER_SHADOW },
      };
    case "glass":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_GLASS },
      };
    case "blur":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_BLUR },
      };
    case "color_grade":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_COLOR_GRADE },
      };
    case "outline":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_OUTLINE },
      };
    case "noise":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_NOISE },
      };
    case "particle_dust":
      return {
        id: uid("fx"),
        type,
        name,
        category,
        enabled: true,
        params: { ...DEFAULT_PARTICLE },
      };
    default:
      return {
        id: uid("fx"),
        type: "light_sweep",
        name: "Light Sweep",
        category: "lighting",
        enabled: true,
        params: { ...DEFAULT_LIGHT_SWEEP },
      };
  }
}

export function getObjectEffectStack(object: SceneObject): BroadcastEffectStack {
  const raw = object.metadata?.[EFFECTS_METADATA_KEY];
  if (!isRecord(raw) || !Array.isArray(raw.effects)) {
    return createEmptyEffectStack();
  }
  return {
    version: 1,
    effects: raw.effects.filter(isRecord).map((item) => item as unknown as BroadcastEffectInstance),
  };
}

export function setObjectEffectStack(
  object: SceneObject,
  stack: BroadcastEffectStack,
): SceneObject {
  return {
    ...object,
    metadata: {
      ...object.metadata,
      [EFFECTS_METADATA_KEY]: stack,
    },
  };
}

export function addEffect(
  stack: BroadcastEffectStack,
  type: BroadcastEffectType,
): BroadcastEffectStack {
  return {
    ...stack,
    effects: [...stack.effects, createEffectInstance(type)],
  };
}

export function removeEffect(
  stack: BroadcastEffectStack,
  effectId: string,
): BroadcastEffectStack {
  return {
    ...stack,
    effects: stack.effects.filter((effect) => effect.id !== effectId),
  };
}

export function duplicateEffect(
  stack: BroadcastEffectStack,
  effectId: string,
): BroadcastEffectStack {
  const source = stack.effects.find((effect) => effect.id === effectId);
  if (!source) return stack;
  const copy: BroadcastEffectInstance = {
    ...source,
    id: uid("fx"),
    name: `${source.name} Copy`,
    params: { ...source.params } as BroadcastEffectInstance["params"],
  };
  const index = stack.effects.findIndex((effect) => effect.id === effectId);
  const effects = [...stack.effects];
  effects.splice(index + 1, 0, copy);
  return { ...stack, effects };
}

export function reorderEffect(
  stack: BroadcastEffectStack,
  effectId: string,
  direction: "up" | "down",
): BroadcastEffectStack {
  const index = stack.effects.findIndex((effect) => effect.id === effectId);
  if (index < 0) return stack;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= stack.effects.length) return stack;
  const effects = [...stack.effects];
  const [item] = effects.splice(index, 1);
  effects.splice(target, 0, item);
  return { ...stack, effects };
}

export function setEffectEnabled(
  stack: BroadcastEffectStack,
  effectId: string,
  enabled: boolean,
): BroadcastEffectStack {
  return {
    ...stack,
    effects: stack.effects.map((effect) =>
      effect.id === effectId ? { ...effect, enabled } : effect,
    ),
  };
}

export function updateEffectParams(
  stack: BroadcastEffectStack,
  effectId: string,
  params: Record<string, unknown>,
): BroadcastEffectStack {
  return {
    ...stack,
    effects: stack.effects.map((effect) =>
      effect.id === effectId
        ? {
            ...effect,
            params: { ...effect.params, ...params } as BroadcastEffectInstance["params"],
          }
        : effect,
    ),
  };
}
