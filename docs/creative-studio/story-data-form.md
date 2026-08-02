# Module 3.5 – Story Data Form + Live Preview

Transforms the Scene Composer into a **News Production Workspace**. Placeholders are never edited directly — all content flows through the **Story Data Form** and binds to scene variables via `{{token}}` resolution.

## Workspace layout

| Panel | Role |
|-------|------|
| **Left** | Story Assets — bundled demo videos, images, voice, music, logos |
| **Center** | Live Preview — responsive aspect ratios, playback scrubber |
| **Right** | Story Data Form — General, Media, Text, Theme tabs |
| **Bottom** | Timeline + animation tracks (object timing) |

## Folder structure

```
src/features/story-production/
  types/story-data.types.ts
  constants/story-data.constants.ts
  constants/demo-assets.constants.ts
  lib/story-data-defaults.ts
  lib/story-data-bindings.ts
  services/story-preview.service.ts
  hooks/use-story-data-form.ts
  components/story-live-preview.tsx
  components/panels/story-assets-panel.tsx
  components/panels/story-data-form-panel.tsx
  components/panels/live-preview-panel.tsx
  components/form/story-form-field.tsx
  schemas/story-data.schema.json

public/demo/gnn/
  logo.svg, reporter.svg, image-1..3.svg
  sample-news.mp4, background-video.mp4
  sample-voice.mp3, sample-music.mp3
```

## Binding flow

```
StoryDataRecord (form)
    ↓ storyDataToBindings()
resolved_bindings (scene)
    ↓ mergeStoryDataBindings()
StoryLivePreview / ComposerCanvas / MotionSceneOverlay
    ↓ resolveVariableTokens()
Rendered headline, reporter, media, ticker, clock, date…
```

### Example mappings

| Form field | Binding token |
|------------|---------------|
| Headline | `{{headline}}` |
| Reporter Name | `{{reporter}}` |
| Main Video | `{{main_video}}` / `{{video}}` |
| Logo | `{{logo}}` / `{{channel_logo}}` |
| Voice Over | `{{voice_over}}` / `{{voice}}` |
| Ticker | `{{ticker}}` |
| Bible Verse | `{{verse}}` |

## Live update

- No Save button required for preview — form edits call `updateSceneMeta({ resolved_bindings })` immediately.
- Autosave persists `resolved_bindings` + `metadata.story_data` to `creative_studio_motion_scenes`.

## Demo assets

On first open (empty bindings), `createDemoStoryData()` seeds Malayalam sample content with bundled `/demo/gnn/*` assets so GNN master scenes render completely.

## AI-ready

The flat `StoryDataRecord` schema is designed for future population by:

- AI News Collector
- AI Script Writer
- AI Voice Generator
- AI Thumbnail Generator
- AI Image Selector
- AI Timeline Builder

No UI redesign required — AI writes the same JSON the form edits.

## Not in scope (Module 3.5)

- AI implementation
- FFmpeg / final rendering
- Publishing pipeline

## Integration points

- `SceneComposerWorkspace` — production layout shell
- `saveComposerSceneAction` — persists bindings + story metadata
- `variable-binding.ts` — token resolution (shared with timeline preview)
