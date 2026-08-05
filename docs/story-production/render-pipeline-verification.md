# Module 3.1 — Current Render Pipeline (Verification Handoff)

**Audience:** Head developer verification  
**Date:** 2026-08-05  
**Feature root:** `src/features/video-render-export/`  
**Status:** Hybrid Local path is the production path. Capture engine **`dom-raster-v11-playback`** + **Render Verification Mode**. Frames are rasterized from the live `StoryLivePreview` DOM (full CSS fidelity), and capture is **frame-accurate** (`requestFrame` + FFmpeg re-time) so paint speed cannot truncate the timeline.

---

## 1. Intent

Render the **assembled Timeline** (Motion Scenes + scene-instance media + voice) into a publishable MP4/WebM/MOV.

- **Non-destructive:** never mutates Timeline / Scene Builder / Story Editor / Asset Engine rows.
- **BroadcastOS:** out of scope.
- **Constraint:** do not change Timeline Assembly / Scene Builder / Story Editor / Asset Engine / Render Queue contracts beyond additive props.

---

## 2. End-to-end architecture (Local = default)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Timeline tab → VideoRenderExportPanel                                   │
│  engine = local | cloud (UI overrides RENDER_PROVIDER per job)          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. createVideoRenderAction                                              │
│    render-job.service → buildRenderPlan → INSERT story_video_renders    │
│    status=queued, render_plan jsonb (immutable snapshot)                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          │ LOCAL                                     │ CLOUD
          ▼                                           ▼
┌──────────────────────────┐            ┌──────────────────────────────┐
│ 2a. Browser capture      │            │ 2b. Skip capture             │
│  ComposedSceneCaptureHost│            │ executeProviderRenderAction  │
│  + browser-render-worker │            │ → CloudRenderProvider        │
│  → WebM (video only)     │            │ → RENDER_API (stub client)   │
│ 2b. POST stage-composed  │            └──────────────────────────────┘
│  → temp .composed.webm   │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 3. executeProviderRender │
│    RenderManager         │
│    → LocalFFmpegProvider │
│    prefer staged WebM    │
│    + mux voice via FFmpeg│
│    → MP4 bytes           │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 4. runManagedRenderJob   │
│    cacheRenderOutput     │
│    best-effort Storage   │
│    Local file download   │
└──────────────────────────┘
```

---

## 3. File map

### UI

| File | Role |
|------|------|
| `components/video-render-export-panel.tsx` | Orchestrator: engine picker, Export, capture→stage→execute, Log/Queue |
| `components/video-export-dialog.tsx` | Format / resolution / fps / bitrate / voice |
| `components/video-render-queue.tsx` | Queue UI, Local file button, clear queue |
| `components/composed-scene-capture-host.tsx` | Off-screen `StoryLivePreview` (`playback` + clocks) + DOM rasterizer (`dom-raster-v11-playback`) |

### Job / plan

| File | Role |
|------|------|
| `actions/render.actions.ts` | Server actions (create, execute, progress, clear) |
| `services/render-job.service.ts` | Timeline+scenes → plan → DB row |
| `lib/build-render-plan.ts` | Immutable `RenderPlan` from scene-track clips |
| `types/render.types.ts` | `RenderPlan`, job row, settings |
| `schemas/render.schemas.ts` | Zod |

### Browser capture

| File | Role |
|------|------|
| `services/browser-render-worker.ts` | Frame loop, `captureStream(0)` + `requestFrame`, MediaRecorder, FPS cap 6 |
| `lib/ensure-scrubbable-blob.ts` | WebM duration patch for scrubbing |
| `app/api/render-media-proxy/route.ts` | Same-origin proxy (CORS-safe canvas) |
| `app/api/video-renders/[id]/stage-composed/route.ts` | Cache browser WebM for FFmpeg |

### Providers

| File | Role |
|------|------|
| `providers/irender-provider.ts` | Interface |
| `providers/local-ffmpeg-provider.ts` | Staged compose finalize **or** asset-concat fallback |
| `providers/cloud-render-provider.ts` | HTTP client to future RenderOS |
| `services/render-manager.ts` | `fromEnv(override?)` |
| `services/run-managed-render.ts` | Progress DB + cache + Storage |
| `lib/ffmpeg-process.ts` | Spawn FFmpeg/FFprobe |
| `lib/render-env.ts` | `RENDER_PROVIDER`, `FFMPEG_*`, `RENDER_API` |
| `lib/local-render-cache.ts` | OS temp `mediaos-render-cache` |

### Schema / config

| File | Role |
|------|------|
| `supabase/migrations/20260324000028_video_render_export.sql` | `story_video_renders` |
| `supabase/migrations/20260324000029_video_render_clear_rls.sql` | UPDATE RLS WITH CHECK fix |
| `next.config.ts` | Body size **64mb** for staging large WebMs |

---

## 4. Step-by-step with code

### 4.1 Create job + immutable plan

`render-job.service` requires Timeline `ready`, Scene Collection, resolves `video_asset_ref` / `image_asset_ref` to signed URLs, then:

```57:94:src/features/video-render-export/lib/build-render-plan.ts
    return {
      clipId: clip.id,
      sceneInstanceId: clip.scene_instance_id,
      motionSceneId: instance?.scene_id ?? null,
      name: clip.name,
      startMs: clip.start_ms,
      endMs: clip.end_ms,
      durationMs: clip.duration_ms,
      trimInMs: clip.trim_in_ms ?? 0,
      headline: instance?.headline?.trim() || instance?.name || clip.name,
      subheadline: instance?.subheadline?.trim() || "",
      videoUrl: media?.videoUrl ?? null,
      imageUrl: media?.imageUrl ?? null,
      transitionToNext: transition?.transition_type ?? "cut",
      transitionDurationMs: transition?.duration_ms ?? 0,
    };
  // ...
  return {
    version: 1,
    storyId: input.storyId,
    timelineId: input.bundle.timeline.id,
    durationMs,
    width,
    height,
    frameRate: input.settings.frameRate,
    format: input.settings.format,
    bitrateKbps: input.settings.bitrateKbps,
    voiceUrl: input.settings.includeVoice ? input.voiceUrl : null,
    musicUrl: input.settings.includeMusic ? input.musicUrl : null,
    clips: planClips,
    builtAt: new Date().toISOString(),
  };
