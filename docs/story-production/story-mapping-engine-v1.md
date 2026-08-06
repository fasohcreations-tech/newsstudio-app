# MediaOS Feature 048 — Story Mapping Engine & Smart Container Binding

**Branch:** `feature/story-mapping-engine-v1`  
**Status:** Phase 1 implemented

---

## Objective

The Scene Composer must **never** bind Smart Containers directly to Story fields.

Instead:

```
Story → Sections (Sub Headlines) → Assets → Mapping Engine → Smart Containers → Renderer
```

The Story Editor is unchanged. The Mapping Engine converts Story data into Scene content. Timeline and Renderer consume the **same mapped Scene** Preview displays.

---

## Storage

| Concern | Location |
|---------|----------|
| Mapping contract | `SceneObject.content.smart_mapping` |
| Playback / slide queue | `SceneObject.content.media_container` (existing) |
| Kind | `metadata.role` / `layer_kind` / `container_kind` |
| Direct Story tokens on Smart Containers | **Not used** |

Template format stays mapping-only for non-manual modes (resolve-at-read). Manual mode authors `media_container.slides` locally.

---

## Catalogs

### Accepted data types

`text` · `image` · `video` · `audio` · `svg` · `clock` · `ticker` · `logo` · `advertisement` · `ai_output` · `story_metadata`

### Binding sources

`story` · `story_headline` · `story_summary` · `reporter` · `location` · `date` · `voice_over` · `ticker` · `current_sub_headline` · `current_sub_headline_assets` · `current_voice_segment` · `organization` · `static_value`

### Mapping modes

| Mode | Phase 1 behavior |
|------|------------------|
| `single` | First accepted candidate |
| `first` | First candidate |
| `last` | Last candidate |
| `slideshow` | All candidates as internal pages |
| `manual` | Use authored `media_container.slides` |
| `sequential` | Alias → slideshow |
| `random` | Shuffle once, take first |
| `grid` | Alias → slideshow (layout deferred) |
| `timeline` | Alias → slideshow (scrub sync deferred) |

### Transitions

`cut` · `crossfade` · `slide` · `push` · `zoom`

---

## Slide Smart Container

Layer kind `slide_smart_container`. Defaults:

- Accepted: image + video  
- Source: Current Sub Headline Assets  
- Mode: Slideshow  
- Transition: Cross Fade  
- Duration: Auto  

Unlimited internal pages are created by the Mapping Engine — the designer does not duplicate layers.

---

## Modules

- `src/features/scene-composer/lib/story-mapping/`
- Mapping Panel: `components/editor/layer-mapping-panel.tsx` (inspector tab `mapping`)
- Wire-in: `scene-composer-workspace.tsx`, `story-live-preview.tsx`, `scene-to-runtime.ts`

---

## Non-goals (this branch)

- True Grid layout rendering  
- Timeline playhead-driven per-page scrub beyond slideshow interval  
- AI Scene Generation callers (architecture is ready; template format unchanged)
