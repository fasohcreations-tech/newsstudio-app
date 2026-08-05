# MediaOS Module 4.0 — Render Engine V2 (Canvas/WebGL Runtime)

**Audience:** Development Head / architecture review  
**Branch:** `render-engine-v2-canvas` (working title)  
**Package:** `@mediaos/render-engine` → `packages/render-engine/`  
**Date:** 2026-08-05  
**Status:** Foundation + parity iteration in progress. DOM renderer retained as Legacy. Canvas is the default export backend.

---

## 1. Executive summary

MediaOS already had a working **proof-of-concept** video export path (Module 3.1):

```
Timeline → React (StoryLivePreview) → DOM → modern-screenshot → MediaRecorder → FFmpeg
```

That path proved that Scene JSON, Shape Composer, Behaviour Engine, Motion Library, voice mux, and Local FFmpeg encoding work end-to-end. It is **not** production-viable: a ~94-second timeline at 24 fps took on the order of **~70 minutes** because every frame re-rasterized a live React/DOM tree (layout + CSS + fonts + media, often 1.5–5 seconds per frame).

**Module 4.0 replaces only the rendering backend.** Everything else stays:

| Keep unchanged | Replaced |
|----------------|----------|
| AI Center, Story Editor, Scene Builder, Timeline | DOM → screenshot capture |
| Story Preview (editor experience) | |
| Shape / Behaviour / Motion libraries (math) | |
| Scene JSON + template formats | |
| Timeline Assembly + Local FFmpeg mux | |

The new path:

```
Timeline → Scene Runtime → Canvas2D draw → staged frames → FFmpeg encode / mux
```

**Design rule:** one animation runtime. Canvas does not invent a second motion engine. It injects the same samplers Story Preview uses (`sampleLayerMotion`, `sampleShapeBehaviors`, `sampleShapeReveal`, broadcast light/edge sweeps) and applies the sampled transforms as Canvas2D state instead of CSS.

---

## 2. Problem Module 3.1 left us with

| Observation | Cause |
|-------------|--------|
| Export works (MP4, voice, correct duration after fixes) | Pipeline contracts are sound |
| Animations looked frozen or wrong | Some subsystems used wall-clock time; later fixed to `playheadMs` |
| Capture at 6 fps then “stretch” | Unacceptable for broadcast; fixed to exact Timeline fps |
| ~70 min for ~94 s | DOM raster cost per frame |
| Visual fidelity high when DOM path worked | CSS / React is the source of truth for look |

Conclusion: keep Module 3.1 as **Legacy / reference**, build V2 for **speed**, close the **visual parity** gap by sharing animation math and carefully adapting scene → canvas.

---

## 3. What must not change

| Module | Constraint |
|--------|------------|
| AI Center / AI Producer / News Intake | No changes for render |
| Story Editor / Scene Builder / Scene Library | No changes for render |
| Asset Engine / Timeline / Story Preview UI | Editor stays React |
| Shape Composer UI / Behaviour Composer UI / Motion Library | Same JSON + same sample functions |
| Scene JSON / template format | Same documents; adapter only |
| FFmpeg role (today) | Encode + mux; future: raw-frame pipe only |

The Editor still uses React. The export renderer must not depend on React paint for each frame.

---

## 4. Architecture overview

### 4.1 Two render providers

| Backend | Engine id | Mechanism | Role |
|---------|-----------|-----------|------|
| **Canvas (V2)** — default | `canvas-runtime-v2` | Scene Runtime → Canvas2D | Production path |
| **DOM (Legacy)** | `dom-raster-v11-playback` | StoryLivePreview → screenshot | Proof / fidelity reference |

Encoder axis is orthogonal: Local FFmpeg vs Cloud (unchanged).

Preference: Export panel toggle; stored in `localStorage` key `mediaos.renderBackend`.

### 4.2 Package layout

