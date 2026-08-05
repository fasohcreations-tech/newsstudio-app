# Module 3.1 — Video Rendering & Export Engine

Renders an assembled **Timeline** into a publishable video file.
Non-destructive: never mutates Story, Story Panels, Master Templates, Scene
Instances, or Timeline rows.

## Pipeline position

```text
Timeline Assembly (3.0)
  → Video Rendering & Export (3.1)
  → publishable MP4 / WebM / MOV
```

BroadcastOS is intentionally out of scope.

## Features

1. **Render Provider Architecture** — `IRenderProvider` + `RenderManager`; `RENDER_PROVIDER=local|cloud`
2. **Local FFmpeg** — `LocalFFmpegProvider` via `FFMPEG_PATH` / `FFPROBE_PATH`
3. **RenderOS stub** — `CloudRenderProvider` via `RENDER_API` (server not implemented yet)
4. **Export Dialog** — format, resolution, frame rate, bitrate, voice/music
5. **Render Queue** — status, progress, ETA, cancel, retry, open/download (unchanged UI)
6. **Supabase Storage** — provider output uploaded after encode (local) or URL from RenderOS (cloud)

See [render-providers.md](./render-providers.md).

## Schema

Migration `20260324000028_video_render_export.sql` → `story_video_renders`.

## UI

Story Workspace → **Timeline** tab → **Video Rendering & Export** card
(below Timeline Assembly; Creative Studio remains optional and unchanged).

## Code map

```text
src/features/video-render-export/
  actions/render.actions.ts
  components/video-export-dialog.tsx
  components/video-render-queue.tsx
  components/video-render-export-panel.tsx
  providers/irender-provider.ts
  providers/local-ffmpeg-provider.ts
  providers/cloud-render-provider.ts
  services/render-manager.ts
  services/run-managed-render.ts
  services/render-job.service.ts
  lib/render-env.ts
  types/render-provider.types.ts
  types/render.types.ts
```

Apply migration `000028` on your Supabase project before using Export.
