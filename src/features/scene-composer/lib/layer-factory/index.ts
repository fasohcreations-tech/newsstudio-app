/**
 * Feature 042 — LayerFactory
 *
 * Single creation API for every editor object:
 *
 *   LayerFactory.create("headline", { durationMs, artboard })
 *
 * Canvas, AI Producer, Story Builder and future modules must call this —
 * do not hardcode `createSceneObject({ objectType: "rectangle" })`.
 */

import { DEFAULT_LAYER_RECIPES } from "@/features/scene-composer/lib/layer-factory/recipes";
import type { LayerFactoryOptions } from "@/features/scene-composer/lib/layer-factory/recipes";
import {
  LAYER_CATEGORY_ORDER,
  LAYER_MENU_CATALOG,
  type LayerCategory,
  type LayerKind,
  type LayerMenuItem,
} from "@/features/scene-composer/lib/layer-factory/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type Recipe = {
  kind: LayerKind;
  label: string;
  build: (options: LayerFactoryOptions) => SceneObject;
};

const recipes = new Map<LayerKind, Recipe>();
const menuItems = new Map<LayerKind, LayerMenuItem>();

function seed() {
  if (recipes.size > 0) return;
  for (const recipe of DEFAULT_LAYER_RECIPES) {
    recipes.set(recipe.kind, recipe);
  }
  for (const item of LAYER_MENU_CATALOG) {
    menuItems.set(item.kind, item);
  }
}

seed();

export const LayerFactory = {
  /**
   * Create a layer from a catalog kind.
   * Throws if the kind has no registered recipe — fail loud, never fall back
   * to Rectangle.
   */
  create(kind: LayerKind, options: LayerFactoryOptions = {}): SceneObject {
    seed();
    const recipe = recipes.get(kind);
    if (!recipe) {
      throw new Error(
        `LayerFactory: no recipe registered for kind "${kind}". Register one with LayerFactory.register().`,
      );
    }
    return recipe.build(options);
  },

  /** True when a recipe exists for this kind. */
  has(kind: LayerKind): boolean {
    seed();
    return recipes.has(kind);
  },

  /**
   * Extend or override a layer kind at runtime.
   * Future modules (AI Producer packs, brand kits) register here.
   */
  register(recipe: Recipe, menu?: Omit<LayerMenuItem, "kind" | "label"> & {
    label?: string;
    category: LayerCategory;
  }) {
    seed();
    recipes.set(recipe.kind, recipe);
    if (menu) {
      menuItems.set(recipe.kind, {
        kind: recipe.kind,
        label: menu.label ?? recipe.label,
        category: menu.category,
        description: menu.description,
      });
    } else if (!menuItems.has(recipe.kind)) {
      menuItems.set(recipe.kind, {
        kind: recipe.kind,
        label: recipe.label,
        category: "shapes",
      });
    }
  },

  /** Menu items grouped for the Add Layer UI. */
  getMenu(): Array<{ category: LayerCategory; items: LayerMenuItem[] }> {
    seed();
    return LAYER_CATEGORY_ORDER.map((category) => ({
      category,
      items: [...menuItems.values()].filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  },

  listKinds(): LayerKind[] {
    seed();
    return [...recipes.keys()];
  },
};

export type { LayerFactoryOptions };
export type { LayerKind, LayerCategory, LayerMenuItem } from "@/features/scene-composer/lib/layer-factory/types";
export {
  LAYER_CATEGORY_LABELS,
  LAYER_CATEGORY_ORDER,
  LAYER_MENU_CATALOG,
} from "@/features/scene-composer/lib/layer-factory/types";
