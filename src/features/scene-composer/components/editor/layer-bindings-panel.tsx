"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { TEXT_LAYER_BINDING_KEYS } from "@/features/scene-composer/lib/text-layer";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const NONE = "__none__";

/**
 * Story data keys a layer can bind to. Text bindings write `bindings.text`,
 * media bindings write `bindings.src` (+ `bindings.story_field` so the media
 * browser knows which story field an "Assign asset" action should target).
 */
const TEXT_BINDING_KEYS = TEXT_LAYER_BINDING_KEYS.filter(
  // Avoid duplicate "Story Summary" entries (summary + story share a label).
  (item, index, list) =>
    list.findIndex((other) => other.label === item.label) === index,
);

const MEDIA_BINDING_KEYS: Array<{ key: string; label: string }> = [
  { key: "video", label: "Main video" },
  { key: "image", label: "Main image" },
  { key: "logo", label: "Logo" },
  { key: "optional_info_image", label: "Optional info image" },
  { key: "reporter_photo", label: "Reporter photo" },
  { key: "background_image", label: "Background image" },
  { key: "advertisement", label: "Advertisement" },
  { key: "voice", label: "Voice over" },
  { key: "music", label: "Background music" },
];

/** `{{key}}` → `key`; passthrough for raw URLs / unbound values. */
function tokenKey(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^\{\{\s*([\w.-]+)\s*\}\}$/.exec(value.trim());
  return match ? match[1] : null;
}

export function LayerBindingsPanel({
  object,
  onObjectPatch,
}: {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const textKey = tokenKey(object.bindings.text);
  const mediaKey =
    tokenKey(object.bindings.src) ??
    (typeof object.bindings.story_field === "string"
      ? object.bindings.story_field
      : null);
  const rawSrc = object.bindings.src?.trim();
  const hasLiteralSrc = Boolean(rawSrc) && tokenKey(rawSrc) === null;

  const setTextBinding = (key: string) => {
    const next = { ...object.bindings };
    if (key === NONE) {
      delete next.text;
      onObjectPatch(object.id, { bindings: next });
      return;
    }
    next.text = `{{${key}}}`;
    // Keep content.text in sync so the token shows in edit mode too.
    onObjectPatch(object.id, {
      bindings: next,
      content: { ...object.content, text: `{{${key}}}` },
    });
  };

  const setMediaBinding = (key: string) => {
    const next = { ...object.bindings };
    if (key === NONE) {
      delete next.src;
      delete next.story_field;
      onObjectPatch(object.id, { bindings: next });
      return;
    }
    next.src = `{{${key}}}`;
    next.story_field = key;
    onObjectPatch(object.id, { bindings: next });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className={EDITOR_UI.panelTitle}>Data Bindings</p>
        <p className={EDITOR_UI.helper}>
          The template decides layout; the story supplies these values at render
          time.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Text binding</Label>
        <Select
          value={textKey ?? NONE}
          onValueChange={(value: string) => setTextBinding(value)}
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue placeholder="Not bound" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not bound</SelectItem>
            {TEXT_BINDING_KEYS.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Media binding</Label>
        <Select
          value={mediaKey ?? NONE}
          onValueChange={(value: string) => setMediaBinding(value)}
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue placeholder="Not bound" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not bound</SelectItem>
            {MEDIA_BINDING_KEYS.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasLiteralSrc ? (
          <p className={EDITOR_UI.helper}>
            This layer currently holds a directly assigned asset. Choosing a
            media binding replaces it with a story-driven value.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Active tokens</Label>
        {Object.keys(object.bindings).length === 0 ? (
          <p className={EDITOR_UI.helper}>No bindings on this layer.</p>
        ) : (
          <ul className="space-y-1">
            {Object.entries(object.bindings).map(([key, value]) => (
              <li
                key={key}
                className="flex items-baseline justify-between gap-2 text-[11px]"
              >
                <span className="text-muted-foreground">{key}</span>
                <span className="truncate font-mono" title={value}>
                  {value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
