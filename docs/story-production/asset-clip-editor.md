# MediaOS Asset Engine — Module 2.5 Asset Clip Editor

Reusable clip editor for MediaOS (architectural reference: BroadcastOS
`src/features/clip-editor`). Clips are **metadata overlays** on parent
`media_assets` — originals are never rewritten.

## Capabilities

- Multi-source import providers: local upload, Supabase Storage / Media Library,
  YouTube URL, web-search imports
- Preview + timeline with IN/OUT drag handles, frame step, timecode entry,
  loop selection, jump to IN/OUT
- Save / update / duplicate / soft-delete clips
- Queue poster / extract-audio / proxy operations (metadata jobs)
- Story Panel refs: `clip://{clipId}` (preferred) or `library://{assetId}`
- Scene Builder / preview resolve clips through parent playback URLs

## Schema

Migration `20260324000024_asset_clip_editor.sql`:

- `media_assets.external_url`, `source_provider`
- `media_asset_clips` (in/out/duration/thumbnail/metadata)
- `clip_thumbnails`

## Routes

- `/media-library/clip-editor?asset=&clipId=`
- `/media-library/clips`

## Code map

```text
src/features/asset-clip-editor/
  actions/clip.actions.ts
  components/   # editor, timeline, preview, library
  lib/          # timecode, clip:// refs
  providers/    # import provider registry
  services/clip.service.ts
  schemas/
  types/
```

## Related

Module 2.6 AI Visual Understanding extends this editor with an analysis +
recommendation rail (`docs/story-production/ai-visual-understanding.md`).
Manual IN/OUT editing remains the source of truth until Accept.