```
packages/render-engine/
  package.json                    # @mediaos/render-engine
  src/
    index.ts                      # Public exports
    types.ts                      # RuntimePlan, RuntimeLayer, RawFramePacket, sweeps…
    backend.ts                    # "dom" | "canvas" registry
    scene-runtime.ts              # Load plan, bind media, update(playheadMs)
    animation-runtime.ts          # Sampler injection (MediaOS or built-in)
    frame-scheduler.ts            # Deterministic frame loop (playhead-only)
    canvas/
      canvas-renderer.ts          # Compositor: clear → draw buckets → present
      geometry.ts                 # Cover/contain, transforms, round rects
      video-renderer.ts           # Timeline seek → drawImage(video)
      image-renderer.ts           # Images, logos, optional-info playlists
      shape-renderer.ts           # Shape Composer → Canvas paths/fills
      text-renderer.ts            # Headline / ticker / captions
      effects-renderer.ts         # Glow / soft shadow / highlight
      sweep-renderer.ts           # Light Sweep + Edge Sweep overlays
    encoder/
      ffmpeg-encoder-interface.ts # Contract for raw frames → FFmpeg
```

Path alias (tsconfig): `@mediaos/render-engine` → `packages/render-engine/src/index.ts`.

### 4.3 App bridge (lives in the Next app, not the package)

| File | Role |
|------|------|
| `src/features/video-render-export/lib/scene-to-runtime.ts` | ComposerScene + RenderPlan → RuntimePlan; GNN-001 parity patches |
| `src/features/video-render-export/services/canvas-capture-session.ts` | Warm-up, media bind, library-ref resolve, `paintFrame` |
| `src/features/video-render-export/components/canvas-scene-capture-host.tsx` | Thin React shell exposing the session via ref (no StoryLivePreview) |
| `src/features/story-production/lib/resolve-story-binding-refs.ts` | Imperative twin of `useResolvedStoryBindings` for Canvas warm-up |
| `video-render-export-panel.tsx` | Backend switcher + job UI |

The package stays free of Next/Supabase/React scene types. The adapter owns MediaOS-specific templates (GNN-001 lower panel, left rail, sweep demos).

---

## 5. Data flow (end-to-end)

```
Export UI
   │
   ▼
createVideoRenderAction → RenderPlan (immutable: clips, urls, fps, size)
   │
   ▼
CanvasSceneCaptureHost.warmUp(plan)
   │
   ├─ getComposerSceneAction(sceneId)     same Scene JSON as Story Preview
   ├─ extendComposerSceneForDuration
   ├─ patchComposerSceneForPreview         GNN-001 lower panel / left rail / sweeps
   ├─ bindingsForClip(scene, clip)         plan media + scene resolved_bindings
   ├─ resolveStoryBindingRefs(...)         library:// + clip:// → signed URLs
   ├─ buildRuntimePlan(...)                RuntimeScene layers
   ├─ SceneRuntime + CanvasRenderer
   └─ preload media (videos, images, playlist slides)
   │
   ▼
Browser worker loop (existing): for each Timeline frame
   playheadMs
      → SceneRuntime.update(playheadMs)     motion + shape + sweeps
      → CanvasRenderer.present(state)       draw
      → requestFrame / stage WebM           interim staging
   │
   ▼
Local FFmpeg: re-time (setpts) + mux voice/music → MP4
```

**Clock rule:** `playheadMs` is the only clock. No `Date.now()`, `setInterval`, browser `video.play()` speed, or wall-clock RAF for animation progress during export.

---

## 6. Core modules (responsibilities)

### 6.1 Scene Runtime

- Loads a `RuntimePlan` (adapted Scene JSON).
- Holds media element map (`HTMLVideoElement` / `HTMLImageElement`).
- Each `update(playheadMs)`:
  - Resolves active clip / scene.
  - Builds per-layer `FrameState` (transform, opacity, shape sample, sweeps).
  - Calls injected samplers (MediaOS libraries).

### 6.2 Animation Runtime

- Injection point for motion + shape samplers.
- Production path uses MediaOS functions (same as StoryLivePreview).
- Built-in fallbacks exist for package unit testing without the full app.

### 6.3 Canvas Renderer

Draw order (kind buckets, then `sortOrder` within bucket):

