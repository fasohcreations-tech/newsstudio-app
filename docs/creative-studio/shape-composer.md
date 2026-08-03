# Module 4.4 — Shape Composer

Procedural broadcast Shape Composer inside Scene Composer. Users create, edit, animate, and reuse shapes without external software.

Does **not** redesign Scene Composer. Adds a **Shape** inspector tab beside Object · Animation · Effects · Behaviors · Story.

## Architecture

```
src/features/scene-composer/lib/shape-composer/
  types.ts       – ShapeKind, ShapeComposerConfig, library, tools
  defaults.ts    – default config + path points
  geometry.ts    – SVG path builders (rect, star, ribbon, bubble, …)
  path-editor.ts – move / add / delete / smooth / corner / mirror
  apply.ts       – read/write metadata.shape + style sync
  tools.ts       – create, duplicate, align, distribute, boolean mark, snap
  library.ts     – reusable broadcast components
  presets.ts     – border / corner / material / accent / panel presets
  behaviors.ts   – sample draw_on / panel_grow / light_sweep / …
  index.ts

src/features/scene-composer/components/editor/
  layer-shape-panel.tsx  – Shape inspector tab UI
  shape-renderer.tsx     – live SVG renderer + path point drag + behavior clock
```


## Shape data model

Stored on the object:

```json
{
  "metadata": {
    "shape": {
      "version": 1,
      "enabled": true,
      "kind": "rounded_rectangle",
      "cornerRadii": { "topLeft": 12, "topRight": 12, "bottomRight": 12, "bottomLeft": 12 },
      "fillMode": "solid",
      "fill": "#FFFFFF",
      "strokeWidth": 2,
      "strokeColor": "#94A3B8",
      "gradient": { "type": "linear", "angle": 180, "stops": [] },
      "glass": { "enabled": false, "blur": 10, "opacity": 0.55, "…" : "…" },
      "path": { "closed": true, "points": [] },
      "behaviors": [],
      "material": "standard"
    }
  }
}
```

The Shape tab **Enable** switch writes `metadata.shape.enabled`. Live preview uses `ShapeRenderer` only while enabled.

Visual fields also sync into `object.style` (`fill`, `corner_radius`, stroke) and `object.transform` (`opacity`, `rotation`) for compatibility with existing preview/canvas.

## Supported shapes

Rectangle, Rounded Rectangle, Circle, Ellipse, Line, Arrow, Triangle, Polygon, Star, Ribbon, Speech Bubble, SVG Path, Custom Path, Image Mask, Video Mask, Glass Panel, Gradient Panel, Border Frame, Corner Accent, Divider Line, Ticker Bar, Headline Bar, Reporter Card, Video Frame.

## Shape tools

Create · Duplicate · Delete · Convert · Combine/Split/Merge (boolean markers) · Align · Distribute · Snap · Lock · Hide.

## Shape library categories

Video Frames · Reporter Cards · Lower Third Panels · Headline Panels · Tickers · Background Panels · Corner Accents · Broadcast Frames · Divider Lines · Information Boxes · Buttons · Icons · Live Badges · Breaking News Bars.

## Path editor

Normalized path points (0–1) with Bezier handles:

- Move / Add / Delete points
- Smooth · Corner · Mirror Handles
- Live drag in preview via `ShapeRenderer` control points (SVG / Custom Path)

## Inspector (Shape tab)

Sections: General · Geometry · Fill · Border · Gradient · Glass · Corners · Path · Library · Presets.

Existing tabs are unchanged.

## Live preview

`story-live-preview` uses `ShapeRenderer` when Shape Composer is enabled. Overlay layers (video, text, skeleton regions) keep content; shape draws underneath. Pure shape objects are replaced by `ShapeRenderer`.

## Behaviors

Stored on `metadata.shape.behaviors`. `ShapeRenderer` samples them every frame (RAF in edit mode, playhead while playing):

- Stroke: draw_on, border_build, outline_sweep, trace, edge_sweep
- Transform / clip: panel_grow, ribbon_expand, corner_build, morph, split, merge
- Wash: light_sweep
- Multi-clone: **travel_across** (convoy enters one edge → exits the other), **shape_cascade** (staggered wave)
  - Controls: direction, count, size %, lane spread
  - Host shape is hidden while clones run; loops by default

Shape → General lists active behaviors (enable / remove) and **Preview behaviors** replays one-shots.

## Reveal original layer

`metadata.shape.reveal` drives: **shape entrance → hold → exit → original layer**.

- Original layer content and fill stay **hidden until phase `revealed`** (not during exit)
- Shape Color / Border Color control the intro shape
- Layer Color (`object.style.fill`) is what remains after exit
- Exit is a **Reveal Exit** behavior with separate style (fade / scale_out / wipe / slide / reverse) and direction (up / down / left / right / center)
- Legacy exit styles (`wipe_up`, `wipe_down`, `slide_left`) still load and map to style + direction
- Document load seeds Shape Composer onto every layer missing config
- **All layers** switch enables or disables Shape Composer on every layer

## Anchor & placement

- **Anchor preset / Anchor X·Y %** — transform origin for grow / scale (any point in the shape)
- **Pos X·Y % / Size W·H %** — place the shape anywhere inside the layer box
