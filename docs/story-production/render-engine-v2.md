# MediaOS Module 4.0 — Render Engine V2 (Canvas/WebGL Runtime)

**Branch:** `render-engine-v2-canvas`  
**Package:** `@mediaos/render-engine` → `packages/render-engine/`  
**Status:** Foundation shipped. DOM renderer preserved as Legacy. Canvas is the default backend.

---

## 1. Why V2

Module 3.1 validated the full pipeline with a Browser DOM Rasterizer (`dom-raster-v11-playback`):

```
Timeline → React → DOM → modern-screenshot → MediaRecorder → FFmpeg
```

That path proved Scene JSON, motion libraries, and FFmpeg muxing work end-to-end. It is **not** production-viable: a 94s @ 24fps timeline took ~70 minutes because every frame re-rasterized a live React tree.

Render Engine V2 replaces **only** the rendering backend. Editor modules stay untouched.

---

## 2. Do not modify (production-ready)

| Module | Status |
|--------|--------|
| AI Center / AI Producer / News Intake | unchanged |
| Story Editor / Scene Builder / Scene Library | unchanged |
| Asset Engine / Timeline / Story Preview | unchanged |
| Shape Composer UI / Behaviour Composer UI / Motion Library | unchanged |
| Existing JSON scene + template formats | unchanged |

The Editor still uses React. The renderer does not.

---

## 3. Module map (`packages/render-engine/`)

```
packages/render-engine/
  package.json
  src/
    index.ts
    types.ts                 # RuntimeScene, RuntimeLayer, RawFramePacket…
    backend.ts               # DOM | Canvas provider registry
    scene-runtime.ts         # Load layers, bind assets, update(playheadMs)
    animation-runtime.ts     # Motion/shape sampler injection point
    frame-scheduler.ts       # Deterministic frame loop
    canvas/
      canvas-renderer.ts     # Present one frame (draw order)
      geometry.ts
      video-renderer.ts      # Seek → draw (no browser playback clock)
      image-renderer.ts
      shape-renderer.ts      # Rect/circle/path/gradient/glow/sweeps
      text-renderer.ts       # Headline / ticker / captions
      effects-renderer.ts
    encoder/
      ffmpeg-encoder-interface.ts   # Raw frames in → FFmpeg encodes only
```

### App bridge (does not live in the package)

| File | Role |
|------|------|
| `src/features/video-render-export/lib/scene-to-runtime.ts` | ComposerScene / RenderPlan → RuntimePlan |
| `src/features/video-render-export/services/canvas-capture-session.ts` | Warm-up, media bind, `paintFrame` via Canvas Runtime |
| `src/features/video-render-export/components/canvas-scene-capture-host.tsx` | Thin React ref shell (no StoryLivePreview) |
| `video-render-export-panel.tsx` | Backend switcher: Canvas (default) / DOM (legacy) |

---

## 4. Data flow

```
RenderPlan (immutable snapshot)
        │
        ▼
getComposerSceneAction  ──► ComposerScene JSON (same as Story Preview)
        │
        ▼
scene-to-runtime.ts     ──► RuntimePlan + RuntimeScene[]
        │
        ▼
SceneRuntime.update(playheadMs)
        │  injects sampleLayerMotion / sampleShapeBehaviors / sampleShapeReveal
        │  (SAME math as StoryLivePreview — no second animation engine)
        ▼
FrameState (layers + sampled motion + shape behaviour)
        │
        ▼
CanvasRenderer.present(state)
        │  Clear → BG → Video → Images → Shapes → Text → Logo → Ad
        │       → Lower Third → Ticker → Effects
        ▼
HTMLCanvasElement / RawFramePacket (RGBA)
        │
        ▼
Interim: canvas.captureStream + MediaRecorder (staging WebM)
Target:  FFmpeg rawvideo stdin  (encode only; no Browser Capture)
        │
        ▼
Local FFmpeg Provider  ──► mux voice/music → MP4
```

---

## 5. Rendering pipeline (per Timeline frame)