1. Background  
2. Video  
3. Image (incl. optional-info)  
4. Shape (incl. lower-third chrome / frames)  
5. Text  
6. Logo / Advertisement  
7. Lower third text / Ticker  
8. Effects  
9. Per-layer Light Sweep / Edge Sweep overlays  

Critical parity rule: chrome (white lower-third bar) must be classified as **shape**, not **unknown**. The `unknown` bucket paints last and previously covered the headline.

### 6.4 Video Renderer

- Seeks video to Timeline-derived time (`trimIn + scenePlayhead`).
- Waits for seek readiness; draws with cover/contain.
- Does not rely on continuous browser playback.

### 6.5 Image / Text / Shape / Effects / Sweeps

| Renderer | Notes |
|----------|--------|
| Image | Logos, ads, optional-info playlists (slide index from `playheadMs`) |
| Text | Malayalam stacks, ticker bar, lower-panel black-on-white |
| Shape | Rect / circle / gradient / stroke / reveal visibility |
| Effects | Glow, soft shadow, highlight |
| Sweeps | Light Sweep (broadcast effect) + Edge Sweep (behaviour); blend modes mapped to Canvas composites |

### 6.6 Frame Scheduler

- Advances `playheadMs` by `1000 / fps` per frame.
- Orchestrates update → present → export packet.
- Guarantees one paint per Timeline frame (no 6 fps subsample).

### 6.7 FFmpeg Encoder Interface

- Contract: raw frame packets in → encode only.
- **Current interim:** Canvas `captureStream` + MediaRecorder WebM staging into the existing Local FFmpeg path (same worker as DOM).
- **Target Phase C:** pipe RGBA / PNG sequence into `ffmpeg -f rawvideo` (or frame folder) and drop MediaRecorder from the hot path.

---

## 7. Adapter: Scene JSON → Runtime (parity critical)

`scene-to-runtime.ts` is where most fidelity work lives. Story Preview applies runtime patches and binding resolution that the raw ComposerScene does not contain on disk.

### Applied before draw (same as StoryLivePreview for GNN-001)

1. `patchGnn001LowerPanelObjects` — white panel, black headline text  
2. `patchGnn001LeftRailObjects` — logo / optional-info layout  
3. `patchGnn001EdgeSweepDemos` — edge sweep on video + lower panel when missing  
4. `patchGnn001LightSweepDemos` — light sweep on headline (covers lower panel)

### Binding resolution

Story fields often store **`library://{assetId}`** and **`clip://{clipId}`**, not HTTP URLs.

| Path | Resolver |
|------|----------|
| DOM Legacy | `useResolvedStoryBindings` (React hook) |
| Canvas V2 | `resolveStoryBindingRefs` during warm-up (imperative twin) |

Without this step, logo and optional-info panels appear empty or fall back to `/demo/gnn/logo.svg`.

### Region / kind heuristics

- Main video container vs skeleton/frame chrome (hide double-draw / ghosting).  
- Optional-info regions classified as **image** even when authored as skeletons.  
- Lower-info **frame** objects synthesize a white rectangle from `content.solid_fill`.  
- Rim-only shape kinds (`video_frame`, masks) do not paint solid fills over media.

---

## 8. Performance

| Path | ~94 s @ 24 fps / 720p |
|------|------------------------|
| DOM raster v11 | ~70 minutes (measured) |
| Canvas V2 | Dramatically faster (observed: seconds–minutes class vs hour class); target **realtime or better** at 720p |
| Canvas 1080p | Target **2×–4× realtime** |

Cost shift: from “layout + CSS + screenshot” to “seek + Canvas draw” with media blob/proxy cached once at warm-up.

---

## 9. Migration path

| Phase | Scope | Status |
|-------|--------|--------|
| **A — Foundation** | Package, Scene/Animation Runtime, Canvas draw, backend switch, keep DOM | ✅ Shipped |
| **B — Fidelity parity** | Bindings, GNN chrome, sweeps, text, left-rail assets, Frame Debug iteration | 🔄 In progress |
| **C — Raw frame encode** | RGBA/PNG → FFmpeg only; remove MediaRecorder staging | 🔲 Next |
| **D — Optional WebGL** | GPU effects behind same Scene Runtime; Canvas2D fallback | 🔲 Later |

