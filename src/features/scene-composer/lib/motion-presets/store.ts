"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCustomPresetFromMotion,
  duplicatePreset,
  mergePresetCatalog,
} from "@/features/scene-composer/lib/motion-presets/registry";
import type { LayerMotionConfig } from "@/features/scene-composer/lib/motion-animation/types";
import type {
  MotionPreset,
  MotionPresetCategoryId,
  MotionPresetLibraryState,
} from "@/features/scene-composer/lib/motion-presets/types";
import { MOTION_PRESET_STORAGE_KEY } from "@/features/scene-composer/lib/motion-presets/types";

const EMPTY_STATE: MotionPresetLibraryState = {
  version: 1,
  favorites: [],
  custom: [],
};

function readStore(): MotionPresetLibraryState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(MOTION_PRESET_STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as MotionPresetLibraryState;
    if (!parsed || parsed.version !== 1) return EMPTY_STATE;
    return {
      version: 1,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeStore(state: MotionPresetLibraryState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOTION_PRESET_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Client library for favorites + custom presets (local persistence).
 */
export function useMotionPresetLibrary() {
  const [state, setState] = useState<MotionPresetLibraryState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readStore());
    setReady(true);
  }, []);

  const persist = useCallback((next: MotionPresetLibraryState) => {
    setState(next);
    writeStore(next);
  }, []);

  const catalog = useMemo(
    () => mergePresetCatalog(state.custom),
    [state.custom],
  );

  const favorites = state.favorites;

  const toggleFavorite = useCallback(
    (presetId: string) => {
      const next = favorites.includes(presetId)
        ? favorites.filter((id) => id !== presetId)
        : [...favorites, presetId];
      persist({ ...state, favorites: next });
    },
    [favorites, persist, state],
  );

  const saveCustom = useCallback(
    (preset: MotionPreset) => {
      const without = state.custom.filter((item) => item.id !== preset.id);
      persist({
        ...state,
        custom: [...without, { ...preset, builtin: false }],
      });
      return preset;
    },
    [persist, state],
  );

  const saveFromMotion = useCallback(
    (
      name: string,
      motion: LayerMotionConfig,
      category: MotionPresetCategoryId = "basic",
    ) => {
      const preset = createCustomPresetFromMotion(name, motion, category);
      return saveCustom(preset);
    },
    [saveCustom],
  );

  const duplicate = useCallback(
    (preset: MotionPreset, name?: string) => {
      const copy = duplicatePreset(preset, name);
      return saveCustom(copy);
    },
    [saveCustom],
  );

  const updateCustom = useCallback(
    (presetId: string, patch: Partial<MotionPreset>) => {
      const existing = state.custom.find((item) => item.id === presetId);
      if (!existing) return null;
      const next: MotionPreset = {
        ...existing,
        ...patch,
        id: existing.id,
        builtin: false,
        motion: patch.motion ?? existing.motion,
      };
      return saveCustom(next);
    },
    [saveCustom, state.custom],
  );

  const deleteCustom = useCallback(
    (presetId: string) => {
      persist({
        ...state,
        custom: state.custom.filter((item) => item.id !== presetId),
        favorites: state.favorites.filter((id) => id !== presetId),
      });
    },
    [persist, state],
  );

  const getById = useCallback(
    (id: string) => catalog.find((preset) => preset.id === id) ?? null,
    [catalog],
  );

  return {
    ready,
    catalog,
    favorites,
    custom: state.custom,
    toggleFavorite,
    saveCustom,
    saveFromMotion,
    duplicate,
    updateCustom,
    deleteCustom,
    getById,
  };
}
