# Render Provider Architecture

The Rendering Engine selects an encode backend entirely from environment
variables. Timeline Assembly, Scene Builder, Story Editor, Asset Engine, and
the Render Queue UI are unchanged.

## Providers

| `RENDER_PROVIDER` | Class | Role |
| --- | --- | --- |
| `local` (default) | `LocalFFmpegProvider` | Spawn FFmpeg / FFprobe on this machine |
| `cloud` | `CloudRenderProvider` | Submit / poll / fetch via future RenderOS |

Application code always calls `RenderManager.fromEnv()`. Switching providers
does not require code changes — only env + process restart.

## Environment

```bash
RENDER_PROVIDER=local          # or cloud
FFMPEG_PATH=ffmpeg             # or C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=ffprobe
RENDER_API=                    # e.g. http://127.0.0.1:8090
```

All are **server-only**. Never prefix with `NEXT_PUBLIC_`.

## Code map

```text
src/features/video-render-export/
  providers/irender-provider.ts
  providers/local-ffmpeg-provider.ts
  providers/cloud-render-provider.ts
  services/render-manager.ts
  services/run-managed-render.ts
  lib/render-env.ts
  lib/ffmpeg-process.ts
  types/render-provider.types.ts
```

## Local FFmpeg (hybrid composed + finalize)

1. Browser captures **assembled Motion Scenes** (`StoryLivePreview`) video-only
2. Stages the capture via `POST /api/video-renders/:id/stage-composed`
3. Local FFmpeg remuxes/transcodes that video and **muxes the voiceover**
4. Prefer hardware H.264 when available; Local file works if Storage upload fails

Asset-only concat is a fallback only when no composed capture was staged.

## Cloud / RenderOS (client only)

`CloudRenderProvider` speaks a planned HTTP API. The RenderOS server is **not**
implemented here.

```text
POST   {RENDER_API}/v1/renders
GET    {RENDER_API}/v1/renders/:id
POST   {RENDER_API}/v1/renders/:id/cancel
```

Submit body includes `renderId`, `organizationId`, `storyId`, `format`, and the
immutable `RenderPlan`. Poll responses should include `status`, `progress`,
`outputUrl`, and optional `error` / `durationMs` / `fileSizeBytes`.

Until RenderOS is running, cloud jobs fail with a clear unreachable / unconfigured
error and the queue shows **failed**.

## Local download without Storage upgrade

If Supabase rejects the upload (file size limit), encode still **succeeds**.
The file is cached on the app server and offered as **Local file** via:

`GET /api/video-renders/:renderId/local-download`

Use the Render engine cards in the Export panel to pick **Local FFmpeg** or
**RenderOS Cloud** per session (overrides `RENDER_PROVIDER` for that job).
**Clear queue** soft-deletes finished jobs.