---

## 10. Known parity gaps (honest status)

These are the items currently under visual QA against Story Preview / Frame Debug:

| Item | Notes |
|------|--------|
| Logo / optional-info assets | Fixed by library-ref resolve + stop demo logo override; verify on next Scene 1 render |
| Lower-third white bar vs headline overpaint | Fixed by routing frame chrome into `shape` bucket + `sortOrder` |
| Light Sweep on white panel | Demo uses `#FFFFFF` + `screen` — mathematically weak on white; may need Composer colour/blend for broadcast visibility |
| Edge Sweep on lower panel | Blend mode must respect config (`normal` vs `lighter`); verify rim travel on white chrome |
| 3D swivel / complex CSS transforms | Canvas projects 2D transforms from samplers; full CSS 3D parity may be incomplete |
| Ticker marquee polish | Text paints; continuous scroll timing may still need polish |
| Raw-frame FFmpeg pipe | Still interim WebM staging |

Validation workflow: Export → **Test render — Scene 1 only** + Frame Debug → compare `debug/render/<jobId>/frame-*.jpg` to Story Preview.

---

## 11. Success criteria

| Criterion | Status |
|-----------|--------|
| Same Scene JSON as Story Preview | ✅ via adapter |
| Editor modules unchanged | ✅ |
| DOM renderer retained + switchable | ✅ |
| Canvas default | ✅ |
| Playhead-only clock | ✅ |
| Shared motion / shape / behaviour math | ✅ injected samplers |
| Dramatic speed vs DOM | ✅ observed |
| Visual parity with Story Preview | 🔄 closing; not signed off |
| FFmpeg encode-only (no MediaRecorder) | 🔲 Phase C |

---

## 12. How to operate / verify

1. Restart `npm run dev` after pulling the branch.  
2. Story → Timeline → Export panel.  
3. Backend: **Canvas Renderer (V2)** (default). Keep **DOM** available for side-by-side.  
4. Enable **Test render — Scene 1 only** for fast iteration.  
5. Enable Frame Debug; inspect `debug/render/<jobId>/`.  
6. Warm-up log should show logo / optional-info / light+edge sweep counts.  
7. Compare frames to Story Preview at the same playhead.

Related: `docs/story-production/render-pipeline-verification.md` (Module 3.1 DOM path + troubleshooting table including Canvas V2 issues).

---

## 13. Guidance for the Development Head

**Strategic intent:** Ship broadcast-speed export without rewriting MediaOS. The Scene document and animation libraries remain the single source of truth; Canvas is a new *presenter*.

**Do not:**

- Fork Shape / Behaviour / Motion into a second math library.  
- Delete the DOM renderer until Canvas parity is signed off.  
- Couple `@mediaos/render-engine` to Next.js or Supabase (keep adapters in the app).

**Do:**

- Treat Frame Debug + Scene 1 test renders as the QA loop.  
- Put template-specific knowledge (GNN-001) in the adapter, not the core package.  
- Move to raw-frame FFmpeg (Phase C) once visual parity is acceptable.  
- Consider WebGL only for effects that Canvas2D cannot do at speed (Phase D).

**Ownership split:**

| Layer | Owner concern |
|-------|----------------|
| `packages/render-engine` | Generic runtime, canvas draw, scheduler, encoder contract |
| `video-render-export` + story-production libs | MediaOS scene adapter, bindings, capture session, UI |
| Scene Composer libs | Animation math (shared by Preview and Canvas) |

---

## 14. One-page diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Editor (unchanged)                                          │
│  Story → Scene Builder → Timeline → StoryLivePreview        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Scene JSON + bindings
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Export                                                      │
│  RenderPlan ──┬── DOM Legacy ── StoryLivePreview ── screenshot
│               └── Canvas V2 ── SceneRuntime ── Canvas2D
└──────────────────────────────┬──────────────────────────────┘
                               │ staged frames + voice
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Local FFmpeg (encode + mux) → MP4                           │
└─────────────────────────────────────────────────────────────┘
```