```

**Verify:** plan clips must carry `motionSceneId` + `videoUrl`/`imageUrl` for assembled look. If `videoUrl` is null, Main Video hole stays empty even if Timeline monitor shows media (bindings mismatch).

---

### 4.2 Local hybrid — browser capture then stage

Panel (only when `provider === "local"`):

```185:258:src/features/video-render-export/components/video-render-export-panel.tsx
  async function stageComposedCapture(job: VideoRenderRow) {
    // ...
    const captured = await runBrowserTimelineRender(job.render_plan, {
      videoOnly: true,
      shouldCancel: () => cancelRef.current,
      capture: {
        warmUp: (plan) => { /* ComposedSceneCaptureHost.warmUp */ },
        paintFrame: (timeMs, dest) => { /* ComposedSceneCaptureHost.paintFrame */ },
      },
      // progress mapped ~5–52%
    });
    const form = new FormData();
    form.append("file", captured.blob, `composed-….webm`);
    const res = await fetch(`/api/video-renders/${job.id}/stage-composed`, {
      method: "POST",
      body: form,
    });
```

Worker:

- Caps capture to **6 fps** (`BROWSER_CAPTURE_FPS_CAP`) regardless of export 24 fps.
- `videoOnly: true` → no browser VO mix; FFmpeg muxes voice later.
- Uses `canvas.captureStream(0)` + `track.requestFrame()` → exactly one recorded
  frame per painted frame, then `MediaRecorder` → WebM.
- Reports `frameCount` to `stage-composed`; FFmpeg re-times by frame index.
  Realtime `captureStream(fps)` remains the fallback when voice is mixed in the
  browser or `requestFrame` is unavailable.

---

### 4.3 Frame paint (`ComposedSceneCaptureHost`, engine id `dom-raster-v11-playback`)

Per frame:

1. Resolve clip + bindings; drive `StoryLivePreview` with `playheadMs` + playback clocks.
2. Rematerialize media to blob URLs.
3. **DOM rasterize** — `domToCanvas` against a context created once per render, so
   fonts and blob assets are embedded once instead of per frame. This is what
   preserves alignment, font metrics, CSS gradients, edge sweep, light sweep and
   3D swivel, since the browser does the painting.
4. Plan-video overlay into `[data-video-mask]` (`<video>` is filtered out of the
   rasterize — cloning it stalled on media load, which caused the old 5s/frame
   timeouts).

The layer blit survives only as a fallback: three consecutive rasterize failures
disable the rasterizer for the rest of the job and log why.

Log lines: `Capture engine: dom-raster-v11-playback (DOM rasterizer + StoryLivePreview clocks)`
and `Frame paint: DOM rasterizer active (full CSS fidelity).`

Capture FPS capped at **6**. Because output timing is frame-indexed, a slow
rasterize makes the render take longer but never changes the result.

---

### 4.4 Stage composed API

`POST /api/video-renders/[renderId]/stage-composed`  
→ writes `%TEMP%/mediaos-render-cache/{renderId}.composed.webm`

Requires Next body limits (already in `next.config.ts`):

```ts
experimental: {
  proxyClientMaxBodySize: "64mb",
  middlewareClientMaxBodySize: "64mb",
  serverActions: { bodySizeLimit: "64mb" },
}
```

**Restart `npm run dev` after config changes.** A 10.9 MB WebM previously returned **500** under ~1 MB default proxy limit.

---

### 4.5 Local FFmpeg finalize

```137:186:src/features/video-render-export/providers/local-ffmpeg-provider.ts
      const composed = await findComposedStage(job.renderId);
      if (composed) {
        // download plan.voiceUrl if present
        await this.encodeComposedWithVoice({
          composedPath: composed.absolutePath,
          voicePath,
          outputPath,
          // ...
        });
        // return MP4 buffer
      }

      // FALLBACK — NOT assembled Motion Scenes:
      // "No composed capture staged — falling back to asset concat"
```

Composed finalize path:

- Input: staged WebM + optional voice file / silence.
- Video: **always `libx264`** (QSV/NVENC skipped — failed on MediaRecorder WebM).
- Scale/pad to plan width×height, mux AAC voice, `+faststart`.

---

### 4.6 Managed result + Local download

`run-managed-render.ts`:

1. Provider returns `outputBuffer`.
2. `cacheRenderOutput` → `{renderId}.mp4` in temp cache.
3. Best-effort Supabase Storage upload; on failure job still **`succeeded`** with error text `Cloud upload skipped: … Use Local file.`
4. Panel registers Local file → `GET /api/video-renders/[id]/local-download`.

---

### 4.7 Env (server-only)

```16:25:src/features/video-render-export/lib/render-env.ts
export function getRenderServerEnv(): RenderServerEnv {
  const raw = process.env.RENDER_PROVIDER?.trim().toLowerCase();
  const provider: RenderProviderId = raw === "cloud" ? "cloud" : "local";
  return {
    RENDER_PROVIDER: provider,
    FFMPEG_PATH: process.env.FFMPEG_PATH?.trim() || "ffmpeg",
    FFPROBE_PATH: process.env.FFPROBE_PATH?.trim() || "ffprobe",
    RENDER_API: process.env.RENDER_API?.trim() || undefined,
  };
}
```

Never `NEXT_PUBLIC_*` for these.

---

## 5. Cloud path (stub)

- UI engine = cloud → **no** browser capture / stage.
- `CloudRenderProvider` POSTs plan to `{RENDER_API}/v1/renders`, polls.
- RenderOS **server is not implemented** in this repo; fails if API unset/unreachable.

---

## 6. Status / progress

| Phase | Typical status | Progress (approx) |
|-------|----------------|-------------------|
| Job created | `queued` | 0 |
| Browser capture | `preparing` | 5–52 |
| Staged / FFmpeg | `rendering` / `encoding` | 54–90 |
| Storage | `uploading` | ~93 |
| Done | `succeeded` | 100 |

Clear queue: **hard delete** jobs (except active), not soft-delete.

---

## 7. Known issues (verification checklist)

| Symptom | Likely cause | Where to look |
|---------|--------------|---------------|
| Logos + empty black Main Video | Plan video not painted / `videoUrl` null / proxy fail | Capture Log: `Plan video ready`, `Clip media:` |
| `Plan video ready` then `not ready to paint` loop | Fixed in v6 (reload on seek); confirm engine id | `ensurePlanVideo` early-return same URL |
| `Failed to stage composed video (500)` | Body size / form empty after proxy truncate | `next.config.ts` 64mb + **restart dev** |
| Output = assets+VO only, no package chrome | Stage missing → FFmpeg **asset concat fallback** | Log: `No composed capture staged` |
| Ticker shows literal “Ticker” | Binding unresolved; overlay uses `bindings.ticker` | Plan + composer `resolved_bindings` |
| Music missing | `musicUrl` always null at create today | `render-job.service` create call |
| Capture slow | 6 fps DOM blit + seek per frame | `browser-render-worker` FPS cap |
| Storage Open fails, Local works | Free-tier size limit; by design | `Cloud upload skipped` |

**Observed bad output** (`render-cc9e7b75.mp4`): correct container (1280×720@24), GNN chrome/logos present, **Main Video black**, lower panel/ticker empty — capture paint incomplete before finalize.

---

## 8. What is NOT the active path

- `lib/compositor.ts` — legacy simple compositor; **unused**.
- `lib/upload-render-output.ts` — unused by panel (server uploads in managed render).
- Full `modern-screenshot` DOM capture — removed (timeouts); replaced by blit + plan paint.

---

## 9. How to verify a healthy Local run

1. Restart `npm run dev` (picks up body-size config).
2. Hard-refresh story page.
3. Engine: **Local FFmpeg**. Clear queue.
4. Export → Log must include:
   - `Capture engine: artboard-blit-v6`
   - `Clip media: video https…` (or image)
   - `Plan video ready W×H` (once per clip, not spam)
   - `Composed WebM ready … — staging…`
   - Staging OK (no 500)
   - `Provider done: Local FFmpeg · codec=…`
   - `Local file ready …`
5. Spot-check frames: Main Video region must show plan media, not solid black.

---

## 11. Render Verification Mode (Module 3.1.1)

Enabled automatically on Local export.

### Checklist logs (Log tab)

Stages emit `✓` / `✗` lines:

- Stage 1 Timeline clips / scene refs / voice  
- Stage 2–4 Main media, headline, subheadline, ticker, logo, advertisement  
- Stage 5 Scene Initialized, Assets Bound, Shape Composer / Behaviours / Motion / Animations Loaded, Video/Audio init, Runtime Ready, Scene/Animation/Behaviour/Shape clocks, Animation Started  
- Stage 6 Capture Started / Animation Completed / Capture Completed + debug frame paths  
- Stage 7 FFmpeg mux/encode only / Export Completed  

Capture engine id: **`dom-raster-v11-playback`**.

Debug frames should look identical to the on-screen Live Preview — correct
alignment and font sizes, readable Malayalam headlines, and visible edge sweep /
light sweep / 3D swivel at the sampled playhead. Seeing
`DOM rasterizer disabled after 3 failures` means frames came from the blit
fallback, which only approximates CSS.

### Debug frames

Saved under:

```text
debug/render/{renderId}/
  frame-001.jpg
  frame-030.jpg
  frame-060.jpg
  frame-120.jpg
  frame-last.jpg
```

API: `POST /api/video-renders/[renderId]/debug-frame`  
Helper: `lib/render-verification.ts`

Compare these JPEGs to Story Live Preview at the same playhead. Folder is gitignored except `debug/render/README.md`.

### Plan enrichment (Stage 3)

Each `RenderPlanClip` now includes (when resolvable at job create):

- `videoUrl` / `imageUrl`  
- `logoUrl` / `advertisementUrl`  
- `headline` / `subheadline` / `tickerText`  

Capture merges these into `StoryLivePreview` bindings the same way the Timeline monitor does.

### FFmpeg contract (Stage 7)

FFmpeg must only receive staged composed WebM + voice. It must **not** compose scenes. Asset-concat remains emergency fallback only when stage is missing.

---

## 10. Related docs

- `docs/story-production/video-render-export.md` — module overview (partially stale vs hybrid).
- `docs/story-production/render-providers.md` — provider env (notes HW encode; composed path forces software H.264).
