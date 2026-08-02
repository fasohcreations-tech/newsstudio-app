# Module 3.7 — Live Story Data Binding Engine

## Purpose

Make the **Story Data Form** the Single Source of Truth (SSOT) for Scene Composer.

Preview, timeline layers, inspector, and assets all read from the same Story model. No Save or Refresh is required for live updates.

## Story model

Canonical type: `Story` (`StoryDataRecord`) in `src/features/story-production/lib/story.model.ts`.

Key fields: headline, subheadline, summary, reporter, reporter photo, location, category, breaking, live, logo, main/secondary video, images, ticker, quote, bible verse, voice over, music, clock, date, theme.

## Binding engine

`src/features/story-production/lib/story-binding-engine.ts`

| Concern | Behavior |
|---------|----------|
| Form → bindings | `buildLiveStoryBindings(story, existing)` |
| Tokens | `{{headline}}`, `{{main_video}}`, `{{ticker}}`, … |
| Clock / Date | System clock overlay after mount (`applySystemClockBindings`) |
| Regions | `REGION_STORY_BINDINGS` maps GNN-001 regions → Story fields |
| Debug | `listActiveBindings` + Bindings panel toggle |

## Reactive flow

1. User edits Story Form / Assets / Inspector  
2. `useStoryDataForm.updateField` / `applyAsset`  
3. `mergeStoryDataBindings` → `resolved_bindings` + `metadata.story_data`  
4. `EditorCanvas` receives `storyForm.bindings`  
5. Preview resolves tokens / media immediately  

Autosave still persists to the database; it is **not** required for preview.

## Skeleton regions

GNN-001 placeholders use Story tokens (not static labels):

- Headline → `{{headline}}`
- Subheadline → `{{subheadline}}`
- Ticker → `{{ticker}}`
- Clock → `{{time}}` (system)
- Date → `{{date}}` (system)
- Reporter/Logo → `{{reporter_photo}}` / `{{logo}}`
- Main Video → `{{main_video}}` (Layer 3 container also binds this)

Placeholders (`ReadablePlaceholder`) appear only when the bound value is empty.

## Demo seed

On first open (no stored story, or empty story before engine `3.7`), demo Malayalam/English package + demo media under `/demo/gnn/` is applied after mount.

## Developer debug

Header **Bindings** toggle shows active field → `{{token}}` → value under Assets.

## Files

- `lib/story.model.ts`
- `lib/story-binding-engine.ts`
- `lib/story-data-bindings.ts`
- `lib/story-data-defaults.ts`
- `hooks/use-story-data-form.ts`
- `hooks/use-system-clock.ts`
- `components/panels/bindings-debug-panel.tsx`
- Skeleton: `gnn-001-full-news-story-skeleton.ts` (v8)
- Preview: `story-live-preview.tsx`