```
playheadMs
   ↓
Update Scene Runtime
   ↓
Update Animation Runtime (motion + shape samplers)
   ↓
Seek video to playhead-derived time (await seeked)
   ↓
Draw Canvas layers in compositor order
   ↓
Present / export RawFramePacket
```

**Clock rule:** Timeline Playhead is the only source of truth. Animation state must not use `Date.now()`, `setInterval()`, `setTimeout()`, or browser playback speed.

---

## 6. Render Provider interface

Two orthogonal choices:

| Axis | Options | Meaning |
|------|---------|---------|
| **Backend** | `canvas` (default), `dom` (legacy) | How frames are painted |
| **Encoder** | `local` FFmpeg, `cloud` RenderOS | Where the file is encoded |

The DOM renderer is **not deleted**. Users can switch in the Export panel. Preference is stored in `localStorage` (`mediaos.renderBackend`).

---

## 7. Behaviour & Shape compatibility

V2 does **not** reimplement motion math. The canvas capture session injects:

- `sampleLayerMotion` — entrance / idle / exit
- `sampleShapeBehaviors` — light sweep, edge sweep, draw-on, …
- `sampleShapeReveal` — reveal phases

Those libraries remain owned by Scene Composer. Canvas applies their sampled transforms as Canvas2D state instead of React CSS.

---

## 8. Performance comparison (targets)

| Path | 94s @ 24fps / 720p (observed or target) |
|------|------------------------------------------|
| DOM raster v11 | ~70 minutes (measured) |
| Canvas Runtime V2 | **Realtime or faster** (target) |
| Canvas 1080p | **2×–4× realtime** (target) |

Root cause of DOM cost: `domToCanvas` / layout + CSS + font + media per frame (~1.5–5s).  
Canvas V2 cost: seek video + drawImage / path fill (~tens of ms when media is blob-cached).

---

## 9. Migration path

### Phase A — Foundation (this branch)

1. Ship `@mediaos/render-engine` package.
2. Keep DOM host intact.
3. Default Export UI to Canvas backend.
4. Reuse existing browser worker + Local FFmpeg staging (WebM → mux).

### Phase B — Fidelity parity

1. Expand shape kinds + template region heuristics.
2. Side-by-side Frame Debug: Canvas vs DOM PNGs for the same `playheadMs`.
3. Polish ticker marquee, 3D swivel projection, masks.

### Phase C — Raw frame encode

1. Implement `FfmpegEncoderInterface.encodeFromRawFrames`.
2. Pipe RGBA → `ffmpeg -f rawvideo -pix_fmt rgba …`.
3. Remove MediaRecorder from the hot path entirely.

### Phase D — Optional WebGL

1. Move effects (glow, blur, sweeps) to GPU shaders behind the same Scene Runtime.
2. Keep Canvas2D as fallback.

---

## 10. Success criteria checklist

| Criterion | Status |
|-----------|--------|
| Same Scene JSON as Story Preview | ✅ via adapter |
| Editor modules unchanged | ✅ |
| DOM renderer retained | ✅ |
| Canvas default backend | ✅ |
| Timeline playhead-only clock | ✅ FrameScheduler + samplers |
| Shared motion libraries | ✅ injected samplers |
| FFmpeg encode-only (raw pipe) | 🔲 Phase C |
| Realtime 720p | 🔲 validate on short test render |
| Visual parity with Story Preview | 🔲 iterate with Frame Debug |

---

## 11. How to try it

1. Checkout `render-engine-v2-canvas`.
2. Restart `npm run dev`.
3. Export panel → **Canvas Renderer (V2)** (default).
4. Optionally enable **Test render — shortest scene only** + **Frame Debug**.
5. Compare against **DOM Renderer (Legacy)** if fidelity questions arise.

---

## 12. Related docs

- `docs/story-production/render-pipeline-verification.md` — Module 3.1 DOM path
- `packages/render-engine/src/backend.ts` — backend registry
- `src/features/video-render-export/services/canvas-capture-session.ts` — app bridge
